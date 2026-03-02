import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PacienteRequest } from '../../models/paciente.models';

@Component({
  selector: 'app-paciente-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="grid">
        <div class="field">
          <label>DNI *</label>
          <input formControlName="dni" placeholder="30111222" />
        </div>
        <div class="field">
          <label>Telefono *</label>
          <input formControlName="telefono" placeholder="1155554444" />
        </div>
        <div class="field">
          <label>Nombre *</label>
          <input formControlName="nombre" placeholder="Nombre" />
        </div>
        <div class="field">
          <label>Apellido *</label>
          <input formControlName="apellido" placeholder="Apellido" />
        </div>
      </div>

      <div class="field">
        <label>Email</label>
        <input formControlName="email" type="email" placeholder="mail@ejemplo.com" />
      </div>

      <div class="actions">
        <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
        <button type="submit" class="btn-save" [disabled]="form.invalid">Guardar</button>
      </div>
    </form>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .9rem; }
    .field label { font-size: .85rem; color: var(--text-muted); font-weight: 600; }
    .field input {
      padding: .55rem .75rem; border: 1px solid var(--border); border-radius: var(--radius);
      outline: none; font-size: .95rem;
    }
    .field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
    .actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }
    .btn-cancel {
      padding: .5rem 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--white);
      cursor: pointer;
    }
    .btn-save {
      padding: .5rem 1rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; font-weight: 600; cursor: pointer;
    }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class PacienteForm {
  initialDni = input<string>('');
  saved = output<PacienteRequest>();
  cancelled = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{7,10}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    if (this.initialDni()) {
      this.form.patchValue({ dni: this.initialDni() });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saved.emit({
      dni: v.dni,
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono,
      email: v.email || undefined,
    });
  }
}
