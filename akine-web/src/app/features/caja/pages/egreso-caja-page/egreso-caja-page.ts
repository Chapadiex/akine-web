import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { Router } from '@angular/router';
import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { CajaDiariaService } from '../../services/caja-diaria.service';
import {
  CajaDiaria,
  EgresoDetalleRequest,
  EgresoManualRequest,
  MEDIO_PAGO_LABELS,
  MedioPago,
  TIPO_EGRESO_LABELS,
  TipoEgreso,
} from '../../models/caja.models';

const MEDIOS_EGRESO: MedioPago[] = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
  'QR',
  'CHEQUE',
  'OTRO',
];

interface DeltaState {
  ok: boolean;
  mensaje: string;
  diferencia: number;
}

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
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { moneyFormat: true };
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < min) return { moneyMin: { min } };
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
  selector: 'app-egreso-caja-page',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './egreso-caja-page.html',
  styleUrl: './egreso-caja-page.scss',
})
export class EgresoCajaPage implements OnInit {
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly cajaSvc = inject(CajaDiariaService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly router = inject(Router);

  readonly consultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly consultorioNombre = computed(() => this.consultorioCtx.selectedConsultorio()?.name ?? 'Consultorio activo');

  readonly cajaAbierta = signal<CajaDiaria | null>(null);
  readonly loadingCaja = signal(true);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);

  readonly tiposEgreso = (Object.entries(TIPO_EGRESO_LABELS) as [TipoEgreso, string][]).map(
    ([value, label]) => ({ value, label }),
  );

  readonly mediosPago = MEDIOS_EGRESO.map((value) => ({ value, label: MEDIO_PAGO_LABELS[value] }));

  readonly form = new FormGroup(
    {
      cajaDiariaId: new FormControl<string>('', Validators.required),
      tipoEgreso: new FormControl<TipoEgreso>('OTRO', Validators.required),
      concepto: new FormControl<string>('', [Validators.maxLength(200)]),
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
    return detalles.reduce((acc, d) => acc + toAmount(d?.['importe']), 0);
  });

  readonly sumaDiff = computed(() => {
    const total = toAmount(this.formValue()?.importeTotal);
    return +(total - this.sumaDetalles()).toFixed(2);
  });

  readonly deltaState = computed<DeltaState>(() => {
    const total = toAmount(this.formValue()?.importeTotal);
    if (total <= 0) return { ok: false, mensaje: 'Ingresá un importe', diferencia: 0 };
    const diff = this.sumaDiff();
    if (Math.abs(diff) <= 0.001) return { ok: true, mensaje: 'Suma correcta', diferencia: 0 };
    if (diff > 0) return { ok: false, mensaje: `Faltan $ ${diff.toFixed(2)}`, diferencia: diff };
    return { ok: false, mensaje: `Sobran $ ${Math.abs(diff).toFixed(2)}`, diferencia: diff };
  });

  readonly mediosUtilizadosTexto = computed(() => {
    const detalles = this.formValue()?.detalles ?? [];
    return detalles
      .filter((d) => toAmount(d?.['importe']) > 0)
      .map((d) => `${this.medioPagoLabel(String(d?.['medioPago'] ?? ''))} $${toAmount(d?.['importe']).toFixed(2)}`)
      .join(' · ');
  });

  readonly canSubmit = computed(() =>
    this.formStatus() === 'VALID' && this.deltaState().ok && !this.submitting(),
  );

  ngOnInit(): void {
    this.cargarCaja();
    this.agregarDetalle();
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
      case 'TRANSFERENCIA': return 'CBU o alias';
      case 'TARJETA_DEBITO':
      case 'TARJETA_CREDITO': return 'N° autorización';
      case 'QR': return 'ID de operación';
      case 'CHEQUE': return 'N° de cheque';
      case 'EFECTIVO': return 'Detalle opcional';
      default: return 'N° operación';
    }
  }

  medioPagoLabel(mp: string): string {
    return MEDIO_PAGO_LABELS[mp as MedioPago] ?? mp;
  }

  tipoEgresoLabel(): string {
    const tipo = this.form.controls.tipoEgreso.value;
    return tipo ? (TIPO_EGRESO_LABELS[tipo] ?? tipo) : '';
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (!this.canSubmit()) return;

    const consultorioId = this.consultorioId();
    const cajaId = this.cajaAbierta()?.id;
    if (!consultorioId || !cajaId) return;

    const v = this.form.getRawValue();
    const req: EgresoManualRequest = {
      tipoEgreso: v.tipoEgreso!,
      concepto: v.concepto?.trim() || null,
      importeTotal: +toAmount(v.importeTotal).toFixed(2),
      observaciones: v.observaciones?.trim() || null,
      detalles: (v.detalles ?? []).map(
        (d): EgresoDetalleRequest => ({
          medioPago: (d?.['medioPago'] as MedioPago) ?? 'EFECTIVO',
          importe: +toAmount(d?.['importe']).toFixed(2),
          referenciaOperacion: d?.['referenciaOperacion']?.trim() || null,
        }),
      ),
    };

    this.submitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    this.cajaSvc.registrarEgreso(consultorioId, cajaId, req).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitSuccess.set(true);
        this.toast.success('Egreso registrado correctamente');
        setTimeout(() => this.volverACaja(), 1800);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(this.errMap.toMessage(err));
      },
    });
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
        const abierta = cajas.find((c) => c.estado === 'ABIERTA') ?? null;
        this.cajaAbierta.set(abierta);
        if (abierta) {
          this.form.controls.cajaDiariaId.setValue(abierta.id);
        }
        this.loadingCaja.set(false);
      },
      error: () => this.loadingCaja.set(false),
    });
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
