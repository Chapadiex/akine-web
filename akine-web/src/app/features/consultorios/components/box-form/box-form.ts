import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Box, BoxRequest, BoxTipo } from '../../models/consultorio.models';

@Component({
  selector: 'app-box-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h3 class="panel-title">{{ editItem() ? 'Editar' : 'Nuevo' }} Box</h3>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Nombre *</label>
            <input formControlName="nombre" placeholder="Ej: Box 1" />
          </div>
          <div class="field">
            <label>Tipo *</label>
            <select formControlName="tipo">
              <option value="BOX">Box</option>
              <option value="GIMNASIO">Gimnasio</option>
              <option value="OFICINA">Oficina</option>
            </select>
          </div>

          @if (editItem()) {
            <div class="field">
              <label>Estado</label>
              <button
                type="button"
                class="toggle"
                role="switch"
                [attr.aria-checked]="form.controls.activo.value"
                [attr.aria-label]="form.controls.activo.value ? 'Marcar box como inactivo' : 'Marcar box como activo'"
                [class.toggle-on]="form.controls.activo.value"
                (click)="toggleActivo()"
              >
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
                <span class="toggle-text">{{ form.controls.activo.value ? 'Activo' : 'Inactivo' }}</span>
              </button>
            </div>
          }

          <div class="actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-save" [disabled]="form.invalid">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 5vh; z-index: 900;
    }
    .panel {
      background: var(--white); border-radius: var(--radius-lg);
      padding: 1.75rem; width: min(420px, 95vw);
      box-shadow: var(--shadow-lg);
    }
    .panel-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1.25rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: 1rem; }
    .field label { font-size: .85rem; font-weight: 600; color: var(--text-muted); }
    .field input, .field select {
      padding: .55rem .75rem; border: 1px solid var(--border);
      border-radius: var(--radius); font-size: .95rem; outline: none;
      background: var(--white);
    }
    .field input:focus, .field select:focus {
      border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }
    .toggle {
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--white);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      gap: .6rem;
      padding: .35rem .6rem .35rem .4rem;
      cursor: pointer;
      width: fit-content;
    }
    .toggle-track {
      width: 38px;
      height: 22px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--text-muted) 25%, var(--border));
      position: relative;
      transition: background .15s ease;
    }
    .toggle-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      position: absolute;
      left: 3px;
      top: 3px;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
      transition: left .15s ease;
    }
    .toggle-on .toggle-track {
      background: color-mix(in srgb, var(--success) 60%, var(--primary));
    }
    .toggle-on .toggle-thumb {
      left: 19px;
    }
    .toggle-text {
      font-size: .86rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .toggle-on .toggle-text {
      color: var(--success);
    }
    .btn-cancel {
      padding: .5rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white); cursor: pointer;
    }
    .btn-save {
      padding: .5rem 1.25rem; border: none;
      border-radius: var(--radius); background: var(--primary);
      color: #fff; font-weight: 600; cursor: pointer;
    }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class BoxForm implements OnInit {
  editItem  = input<Box | null>(null);
  saved     = output<BoxRequest>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo:   ['BOX' as BoxTipo, Validators.required],
    activo: [true],
  });

  ngOnInit(): void {
    const item = this.editItem();
    if (!item) return;
    this.form.patchValue({
      nombre: item.nombre,
      tipo: item.tipo,
      activo: item.activo,
    });
  }

  toggleActivo(): void {
    const current = this.form.controls.activo.value;
    this.form.controls.activo.setValue(!current);
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saved.emit({
      nombre: v.nombre,
      // El codigo se conserva para no perder datos historicos al editar.
      codigo: this.editItem()?.codigo || undefined,
      tipo:   v.tipo,
      activo: v.activo,
    });
  }
}
