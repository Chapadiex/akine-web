import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ConfiguracionConsultorioService } from '../../services/configuracion-consultorio.service';
import { ConfiguracionConsultorio, PoliticaNoShow } from '../../models/configuracion-consultorio.models';

type PageState = 'loading' | 'loaded' | 'error';
type OperativoFormValue = {
  arancelParticularPorSesion: number | null;
  politicaNoShow: PoliticaNoShow;
  noShowHorasAviso: number | null;
  alertaSesionSinCierreHoras: number;
  habilitarMultiplesCajas: boolean;
  monedaDefault: string;
  formatoNumeracionRecibo: string;
};

@Component({
  selector: 'app-configuracion-operativa',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-operativa.html',
  styleUrl: './configuracion-operativa.scss',
})
export class ConfiguracionOperativaPage implements OnInit {
  private route = inject(ActivatedRoute);
  private ctx = inject(ConsultorioContextService);
  private svc = inject(ConfiguracionConsultorioService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  pageState = signal<PageState>('loading');
  submitting = signal(false);
  consultorioId = '';

  private savedSnapshot = signal<OperativoFormValue | null>(null);

  readonly politicasNoShow: { value: PoliticaNoShow; label: string }[] = [
    { value: 'NO_COBRAR', label: 'No cobrar' },
    { value: 'COBRAR_TOTAL', label: 'Cobrar total' },
    { value: 'COBRAR_PORCENTAJE', label: 'Cobrar porcentaje' },
  ];

  form = new FormGroup({
    arancelParticularPorSesion: new FormControl<number | null>(null, [Validators.min(0)]),
    politicaNoShow: new FormControl<PoliticaNoShow>('NO_COBRAR', Validators.required),
    noShowHorasAviso: new FormControl<number | null>(null, [Validators.min(0)]),
    alertaSesionSinCierreHoras: new FormControl<number>(24, [Validators.required, Validators.min(1)]),
    habilitarMultiplesCajas: new FormControl<boolean>(false, Validators.required),
    monedaDefault: new FormControl<string>('ARS', Validators.required),
    formatoNumeracionRecibo: new FormControl<string>('REC-{year}-{seq:06}', Validators.required),
  });

  ngOnInit(): void {
    this.consultorioId =
      this.route.parent?.parent?.snapshot.paramMap.get('id') ||
      this.route.parent?.snapshot.paramMap.get('id') ||
      this.ctx.selectedConsultorioId() ||
      '';
    if (!this.consultorioId) {
      this.pageState.set('error');
      return;
    }
    this.load();
  }

  private defaultFormValue(): OperativoFormValue {
    return {
      arancelParticularPorSesion: null,
      politicaNoShow: 'NO_COBRAR',
      noShowHorasAviso: null,
      alertaSesionSinCierreHoras: 24,
      habilitarMultiplesCajas: false,
      monedaDefault: 'ARS',
      formatoNumeracionRecibo: 'REC-{year}-{seq:06}',
    };
  }

  private load(): void {
    this.pageState.set('loading');
    this.svc.get(this.consultorioId).subscribe({
      next: (config) => {
        this.form.reset(
          {
            arancelParticularPorSesion: config.arancelParticularPorSesion ?? null,
            politicaNoShow: config.politicaNoShow ?? 'NO_COBRAR',
            noShowHorasAviso: config.noShowHorasAviso ?? null,
            alertaSesionSinCierreHoras: config.alertaSesionSinCierreHoras ?? 24,
            habilitarMultiplesCajas: config.habilitarMultiplesCajas ?? false,
            monedaDefault: config.monedaDefault ?? 'ARS',
            formatoNumeracionRecibo: config.formatoNumeracionRecibo ?? 'REC-{year}-{seq:06}',
          },
          { emitEvent: false },
        );
        this.savedSnapshot.set(this.form.getRawValue() as OperativoFormValue);
        this.form.markAsPristine();
        this.pageState.set('loaded');
      },
      error: (err) => {
        if (err?.status === 404) {
          this.form.reset(this.defaultFormValue(), { emitEvent: false });
          this.savedSnapshot.set(this.form.getRawValue() as OperativoFormValue);
          this.form.markAsPristine();
          this.pageState.set('loaded');
        } else {
          this.toast.error(this.errMap.toMessage(err));
          this.pageState.set('error');
        }
      },
    });
  }

  guardar(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const v = this.form.value;
    const payload: Partial<ConfiguracionConsultorio> = {
      consultorioId: this.consultorioId,
      arancelParticularPorSesion: v.arancelParticularPorSesion ?? undefined,
      politicaNoShow: v.politicaNoShow ?? 'NO_COBRAR',
      noShowHorasAviso: v.noShowHorasAviso ?? undefined,
      alertaSesionSinCierreHoras: v.alertaSesionSinCierreHoras ?? 24,
      habilitarMultiplesCajas: v.habilitarMultiplesCajas ?? false,
      monedaDefault: v.monedaDefault ?? 'ARS',
      formatoNumeracionRecibo: v.formatoNumeracionRecibo ?? 'REC-{year}-{seq:06}',
    };
    this.svc.upsert(this.consultorioId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.savedSnapshot.set(this.form.getRawValue() as OperativoFormValue);
        this.form.markAsPristine();
        this.toast.success('Configuración guardada');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  cancelar(): void {
    const snapshot = this.savedSnapshot() ?? this.defaultFormValue();
    this.form.reset(snapshot, { emitEvent: false });
    this.form.markAsPristine();
  }

  restaurarValores(): void {
    this.form.reset(this.defaultFormValue(), { emitEvent: false });
    this.form.markAsDirty();
  }

  summaryItems(): Array<{ label: string; value: string }> {
    const value = this.form.getRawValue() as OperativoFormValue;
    return [
      { label: 'Arancel particular', value: this.formatCurrency(value.arancelParticularPorSesion) },
      { label: 'No-show', value: this.politicaNoShowLabel(value.politicaNoShow) },
      { label: 'Cancelación sin costo', value: this.formatHours(value.noShowHorasAviso) },
      { label: 'Múltiples cajas por día', value: value.habilitarMultiplesCajas ? 'Sí' : 'No' },
      { label: 'Moneda', value: value.monedaDefault || 'ARS' },
      { label: 'Formato de recibos', value: value.formatoNumeracionRecibo || 'REC-{year}-{seq:06}' },
      { label: 'Alerta cierre clínico', value: this.formatHours(value.alertaSesionSinCierreHoras) },
    ];
  }

  private politicaNoShowLabel(value: PoliticaNoShow): string {
    return this.politicasNoShow.find((item) => item.value === value)?.label ?? value;
  }

  private formatHours(value: number | null): string {
    if (value === null || value === undefined) {
      return 'No definido';
    }
    return `${value} hs`;
  }

  private formatCurrency(value: number | null): string {
    if (value === null || value === undefined) {
      return 'No definido';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(value);
  }
}

