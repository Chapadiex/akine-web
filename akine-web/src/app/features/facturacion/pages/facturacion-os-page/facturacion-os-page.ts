import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { LoteFacturacionOsService } from '../../services/lote-facturacion-os.service';
import { EstadoLoteOs, GenerarLoteOsRequest, LoteFacturacionOs } from '../../models/facturacion.models';

type PageState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-facturacion-os-page',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NgClass, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './facturacion-os-page.html',
  styleUrl: './facturacion-os-page.scss',
})
export class FacturacionOsPage implements OnInit {
  private consultorioCtx = inject(ConsultorioContextService);
  private loteSvc = inject(LoteFacturacionOsService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  pageState = signal<PageState>('loading');
  lotes = signal<LoteFacturacionOs[]>([]);
  submitting = signal(false);
  showGenerarForm = signal(false);
  activeTab = signal<'activos' | 'historial'>('activos');

  generarForm = new FormGroup({
    financiadorId: new FormControl<string>('', [Validators.required]),
    planId: new FormControl<string>(''),
    periodo: new FormControl<string>(this.currentPeriodo(), [
      Validators.required,
      Validators.pattern(/^\d{4}-\d{2}$/),
    ]),
  });

  lotesActivos = computed(() =>
    this.lotes().filter((l) => l.estado === 'BORRADOR' || l.estado === 'CERRADO'),
  );

  lotesPresentados = computed(() =>
    this.lotes().filter((l) => l.estado === 'PRESENTADO'),
  );

  lotesHistorial = computed(() =>
    this.lotes().filter((l) => l.estado === 'LIQUIDADO' || l.estado === 'ANULADO'),
  );

  lotesPresentadosYHistorial = computed(() =>
    [...this.lotesPresentados(), ...this.lotesHistorial()],
  );

  constructor() {
    effect(() => {
      const cid = this.consultorioId();
      if (cid) this.cargarLotes(cid);
    });
  }

  ngOnInit(): void {}

  toggleGenerarForm(): void {
    this.showGenerarForm.update((v) => !v);
    if (!this.showGenerarForm()) this.generarForm.reset({ periodo: this.currentPeriodo() });
  }

  generar(): void {
    if (this.generarForm.invalid || this.submitting()) return;
    const cid = this.consultorioId();
    if (!cid) return;

    this.submitting.set(true);
    const raw = this.generarForm.getRawValue();
    const req: GenerarLoteOsRequest = {
      financiadorId: raw.financiadorId!,
      periodo: raw.periodo!,
      ...(raw.planId ? { planId: raw.planId } : {}),
    };

    this.loteSvc.generar(cid, req).subscribe({
      next: (lote) => {
        this.lotes.update((ls) => [lote, ...ls]);
        this.showGenerarForm.set(false);
        this.generarForm.reset({ periodo: this.currentPeriodo() });
        this.submitting.set(false);
        this.toast.success(`Lote ${lote.periodo} generado — ${lote.cantidadSesiones} sesiones`);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  cerrar(lote: LoteFacturacionOs): void {
    const cid = this.consultorioId();
    if (!cid) return;
    this.loteSvc.cerrar(cid, lote.id).subscribe({
      next: (updated) => {
        this.updateLoteInList(updated);
        this.toast.success('Lote cerrado');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  presentar(lote: LoteFacturacionOs): void {
    const cid = this.consultorioId();
    if (!cid) return;
    this.loteSvc.presentar(cid, lote.id).subscribe({
      next: (updated) => {
        this.updateLoteInList(updated);
        this.toast.success('Lote marcado como presentado');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  estadoLabel(estado: EstadoLoteOs): string {
    const labels: Record<EstadoLoteOs, string> = {
      BORRADOR: 'Borrador',
      CERRADO: 'Cerrado',
      PRESENTADO: 'Presentado',
      LIQUIDADO: 'Liquidado',
      ANULADO: 'Anulado',
    };
    return labels[estado] ?? estado;
  }

  private cargarLotes(consultorioId: string): void {
    this.pageState.set('loading');
    this.loteSvc.list(consultorioId).subscribe({
      next: (lotes) => {
        this.lotes.set(lotes);
        this.pageState.set('loaded');
      },
      error: () => this.pageState.set('error'),
    });
  }

  private updateLoteInList(updated: LoteFacturacionOs): void {
    this.lotes.update((ls) => ls.map((l) => (l.id === updated.id ? updated : l)));
  }

  private currentPeriodo(): string {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${m}`;
  }
}
