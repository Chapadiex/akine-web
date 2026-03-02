import { ChangeDetectionStrategy, Component, input, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BoxCapacidadTipo } from '../../models/agenda.models';

export interface BoxCapacidadPayload {
  capacityType: BoxCapacidadTipo;
  capacity?: number;
}

@Component({
  selector: 'app-box-capacidad-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h3 class="panel-title">Configurar capacidad</h3>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Tipo</label>
            <select formControlName="capacityType">
              <option value="UNLIMITED">Sin limite</option>
              <option value="LIMITED">Limitada</option>
            </select>
          </div>
          @if (form.controls.capacityType.value === 'LIMITED') {
            <div class="field">
              <label>Capacidad</label>
              <input type="number" min="1" formControlName="capacity" />
            </div>
          }
          <div class="actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-save">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); display: flex; align-items: flex-start; justify-content: center; padding-top: 5vh; z-index: 900; }
    .panel { background: var(--white); border-radius: var(--radius-lg); padding: 1.5rem; width: min(420px, 95vw); box-shadow: var(--shadow-lg); }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .9rem; }
    .field input, .field select { padding: .55rem .75rem; border: 1px solid var(--border); border-radius: var(--radius); }
    .actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }
    .btn-cancel { padding: .5rem 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--white); }
    .btn-save { padding: .5rem 1rem; border: none; border-radius: var(--radius); color: #fff; background: var(--primary); }
  `],
})
export class BoxCapacidadForm {
  capacityType = input<BoxCapacidadTipo>('UNLIMITED');
  capacity = input<number | undefined>(undefined);
  saved = output<BoxCapacidadPayload>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);
  form = this.fb.group({
    capacityType: this.fb.nonNullable.control<BoxCapacidadTipo>('UNLIMITED', Validators.required),
    capacity: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    this.form.patchValue({
      capacityType: this.capacityType(),
      capacity: this.capacity() ?? null,
    });
  }

  submit(): void {
    const v = this.form.getRawValue();
    this.saved.emit({
      capacityType: v.capacityType!,
      capacity: v.capacity ?? undefined,
    });
  }
}
