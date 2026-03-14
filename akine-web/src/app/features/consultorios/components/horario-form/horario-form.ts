import { ChangeDetectionStrategy, Component, inject, output, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  HORARIO_DIA_OPTIONS,
  HorarioDiaSeleccion,
} from '../../models/agenda.models';

export interface HorarioFormValue {
  diaSeleccion: HorarioDiaSeleccion;
  horaApertura: string;
  horaCierre: string;
}

@Component({
  selector: 'app-horario-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h3 class="panel-title">Configurar horario</h3>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Día</label>
            <select formControlName="diaSeleccion" #diaSelect>
              @for (d of dias; track d.key) {
                <option [value]="d.key">{{ d.label }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Hora de apertura</label>
            <input type="time" formControlName="horaApertura" />
          </div>
          <div class="field">
            <label>Hora de cierre</label>
            <input type="time" formControlName="horaCierre" />
          </div>
          <div class="actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-save" [disabled]="form.invalid">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); display: flex; align-items: flex-start; justify-content: center; padding-top: 5vh; z-index: 900; }
    .panel { background: var(--white); border-radius: var(--radius-lg); padding: 1.5rem; width: min(420px, 95vw); box-shadow: var(--shadow-lg); }
    .panel-title { margin-bottom: 1rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .9rem; }
    .field input, .field select { padding: .55rem .75rem; border: 1px solid var(--border); border-radius: var(--radius); }
    .actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }
    .btn-cancel { padding: .5rem 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--white); }
    .btn-save { padding: .5rem 1rem; border: none; border-radius: var(--radius); color: #fff; background: var(--primary); }
  `],
})
export class HorarioForm {
  saved = output<HorarioFormValue>();
  cancelled = output<void>();

  @ViewChild('diaSelect') diaSelect!: ElementRef<HTMLSelectElement>;

  private fb = inject(FormBuilder);
  dias = HORARIO_DIA_OPTIONS;

  form = this.fb.nonNullable.group({
    diaSeleccion: ['MONDAY' as HorarioDiaSeleccion, Validators.required],
    horaApertura: ['', Validators.required],
    horaCierre: ['', Validators.required],
  });

  ngAfterViewInit(): void {
    // Auto-focus en el select del día cuando el modal se abre
    this.diaSelect.nativeElement.focus();
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saved.emit(this.form.getRawValue());
  }
}
