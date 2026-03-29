import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, startWith, switchMap, tap } from 'rxjs';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Paciente360Service } from '../../../paciente-360/services/paciente-360.service';
import { Paciente } from '../../../pacientes/models/paciente.models';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import { CajaDiariaService } from '../../services/caja-diaria.service';
import { CobroPacienteService } from '../../services/cobro-paciente.service';
import { LiquidacionSesionService } from '../../services/liquidacion-sesion.service';
import {
  CajaDiaria,
  LiquidacionSesion,
  MEDIO_PAGO_LABELS,
  MedioPago,
} from '../../models/caja.models';

interface PacienteOption {
  id: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string;
}

interface SesionPendienteOption {
  sesionId: string;
  descripcion: string;
  fecha: string;
  importeSugerido: number;
}

interface DeltaState {
  ok: boolean;
  mensaje: string;
  diferencia: number;
}

const MEDIOS_REGISTRO: MedioPago[] = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
  'QR',
];

function toAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function moneyValidator(min = 0): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') return null;
    const normalized = typeof raw === 'string' ? raw.replace(',', '.').trim() : String(raw);
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return { moneyFormat: true };
    }
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < min) {
      return { moneyMin: { min } };
    }
    return null;
  };
}

function sumMatchesTotal(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control as FormGroup;
    const total = toAmount(group.get('importeTotal')?.value);
    const detalles = group.get('detalles') as FormArray | null;
    if (!detalles || detalles.length === 0) return { sinDetalles: true };
    const suma = detalles.controls.reduce((acc, item) => acc + toAmount(item.get('importe')?.value), 0);
    const diff = +(total - suma).toFixed(2);
    return Math.abs(diff) > 0.001 ? { sumaMismatch: { total, suma } } : null;
  };
}

