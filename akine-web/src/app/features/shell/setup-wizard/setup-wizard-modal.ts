import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SetupWizardData, SetupWizardService } from './setup-wizard.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../core/error/error-mapper.service';
import { CoberturaService } from '../../cobertura/services/cobertura.service';
import { DayOfWeek } from '../../consultorios/models/agenda.models';
import { BoxTipo } from '../../consultorios/models/consultorio.models';

type WizardView = 'welcome' | 1 | 2 | 3 | 4;

export const DIAS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY',    label: 'Lunes',      short: 'Lu' },
  { key: 'TUESDAY',   label: 'Martes',     short: 'Ma' },
  { key: 'WEDNESDAY', label: 'Miércoles',  short: 'Mi' },
  { key: 'THURSDAY',  label: 'Jueves',     short: 'Ju' },
  { key: 'FRIDAY',    label: 'Viernes',    short: 'Vi' },
  { key: 'SATURDAY',  label: 'Sábado',     short: 'Sa' },
  { key: 'SUNDAY',    label: 'Domingo',    short: 'Do' },
];

export const ESPECIALIDADES: { value: string; label: string }[] = [
  { value: 'KINESIO',       label: 'Kinesiología' },
  { value: 'FISIO',         label: 'Fisioterapia' },
  { value: 'KINESIO_FISIO', label: 'Kinesiología y Fisioterapia' },
];

export const TIPOS_SALA: { value: string; boxTipo: BoxTipo; label: string }[] = [
  { value: 'GIMNASIO',       boxTipo: 'GIMNASIO', label: 'Gimnasio' },
  { value: 'CONSULTORIO',    boxTipo: 'BOX',      label: 'Consultorio' },
  { value: 'BOX_ATENCION',   boxTipo: 'BOX',      label: 'Box de atención' },
  { value: 'REHABILITACION', boxTipo: 'GIMNASIO', label: 'Sala de rehabilitación' },
  { value: 'HIDROTERAPIA',   boxTipo: 'GIMNASIO', label: 'Pileta / Hidroterapia' },
  { value: 'DOMICILIO',      boxTipo: 'OFICINA',  label: 'Domicilio' },
];

const SALA_TIPO_TO_BOX_TIPO: Record<string, BoxTipo> = Object.fromEntries(
  TIPOS_SALA.map((t) => [t.value, t.boxTipo]),
);

interface ArancelPreviewRow {
  nombre: string;
  pct: number;
}

const ARANCEL_PREVIEW_ROWS: ArancelPreviewRow[] = [
  { nombre: 'Particular',    pct: 0   },
  { nombre: 'OSDE 210',      pct: 40  },
  { nombre: 'OSDE 310',      pct: 60  },
  { nombre: 'OSDE 450',      pct: 80  },
  { nombre: 'Swiss Medical', pct: 70  },
  { nombre: 'PAMI',          pct: 100 },
];

function atLeastOneDaySelected(control: AbstractControl): ValidationErrors | null {
  const group = control as ReturnType<FormBuilder['group']>;
  const anyChecked = DIAS.some((d) => group.get(d.key)?.value === true);
  return anyChecked ? null : { noDaySelected: true };
}

