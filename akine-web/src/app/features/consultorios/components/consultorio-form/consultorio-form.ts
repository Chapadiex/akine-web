import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Consultorio, ConsultorioRequest } from '../../models/consultorio.models';

@Component({
  selector: 'app-consultorio-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h3 class="panel-title">{{ editItem() ? 'Editar' : 'Nuevo' }} Consultorio</h3>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label>Nombre *</label>
            <input formControlName="name" placeholder="Ej: Consultorio Central" />
          </div>
          <div class="field">
            <label>CUIT</label>
            <input formControlName="cuit" placeholder="20-12345678-9" />
          </div>
          <div class="field">
            <label>Domicilio</label>
            <input formControlName="address" placeholder="Av. Siempreviva 123" />
          </div>
          <div class="field">
            <label>Teléfono</label>
            <input formControlName="phone" placeholder="1155550000" />
          </div>
          <div class="field">
            <label>Email</label>
            <input formControlName="email" type="email" placeholder="info@consultorio.com" />
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
    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 5vh; z-index: 900;
    }
    .panel {
      background: var(--white); border-radius: var(--radius-lg);
      padding: 1.75rem; width: min(480px, 95vw);
      box-shadow: var(--shadow-lg);
    }
    .panel-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1.25rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: 1rem; }
    .field label { font-size: .85rem; font-weight: 600; color: var(--text-muted); }
    .field input {
      padding: .55rem .75rem; border: 1px solid var(--border);
      border-radius: var(--radius); font-size: .95rem;
      outline: none;
    }
    .field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
    .actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }
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
export class ConsultorioForm implements OnInit {
  editItem = input<Consultorio | null>(null);
  saved    = output<ConsultorioRequest>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    name:    ['', Validators.required],
    cuit:    [''],
    address: [''],
    phone:   [''],
    email:   [''],
  });

  ngOnInit(): void {
    const item = this.editItem();
    if (item) {
      this.form.patchValue({
        name:    item.name,
        cuit:    item.cuit    ?? '',
        address: item.address ?? '',
        phone:   item.phone   ?? '',
        email:   item.email   ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saved.emit({
      name:    v.name,
      cuit:    v.cuit    || undefined,
      address: v.address || undefined,
      phone:   v.phone   || undefined,
      email:   v.email   || undefined,
    });
  }
}