@Component({
  selector: 'app-cobro-paciente-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cobro-paciente-page.html',
  styleUrl: './cobro-paciente-page.scss',
})
export class CobroPacientePage implements OnInit {
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly cajaSvc = inject(CajaDiariaService);
  private readonly cobroSvc = inject(CobroPacienteService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly paciente360Svc = inject(Paciente360Service);
  private readonly liquidacionSvc = inject(LiquidacionSesionService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly consultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly consultorioNombre = computed(() => this.consultorioCtx.selectedConsultorio()?.name ?? 'Consultorio activo');

  readonly cajas = signal<CajaDiaria[]>([]);
  readonly cajaAbierta = signal<CajaDiaria | null>(null);
  readonly loadingCaja = signal(true);

  readonly pacienteQuery = new FormControl<string>('', { nonNullable: true });
  readonly pacientesBuscados = signal<PacienteOption[]>([]);
  readonly buscandoPacientes = signal(false);
  readonly mostrarDropdownPacientes = signal(false);
  readonly pacienteSeleccionado = signal<PacienteOption | null>(null);
  readonly deudaPaciente = signal<number>(0);

  readonly sesionesPendientes = signal<SesionPendienteOption[]>([]);
  readonly cargandoSesiones = signal(false);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);

  readonly mediosPago = MEDIOS_REGISTRO.map((value) => ({ value, label: MEDIO_PAGO_LABELS[value] }));

  readonly form = new FormGroup(
    {
      cajaDiariaId: new FormControl<string>('', Validators.required),
      pacienteId: new FormControl<string>('', Validators.required),
      sesionId: new FormControl<string>(''),
      importeTotal: new FormControl<number>(0, [Validators.required, moneyValidator(0.01)]),
      observaciones: new FormControl<string>('', [Validators.maxLength(500)]),
      detalles: new FormArray<FormGroup>([], Validators.minLength(1)),
    },
    { validators: sumMatchesTotal() },
  );

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())));
  private readonly formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)));

  get detallesArray(): FormArray<FormGroup> {
    return this.form.controls.detalles;
  }

  readonly sumaDetalles = computed(() => {
    const value = this.formValue() ?? this.form.getRawValue();
    const detalles = value.detalles ?? [];
    return detalles.reduce((acc, d) => acc + toAmount(d?.importe), 0);
  });

  readonly sumaDiff = computed(() => {
    const total = toAmount(this.formValue()?.importeTotal);
    return +(total - this.sumaDetalles()).toFixed(2);
  });

  readonly deltaState = computed<DeltaState>(() => {
    if (!this.pacienteSeleccionado()) {
      return { ok: false, mensaje: 'Seleccioná un paciente', diferencia: 0 };
    }

    const total = toAmount(this.formValue()?.importeTotal);
    if (total <= 0) {
      return { ok: false, mensaje: 'Ingresá un importe', diferencia: 0 };
    }

    const diff = this.sumaDiff();
    if (Math.abs(diff) <= 0.001) {
      return { ok: true, mensaje: 'Suma correcta', diferencia: 0 };
    }

    if (diff > 0) {
      return { ok: false, mensaje: `Faltan $ ${diff.toFixed(2)}`, diferencia: diff };
    }

    return { ok: false, mensaje: `Sobran $ ${Math.abs(diff).toFixed(2)}`, diferencia: diff };
  });

  readonly mediosUtilizadosTexto = computed(() => {
    const detalles = this.formValue()?.detalles ?? [];
    return detalles
      .filter((d) => toAmount(d?.importe) > 0)
      .map((d) => `${this.medioPagoLabel(String(d?.medioPago ?? ''))} $${toAmount(d?.importe).toFixed(2)}`)
      .join(' · ');
  });

  readonly sesionSeleccionadaLabel = computed(() => {
    const sesionId = this.formValue()?.sesionId ?? '';
    if (!sesionId) return '—';
    const option = this.sesionesPendientes().find((s) => s.sesionId === sesionId);
    return option?.descripcion ?? '—';
  });

  readonly canSubmit = computed(() => {
    return (
      this.formStatus() === 'VALID' &&
      this.deltaState().ok &&
      !this.submitting() &&
      !!this.pacienteSeleccionado() &&
      toAmount(this.formValue()?.importeTotal) > 0
    );
  });

  ngOnInit(): void {
    this.cargarCaja();
    this.agregarDetalle();
    this.vincularBusquedaPaciente();

    const pacienteIdParam = this.route.snapshot.queryParamMap.get('pacienteId');
    if (pacienteIdParam) {
      this.preseleccionarPaciente(
        pacienteIdParam,
        this.route.snapshot.queryParamMap.get('sesionId') ?? undefined,
      );
    }
  }

  private vincularBusquedaPaciente(): void {
    this.pacienteQuery.valueChanges
      .pipe(
        map((v) => v.trim()),
        debounceTime(250),
        distinctUntilChanged(),
        tap((q) => {
          if (q.length === 0) {
            this.pacientesBuscados.set([]);
            this.mostrarDropdownPacientes.set(false);
          }
        }),
        switchMap((query) => this.buscarPacientes(query)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.pacientesBuscados.set(items);
        this.mostrarDropdownPacientes.set(items.length > 0);
      });
  }

  private buscarPacientes(query: string) {
    const consultorioId = this.consultorioId();
    if (!consultorioId || query.length < 1) {
      return of([] as PacienteOption[]);
    }

    this.buscandoPacientes.set(true);
    const digitsOnly = query.replace(/\D/g, '');
    const looksLikeDni = digitsOnly.length >= 7 && digitsOnly.length <= 10;
    const dniParam = looksLikeDni ? digitsOnly : undefined;
    const qParam = looksLikeDni ? undefined : query;

    return this.pacienteSvc.search(consultorioId, dniParam, qParam).pipe(
      switchMap((items) => {
        const activos = items.filter((item) => item.linkedToConsultorio && item.activo);
        if (activos.length > 0 || !looksLikeDni) {
          return of(activos.slice(0, 5));
        }

        // Fallback: backend search por DNI es exacto; para ingreso parcial se filtra localmente.
        return this.pacienteSvc.list(consultorioId).pipe(
          map((list) =>
            list
              .filter((item) => item.linkedToConsultorio && item.activo)
              .filter((item) => item.dni.replace(/\D/g, '').includes(digitsOnly))
              .slice(0, 5),
          ),
          catchError(() => of([])),
        );
      }),
      switchMap((items) => {
        if (items.length === 0) {
          return of([] as PacienteOption[]);
        }

        return forkJoin(
          items.map((item) =>
            this.pacienteSvc.getById(item.id, consultorioId).pipe(
              map((full) => this.mapPacienteOption(item.id, full)),
              catchError(() =>
                of({
                  id: item.id,
                  nombreCompleto: `${item.apellido}, ${item.nombre}`,
                  nombre: item.nombre,
                  apellido: item.apellido,
                  dni: item.dni,
                  obraSocial: 'Sin cobertura',
                } as PacienteOption),
              ),
            ),
          ),
        );
      }),
      catchError(() => of([] as PacienteOption[])),
      tap(() => this.buscandoPacientes.set(false)),
    );
  }

  private mapPacienteOption(id: string, patient: Paciente): PacienteOption {
    const obraSocial = patient.obraSocialNombre
      ? [patient.obraSocialNombre, patient.obraSocialPlan].filter(Boolean).join(' · ')
      : 'Sin cobertura';
    return {
      id,
      nombre: patient.nombre,
      apellido: patient.apellido,
      nombreCompleto: `${patient.apellido}, ${patient.nombre}`,
      dni: patient.dni,
      obraSocial,
    };
  }

  seleccionarPaciente(option: PacienteOption): void {
    this.pacienteSeleccionado.set(option);
    this.form.controls.pacienteId.setValue(option.id);
    this.form.controls.sesionId.setValue('');
    this.form.controls.importeTotal.setValue(0);
    this.deudaPaciente.set(0);
    this.sesionesPendientes.set([]);
    this.submitError.set(null);

    this.mostrarDropdownPacientes.set(false);
    this.pacientesBuscados.set([]);
    this.pacienteQuery.setValue(option.nombreCompleto, { emitEvent: false });

    this.cargarContextoPaciente(option.id);
  }

  limpiarPaciente(): void {
    this.pacienteSeleccionado.set(null);
    this.form.controls.pacienteId.setValue('');
    this.form.controls.sesionId.setValue('');
    this.form.controls.importeTotal.setValue(0);
    this.deudaPaciente.set(0);
    this.sesionesPendientes.set([]);
    this.pacienteQuery.setValue('', { emitEvent: false });
    this.submitError.set(null);
  }

  onPacienteFocus(): void {
    this.mostrarDropdownPacientes.set(this.pacientesBuscados().length > 0);
  }

  onPacienteBlur(): void {
    setTimeout(() => this.mostrarDropdownPacientes.set(false), 120);
  }

  private cargarContextoPaciente(pacienteId: string): void {
    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    this.cargandoSesiones.set(true);

    this.liquidacionSvc.byPaciente(consultorioId, pacienteId).pipe(
      catchError(() => of([] as LiquidacionSesion[])),
    ).subscribe((liquidaciones) => {
      const cobrables = liquidaciones.filter(
        (l) => (l.estado === 'LIQUIDADA_PARTICULAR' || l.estado === 'LIQUIDADA_MIXTA') && l.importePaciente > 0,
      );

      const deuda = cobrables.reduce((acc, l) => acc + toAmount(l.importePaciente), 0);
      this.deudaPaciente.set(deuda);

      const sesiones = cobrables
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((l) => this.mapSesionPendiente(l));

      this.sesionesPendientes.set(sesiones);
      this.cargandoSesiones.set(false);
    });
  }

  private preseleccionarPaciente(pacienteId: string, sesionIdParam?: string): void {
    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    this.pacienteSvc.getById(pacienteId, consultorioId).pipe(
      catchError(() => of(null)),
    ).subscribe((patient) => {
      if (!patient) return;
      const option = this.mapPacienteOption(pacienteId, patient);
      this.pacienteQuery.setValue(option.nombreCompleto, { emitEvent: false });
      this.seleccionarPaciente(option);

      if (sesionIdParam) {
        // Pre-seleccionar sesión después de que carguen las liquidaciones
        const waitForSesiones = setInterval(() => {
          if (!this.cargandoSesiones()) {
            clearInterval(waitForSesiones);
            this.onSesionSeleccionada(sesionIdParam);
          }
        }, 80);
      }
    });
  }

  private mapSesionPendiente(l: LiquidacionSesion): SesionPendienteOption {
    const tipo = l.tipoLiquidacion === 'MIXTA' ? 'Sesión mixta' : 'Sesión particular';
    return {
      sesionId: l.sesionId,
      descripcion: `${tipo} · ${l.sesionId.slice(0, 8)}`,
      fecha: l.createdAt,
      importeSugerido: toAmount(l.importePaciente),
    };
  }

  onSesionSeleccionada(sesionId: string): void {
    this.form.controls.sesionId.setValue(sesionId);
    if (!sesionId) return;
    const sesion = this.sesionesPendientes().find((s) => s.sesionId === sesionId);
    if (!sesion) return;
    this.form.controls.importeTotal.setValue(+sesion.importeSugerido.toFixed(2));
  }

  agregarDetalle(): void {
    this.detallesArray.push(
      new FormGroup({
        medioPago: new FormControl<MedioPago>('EFECTIVO', Validators.required),
        importe: new FormControl<number>(0, [Validators.required, moneyValidator(0.01)]),
        referenciaOperacion: new FormControl<string>('', [Validators.maxLength(100)]),
      }),
    );
  }

  eliminarDetalle(index: number): void {
    if (this.detallesArray.length <= 1) return;
    this.detallesArray.removeAt(index);
  }

  placeholderReferencia(index: number): string {
    const medio = this.detallesArray.at(index).get('medioPago')?.value as MedioPago;
    switch (medio) {
      case 'TRANSFERENCIA':
        return 'CBU o alias';
      case 'TARJETA_DEBITO':
      case 'TARJETA_CREDITO':
        return 'N° autorización';
      case 'QR':
        return 'ID de operación';
      case 'EFECTIVO':
        return 'Detalle opcional';
      default:
        return 'N° operación';
    }
  }

  cobrar(): void {
    this.form.markAllAsTouched();
    if (!this.canSubmit()) return;

    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    this.cobroSvc
      .cobrar(consultorioId, {
        cajaDiariaId: v.cajaDiariaId || '',
        pacienteId: v.pacienteId || '',
        sesionId: v.sesionId || null,
        importeTotal: +toAmount(v.importeTotal).toFixed(2),
        observaciones: v.observaciones?.trim() ? v.observaciones.trim() : null,
        detalles: (v.detalles ?? []).map((d) => ({
          medioPago: (d?.['medioPago'] as MedioPago) ?? 'EFECTIVO',
          importe: +toAmount(d?.['importe']).toFixed(2),
          referenciaOperacion: d?.['referenciaOperacion']?.trim() ? d['referenciaOperacion'].trim() : null,
          cuotas: null,
          banco: null,
          marcaTarjeta: null,
        })),
      })
      .subscribe({
        next: (cobro) => {
          this.submitting.set(false);
          this.submitSuccess.set(true);
          this.toast.success(`Cobro registrado · Comprobante ${cobro.comprobanteNumero ?? cobro.id.slice(0, 8)}`);
          setTimeout(() => this.volverACaja(), 2000);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitSuccess.set(false);
          this.submitError.set(this.errMap.toMessage(err));
        },
      });
  }

  medioPagoLabel(mp: string): string {
    return MEDIO_PAGO_LABELS[mp as MedioPago] ?? mp;
  }

  inicialesPaciente(): string {
    const paciente = this.pacienteSeleccionado();
    if (!paciente) return '--';
    const n = paciente.nombre?.charAt(0) ?? '';
    const a = paciente.apellido?.charAt(0) ?? '';
    return `${n}${a}`.toUpperCase() || '--';
  }

  volverACaja(): void {
    this.router.navigate(['/app/caja/hoy']);
  }

  private cargarCaja(): void {
    const consultorioId = this.consultorioId();
    if (!consultorioId) {
      this.loadingCaja.set(false);
      return;
    }

    this.cajaSvc.byFecha(consultorioId, this.todayStr()).subscribe({
      next: (cajas) => {
        this.cajas.set(cajas);
        const abierta = cajas.find((c) => c.estado === 'ABIERTA') ?? null;
        this.cajaAbierta.set(abierta);
        if (abierta) {
          this.form.controls.cajaDiariaId.setValue(abierta.id);
        }
        this.loadingCaja.set(false);
      },
      error: () => {
        this.loadingCaja.set(false);
      },
    });
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

