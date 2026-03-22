import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, DatePipe, NgClass, SlicePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PagoObraSocialService } from '../../services/pago-obra-social.service';
import { ImputarPagoOsRequest, PagoObraSocial, RegistrarPagoOsRequest } from '../../models/facturacion.models';

type PageState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-pago-os-page',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NgClass, SlicePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pago-os-page.html',
  styleUrl: './pago-os-page.scss',
})
export class PagoOsPage implements OnInit {
  private consultorioCtx = inject(ConsultorioContextService);
  private pagoSvc = inject(PagoObraSocialService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  pageState = signal<PageState>('loading');
  pagos = signal<PagoObraSocial[]>([]);
  submitting = signal(false);
  showRegistrarForm = signal(false);
  imputarTarget = signal<PagoObraSocial | null>(null);

  registrarForm = new FormGroup({
    loteId: new FormControl<string>('', [Validators.required]),
    importeRecibido: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    fechaNotificacion: new FormControl<string>(this.todayStr(), [Validators.required]),
    observaciones: new FormControl<string>(''),
  });

  imputarForm = new FormGroup({
    cajaDiariaId: new FormControl<string>('', [Validators.required]),
  });

  pagosNoImputados = computed(() => this.pagos().filter((p) => !p.cajaDiariaId));
  pagosImputados   = computed(() => this.pagos().filter((p) => !!p.cajaDiariaId));

  activeTab = signal<'pendientes' | 'imputados'>('pendientes');

  constructor() {
    effect(() => {
      const cid = this.consultorioId();
      if (cid) this.cargarPagos(cid);
    });
  }

  ngOnInit(): void {}

  toggleRegistrarForm(): void {
    this.showRegistrarForm.update((v) => !v);
    if (!this.showRegistrarForm()) this.registrarForm.reset({ fechaNotificacion: this.todayStr() });
  }

  registrar(): void {
    if (this.registrarForm.invalid || this.submitting()) return;
    const cid = this.consultorioId();
    if (!cid) return;

    this.submitting.set(true);
    const raw = this.registrarForm.getRawValue();
    const req: RegistrarPagoOsRequest = {
      loteId: raw.loteId!,
      importeRecibido: raw.importeRecibido!,
      fechaNotificacion: raw.fechaNotificacion!,
      ...(raw.observaciones ? { observaciones: raw.observaciones } : {}),
    };

    this.pagoSvc.registrar(cid, req).subscribe({
      next: (pago) => {
        this.pagos.update((ps) => [pago, ...ps]);
        this.showRegistrarForm.set(false);
        this.registrarForm.reset({ fechaNotificacion: this.todayStr() });
        this.submitting.set(false);
        this.toast.success('Pago OS registrado');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  openImputar(pago: PagoObraSocial): void {
    this.imputarTarget.set(pago);
    this.imputarForm.reset();
  }

  cancelImputar(): void {
    this.imputarTarget.set(null);
  }

  imputar(): void {
    const pago = this.imputarTarget();
    if (!pago || this.imputarForm.invalid || this.submitting()) return;
    const cid = this.consultorioId();
    if (!cid) return;

    this.submitting.set(true);
    const req: ImputarPagoOsRequest = { cajaDiariaId: this.imputarForm.value.cajaDiariaId! };

    this.pagoSvc.imputar(cid, pago.id, req).subscribe({
      next: (updated) => {
        this.updatePagoInList(updated);
        this.imputarTarget.set(null);
        this.submitting.set(false);
        this.toast.success('Pago imputado a caja');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  diferenciaClass(diferencia: number): string {
    if (diferencia < 0) return 'text-danger';
    if (diferencia > 0) return 'text-success';
    return '';
  }

  private cargarPagos(consultorioId: string): void {
    this.pageState.set('loading');
    this.pagoSvc.list(consultorioId).subscribe({
      next: (pagos) => {
        this.pagos.set(pagos);
        this.pageState.set('loaded');
      },
      error: () => this.pageState.set('error'),
    });
  }

  private updatePagoInList(updated: PagoObraSocial): void {
    this.pagos.update((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
  }

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