@Component({
  selector: 'app-setup-wizard-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './setup-wizard-modal.html',
  styleUrl: './setup-wizard-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupWizardModal {
  private readonly fb = inject(FormBuilder);
  private readonly setupSvc = inject(SetupWizardService);
  private readonly coberturaSvc = inject(CoberturaService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly completed = output<string>();
  readonly dismissed = output<void>();
  readonly saving = signal(false);

  readonly DIAS = DIAS;
  readonly ESPECIALIDADES = ESPECIALIDADES;
  readonly TIPOS_SALA = TIPOS_SALA;
  readonly STEPS = [1, 2, 3, 4];

  readonly ARANCEL_PREVIEW_ROWS = ARANCEL_PREVIEW_ROWS;

  readonly INTERVAL_OPTIONS: { value: number; label: string }[] = [
    { value: 20, label: '20 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '60 minutos' },
  ];

  readonly currentView = signal<WizardView>('welcome');
  readonly currentStep = computed<number>(() => {
    const v = this.currentView();
    return typeof v === 'number' ? v : 0;
  });

  readonly form = this.fb.group({
    // Step 1
    consultorioNombre: ['', [Validators.required, Validators.maxLength(100)]],
    especialidad:      ['KINESIO', [Validators.required]],
    salaNombre:        ['Gimnasio principal', [Validators.required, Validators.maxLength(50)]],
    salaTipo:          ['GIMNASIO'],
    // Step 2
    dias: this.fb.group(
      {
        MONDAY:    [true],
        TUESDAY:   [true],
        WEDNESDAY: [true],
        THURSDAY:  [true],
        FRIDAY:    [true],
        SATURDAY:  [false],
        SUNDAY:    [false],
      },
      { validators: atLeastOneDaySelected },
    ),
    horaApertura:    ['08:00', [Validators.required]],
    horaCierre:      ['20:00', [Validators.required]],
    intervalMinutos: [30,      [Validators.required]],
    // Step 3
    arancelParticular:      [null as number | null, [Validators.required, Validators.min(1), Validators.max(9999999)]],
    precargarFinanciadores: [true],
  });

  // ── Computed getters ────────────────────────────────────────────────────────

  get stepTitle(): string {
    switch (this.currentView()) {
      case 1: return 'Información general';
      case 2: return 'Turnos y horarios';
      case 3: return 'Precio y obras sociales';
      case 4: return 'Resumen';
      default: return '';
    }
  }

  get canAdvance(): boolean {
    const v = this.currentView();
    if (v === 'welcome') return true;
    if (v === 1) {
      const n = this.form.get('consultorioNombre');
      const e = this.form.get('especialidad');
      const s = this.form.get('salaNombre');
      return !!(n?.valid && e?.valid && s?.valid);
    }
    if (v === 2) {
      const diasOk = DIAS.some((d) => this.form.get('dias')?.get(d.key)?.value === true);
      const ha = this.form.get('horaApertura');
      const hc = this.form.get('horaCierre');
      const i  = this.form.get('intervalMinutos');
      const horaOk = !!(ha?.valid && hc?.valid && ha.value && hc.value && ha.value < hc.value);
      return diasOk && horaOk && !!(i?.valid);
    }
    if (v === 3) return !!(this.form.get('arancelParticular')?.valid);
    return true;
  }

  get diasInvalid(): boolean {
    const g = this.form.get('dias');
    return !!(g?.invalid && g?.touched);
  }

  get summaryHorario(): string {
    const selected = DIAS
      .filter((d) => this.form.get('dias')?.get(d.key)?.value)
      .map((d) => d.short);
    const ha = this.form.get('horaApertura')?.value ?? '08:00';
    const hc = this.form.get('horaCierre')?.value ?? '20:00';
    return `${selected.join(', ')} · ${ha}–${hc}`;
  }

  get summaryIntervalo(): string {
    const v = this.form.get('intervalMinutos')?.value;
    const opt = this.INTERVAL_OPTIONS.find((o) => o.value === v);
    return opt?.label ?? `${v} minutos`;
  }

  get summaryEspecialidad(): string {
    const v = this.form.get('especialidad')?.value;
    return ESPECIALIDADES.find((e) => e.value === v)?.label ?? v ?? '';
  }

  get summaryTipoSala(): string {
    const v = this.form.get('salaTipo')?.value;
    return TIPOS_SALA.find((t) => t.value === v)?.label ?? v ?? '';
  }

  get summaryPrecio(): string {
    const v = this.form.get('arancelParticular')?.value;
    if (!v) return '—';
    return `$ ${Number(v).toLocaleString('es-AR')}`;
  }

  get summaryFinanciadores(): string {
    const precio = this.form.get('arancelParticular')?.value;
    const precarga = this.form.get('precargarFinanciadores')?.value;
    if (!precarga) return 'Manual';
    return precio && precio > 0 ? '63 con aranceles' : '63 convenios';
  }

  previewOsPaga(pct: number): number | null {
    const precio = this.form.get('arancelParticular')?.value;
    if (!precio || precio <= 0) return null;
    return Math.round((precio * pct) / 100 * 100) / 100;
  }

  previewCoseguro(pct: number): number | null {
    const precio = this.form.get('arancelParticular')?.value;
    if (!precio || precio <= 0) return null;
    const osPaga = Math.round((precio * pct) / 100 * 100) / 100;
    return Math.round((precio - osPaga) * 100) / 100;
  }

  get showArancelPreview(): boolean {
    const precio = this.form.get('arancelParticular')?.value;
    const precarga = this.form.get('precargarFinanciadores')?.value;
    return !!(precarga && precio && precio > 0);
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  startWizard(): void {
    this.currentView.set(1);
    setTimeout(() => document.getElementById('consultorioNombre')?.focus(), 50);
  }

  next(): void {
    const v = this.currentView();
    if (v === 'welcome') { this.startWizard(); return; }
    if (!this.canAdvance) {
      this.markStepTouched(this.currentStep());
      return;
    }
    if (typeof v === 'number' && v < 4) {
      this.currentView.set((v + 1) as WizardView);
      const firstIds: Record<number, string> = { 2: 'horaApertura', 3: 'arancelParticular' };
      const id = firstIds[v + 1];
      if (id) setTimeout(() => document.getElementById(id)?.focus(), 50);
    }
  }

  back(): void {
    const v = this.currentView();
    if (typeof v === 'number' && v > 1) {
      this.currentView.set((v - 1) as WizardView);
    }
  }

  private markStepTouched(step: number): void {
    if (step === 1) {
      ['consultorioNombre', 'especialidad', 'salaNombre'].forEach((f) =>
        this.form.get(f)?.markAsTouched(),
      );
    } else if (step === 2) {
      ['dias', 'horaApertura', 'horaCierre'].forEach((f) =>
        this.form.get(f)?.markAsTouched(),
      );
    } else if (step === 3) {
      this.form.get('arancelParticular')?.markAsTouched();
    }
  }

  // ── Form helpers ────────────────────────────────────────────────────────────

  isDiaChecked(key: DayOfWeek): boolean {
    return this.form.get('dias')?.get(key)?.value === true;
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  confirm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const diasSeleccionados: DayOfWeek[] = DIAS
      .filter((d) => v.dias[d.key as keyof typeof v.dias])
      .map((d) => d.key);

    const data: SetupWizardData = {
      consultorioNombre: v.consultorioNombre!,
      salaNombre:        v.salaNombre!,
      salaTipo:          SALA_TIPO_TO_BOX_TIPO[v.salaTipo ?? 'GIMNASIO'],
      dias:              diasSeleccionados,
      horaApertura:      v.horaApertura!,
      horaCierre:        v.horaCierre!,
      intervalMinutos:   v.intervalMinutos!,
      arancelParticular: v.arancelParticular!,
    };

    this.saving.set(true);
    this.setupSvc.setup(data).subscribe({
      next: (consultorio) => {
        this.saving.set(false);
        if (v.precargarFinanciadores) {
          this.coberturaSvc.seedFinanciadores(consultorio.id, v.arancelParticular ?? undefined).subscribe({
            next: () => console.log('Financiadores precargados para consultorio', consultorio.id),
            error: (err) => console.warn('Seed de financiadores falló, recuperable desde admin', err),
          });
        }
        this.toast.success('¡Listo! Tu consultorio fue configurado correctamente.');
        this.completed.emit(consultorio.id);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }
}
