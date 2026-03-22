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
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { CajaDiariaService } from '../../services/caja-diaria.service';
import { CobroPacienteService } from '../../services/cobro-paciente.service';
import {
  CajaDiaria,
  CobroPaciente,
  MEDIO_PAGO_LABELS,
  MedioPago,
} from '../../models/caja.models';

function sumMatchesTotal(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const group = control as FormGroup;
    const total = +(group.get('importeTotal')?.value ?? 0);
    const detalles = group.get('detalles') as FormArray;
    if (!detalles || detalles.length === 0) return null;
    const sum = detalles.controls.reduce((acc, c) => acc + +(c.get('importe')?.value ?? 0), 0);
    const diff = Math.abs(total - sum);
    return diff > 0.001 ? { sumaMismatch: { total, sum } } : null;
  };
}

@Component({
  selector: 'app-cobro-paciente-page',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cobro-paciente-page.html',
  styleUrl: './cobro-paciente-page.scss',
})
export class CobroPacientePage implements OnInit {
  private consultorioCtx = inject(ConsultorioContextService);
  private cajaSvc = inject(CajaDiariaService);
  private cobroSvc = inject(CobroPacienteService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private router = inject(Router);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  cajas = signal<CajaDiaria[]>([]);
  cajaAbierta = signal<CajaDiaria | null>(null);
  loadingCaja = signal(true);
  submitting = signal(false);
  resultado = signal<CobroPaciente | null>(null);

  readonly mediosPago = (Object.keys(MEDIO_PAGO_LABELS) as MedioPago[]).map((k) => ({
    value: k,
    label: MEDIO_PAGO_LABELS[k],
  }));

  form = new FormGroup(
    {
      cajaDiariaId: new FormControl<string>('', Validators.required),
      pacienteId: new FormControl<string>('', Validators.required),
      sesionId: new FormControl<string>(''),
      importeTotal: new FormControl<number>(0, [Validators.required, Validators.min(0.01)]),
      observaciones: new FormControl<string>(''),
      detalles: new FormArray<FormGroup>([], Validators.minLength(1)),
    },
    { validators: sumMatchesTotal() },
  );

  get detallesArray(): FormArray<FormGroup> {
    return this.form.get('detalles') as FormArray<FormGroup>;
  }

  sumaDetalles = computed(() => {
    const detalles = this.detallesArray.controls;
    return detalles.reduce((acc, c) => acc + +(c.get('importe')?.value ?? 0), 0);
  });

  sumaDiff = computed(() => {
    const total = +(this.form.get('importeTotal')?.value ?? 0);
    return total - this.sumaDetalles();
  });

  sumOk = computed(() => Math.abs(this.sumaDiff()) <= 0.001);

  ngOnInit(): void {
    this.cargarCaja();
    this.agregarDetalle();
  }

  private cargarCaja(): void {
    const consultorioId = this.consultorioId();
    if (!consultorioId) {
      this.loadingCaja.set(false);
      return;
    }
    const today = this.todayStr();
    this.cajaSvc.byFecha(consultorioId, today).subscribe({
      next: (cajas) => {
        this.cajas.set(cajas);
        const abierta = cajas.find((c) => c.estado === 'ABIERTA') ?? null;
        this.cajaAbierta.set(abierta);
        if (abierta) {
          this.form.get('cajaDiariaId')!.setValue(abierta.id);
        }
        this.loadingCaja.set(false);
      },
      error: () => {
        this.loadingCaja.set(false);
      },
    });
  }

  agregarDetalle(): void {
    this.detallesArray.push(
      new FormGroup({
        medioPago: new FormControl<MedioPago>('EFECTIVO', Validators.required),
        importe: new FormControl<number>(0, [Validators.required, Validators.min(0.01)]),
        referenciaOperacion: new FormControl<string>(''),
        cuotas: new FormControl<number | null>(null),
        banco: new FormControl<string>(''),
        marcaTarjeta: new FormControl<string>(''),
      }),
    );
  }

  eliminarDetalle(index: number): void {
    if (this.detallesArray.length > 1) {
      this.detallesArray.removeAt(index);
    }
  }

  completarConDiferencia(index: number): void {
    const diff = this.sumaDiff();
    if (diff <= 0) return;
    const control = this.detallesArray.at(index);
    const current = +(control.get('importe')?.value ?? 0);
    control.get('importe')?.setValue(+(current + diff).toFixed(2));
  }

  medioPagoEsTarjeta(index: number): boolean {
    const mp = this.detallesArray.at(index).get('medioPago')?.value as MedioPago;
    return mp === 'TARJETA_CREDITO' || mp === 'TARJETA_DEBITO';
  }

  cobrar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting() || !this.sumOk()) return;

    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    const v = this.form.value;
    this.submitting.set(true);

    this.cobroSvc
      .cobrar(consultorioId, {
        cajaDiariaId: v.cajaDiariaId!,
        pacienteId: v.pacienteId!,
        sesionId: v.sesionId || null,
        importeTotal: v.importeTotal!,
        observaciones: v.observaciones || null,
        detalles: (v.detalles ?? []).map((d: Record<string, unknown>) => ({
          medioPago: d['medioPago'] as MedioPago,
          importe: +(d['importe'] ?? 0),
          referenciaOperacion: (d['referenciaOperacion'] as string) || null,
          cuotas: d['cuotas'] ? +(d['cuotas'] as number) : null,
          banco: (d['banco'] as string) || null,
          marcaTarjeta: (d['marcaTarjeta'] as string) || null,
        })),
      })
      .subscribe({
        next: (cobro) => {
          this.resultado.set(cobro);
          this.submitting.set(false);
          this.toast.success(`Cobro registrado · Comprobante ${cobro.comprobanteNumero ?? cobro.id.substring(0, 8)}`);
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  nuevoCobro(): void {
    this.resultado.set(null);
    this.form.reset({ cajaDiariaId: this.cajaAbierta()?.id ?? '', pacienteId: '', importeTotal: 0 });
    this.detallesArray.clear();
    this.agregarDetalle();
  }

  volverACaja(): void {
    this.router.navigate(['/app/caja/hoy']);
  }

  medioPagoLabel(mp: string): string {
    return MEDIO_PAGO_LABELS[mp as MedioPago] ?? mp;
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
