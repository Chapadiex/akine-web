import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { LiquidacionSesionService } from '../../services/liquidacion-sesion.service';
import { EstadoLiquidacion, LiquidacionSesion, TipoLiquidacion } from '../../models/caja.models';

type PageState = 'loading' | 'loaded' | 'error';
type ModalMode = 'none' | 'reliquidar' | 'convertir';

const ESTADO_LABELS: Record<EstadoLiquidacion, string> = {
  PENDIENTE_DE_LIQUIDAR: 'Pendiente',
  LIQUIDADA_PARTICULAR: 'Particular',
  LIQUIDADA_MIXTA: 'Mixta',
  LIQUIDADA_OS: 'Obra Social',
  BLOQUEADA_POR_DOCUMENTACION: 'Bloqueada',
  ANULADA: 'Anulada',
};

const TIPO_LABELS: Record<TipoLiquidacion, string> = {
  PARTICULAR: 'Particular',
  MIXTA: 'Mixta (copago + OS)',
  OS: 'Obra Social',
};

@Component({
  selector: 'app-liquidacion-sesion-page',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NgClass, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './liquidacion-sesion-page.html',
  styleUrl: './liquidacion-sesion-page.scss',
})
export class LiquidacionSesionPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private consultorioCtx = inject(ConsultorioContextService);
  private svc = inject(LiquidacionSesionService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  pageState = signal<PageState>('loading');
  liquidacion = signal<LiquidacionSesion | null>(null);
  modalMode = signal<ModalMode>('none');
  submitting = signal(false);

  motivoCtrl = new FormControl('', [Validators.required, Validators.minLength(5)]);

  estadoLabel = computed(() => {
    const l = this.liquidacion();
    return l ? ESTADO_LABELS[l.estado] : '';
  });

  tipoLabel = computed(() => {
    const l = this.liquidacion();
    return l ? TIPO_LABELS[l.tipoLiquidacion] : '';
  });

  estadoCssClass = computed(() => {
    const l = this.liquidacion();
    if (!l) return '';
    switch (l.estado) {
      case 'LIQUIDADA_PARTICULAR': return 'badge-success';
      case 'LIQUIDADA_MIXTA':     return 'badge-info';
      case 'LIQUIDADA_OS':        return 'badge-primary';
      case 'BLOQUEADA_POR_DOCUMENTACION': return 'badge-warning';
      case 'ANULADA':             return 'badge-error';
      default:                    return 'badge-neutral';
    }
  });

  puedeReliquidar = computed(() => {
    const l = this.liquidacion();
    return l && l.estado !== 'LIQUIDADA_OS' && l.estado !== 'ANULADA';
  });

  puedeConvertirAParticular = computed(() => {
    const l = this.liquidacion();
    return l && l.tipoLiquidacion !== 'PARTICULAR' && l.estado !== 'ANULADA';
  });

  puedeCobrar = computed(() => {
    const l = this.liquidacion();
    return (
      l &&
      (l.estado === 'LIQUIDADA_PARTICULAR' || l.estado === 'LIQUIDADA_MIXTA') &&
      l.importePaciente > 0
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('liquidacionId');
    if (!id || !this.consultorioId()) {
      this.pageState.set('error');
      return;
    }
    this.cargar(id);
  }

  private cargar(id: string): void {
    this.pageState.set('loading');
    this.svc.byId(this.consultorioId()!, id).subscribe({
      next: (l) => {
        this.liquidacion.set(l);
        this.pageState.set('loaded');
      },
      error: () => this.pageState.set('error'),
    });
  }

  volver(): void {
    this.router.navigate(['../../../hoy'], { relativeTo: this.route });
  }

  irACobrar(): void {
    const l = this.liquidacion();
    if (!l) return;
    this.router.navigate(['../../cobrar'], {
      relativeTo: this.route,
      queryParams: { sesionId: l.sesionId },
    });
  }

  abrirReliquidar(): void {
    this.motivoCtrl.reset('');
    this.modalMode.set('reliquidar');
  }

  abrirConvertir(): void {
    this.motivoCtrl.reset('');
    this.modalMode.set('convertir');
  }

  cerrarModal(): void {
    this.modalMode.set('none');
  }

  confirmarAccion(): void {
    if (this.motivoCtrl.invalid) {
      this.motivoCtrl.markAsTouched();
      return;
    }
    const l = this.liquidacion();
    const cid = this.consultorioId();
    if (!l || !cid) return;

    const motivo = this.motivoCtrl.value!;
    const mode = this.modalMode();
    this.submitting.set(true);

    const obs$ =
      mode === 'reliquidar'
        ? this.svc.reliquidar(cid, l.id, { motivo })
        : this.svc.convertirAParticular(cid, l.id, { motivo });

    obs$.subscribe({
      next: (updated) => {
        this.liquidacion.set(updated);
        this.submitting.set(false);
        this.modalMode.set('none');
        const msg =
          mode === 'reliquidar'
            ? 'Liquidación recalculada correctamente.'
            : 'Sesión convertida a particular.';
        this.toast.success(msg);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  readonly ESTADO_LABELS = ESTADO_LABELS;
  readonly TIPO_LABELS = TIPO_LABELS;
}
