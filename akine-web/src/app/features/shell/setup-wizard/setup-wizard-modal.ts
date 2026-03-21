import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { SetupWizardData, SetupWizardService } from './setup-wizard.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../core/error/error-mapper.service';
import { DayOfWeek } from '../../consultorios/models/agenda.models';

export const DIAS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'MONDAY',    label: 'Lunes',      short: 'Lu' },
  { key: 'TUESDAY',   label: 'Martes',     short: 'Ma' },
  { key: 'WEDNESDAY', label: 'Miércoles',  short: 'Mi' },
  { key: 'THURSDAY',  label: 'Jueves',     short: 'Ju' },
  { key: 'FRIDAY',    label: 'Viernes',    short: 'Vi' },
  { key: 'SATURDAY',  label: 'Sábado',     short: 'Sa' },
  { key: 'SUNDAY',    label: 'Domingo',    short: 'Do' },
];

function atLeastOneDaySelected(control: AbstractControl): ValidationErrors | null {
  const group = control as ReturnType<FormBuilder['group']>;
  const anyChecked = DIAS.some((d) => group.get(d.key)?.value === true);
  return anyChecked ? null : { noDaySelected: true };
}

@Component({
  selector: 'app-setup-wizard-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './setup-wizard-modal.html',
  styleUrl: './setup-wizard-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupWizardModal {
  private readonly fb = inject(FormBuilder);
  private readonly setupSvc = inject(SetupWizardService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly completed = output<string>();
  readonly dismissed = output<void>();
  readonly saving = signal(false);
  readonly DIAS = DIAS;

  readonly form = this.fb.group({
    consultorioNombre: ['', [Validators.required, Validators.maxLength(100)]],
    boxNombre: ['Box 1', [Validators.required, Validators.maxLength(50)]],
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
    horaApertura: ['08:00', [Validators.required]],
    horaCierre: ['20:00', [Validators.required]],
    intervalMinutos: [30, [Validators.required]],
  });

  readonly INTERVAL_OPTIONS: { value: number; label: string }[] = [
    { value: 15, label: '15 minutos' },
    { value: 20, label: '20 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '60 minutos' },
  ];

  isDiaChecked(key: DayOfWeek): boolean {
    return this.form.get('dias')?.get(key)?.value === true;
  }

  get diasInvalid(): boolean {
    const g = this.form.get('dias');
    return !!(g?.invalid && g?.touched);
  }

  confirm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const v = this.form.getRawValue();
    const diasSeleccionados: DayOfWeek[] = DIAS
      .filter((d) => v.dias[d.key as keyof typeof v.dias])
      .map((d) => d.key);

    const data: SetupWizardData = {
      consultorioNombre: v.consultorioNombre!,
      boxNombre: v.boxNombre!,
      dias: diasSeleccionados,
      horaApertura: v.horaApertura!,
      horaCierre: v.horaCierre!,
      intervalMinutos: v.intervalMinutos!,
    };

    this.saving.set(true);
    this.setupSvc.setup(data).subscribe({
      next: (consultorio) => {
        this.saving.set(false);
        this.toast.success('¡Listo! Tu consultorio fue configurado correctamente.');
        this.completed.emit(consultorio.id);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
