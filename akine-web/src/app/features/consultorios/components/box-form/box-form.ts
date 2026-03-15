import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BoxCapacidadTipo } from '../../models/agenda.models';
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
            <input #nombreInput formControlName="nombre" placeholder="Ej: Box 1" />
            @if (showError('nombre', 'required')) {
              <p class="field-error">El nombre es obligatorio.</p>
            }
          </div>

          <div class="grid-two">
            <div class="field">
              <label>Tipo *</label>
              <select formControlName="tipo">
                <option value="BOX">Box</option>
                <option value="GIMNASIO">Gimnasio</option>
                <option value="OFICINA">Oficina</option>
              </select>
            </div>

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
          </div>

          <section class="capacity-block">
            <div class="capacity-block__header">
              <h4>Capacidad</h4>
              <p>Definí cómo se comporta el box frente a turnos superpuestos.</p>
            </div>

            <div class="capacity-grid">
              <div class="field">
                <label>Tipo de capacidad *</label>
                <select formControlName="capacityType">
                  <option value="UNLIMITED">Ilimitada</option>
                  <option value="LIMITED">Limitada</option>
                </select>
              </div>

              @if (isLimited()) {
                <div class="field">
                  <label>Capacidad *</label>
                  <input type="number" min="1" step="1" inputmode="numeric" formControlName="capacity" />
                  @if (showError('capacity', 'required')) {
                    <p class="field-error">La capacidad es obligatoria cuando el box es limitado.</p>
                  } @else if (showError('capacity', 'min') || showError('capacity', 'pattern')) {
                    <p class="field-error">La capacidad debe ser un número entero mayor o igual a 1.</p>
                  }
                </div>
              }
            </div>

            <div class="capacity-help" [class.capacity-help--limited]="isLimited()">
              @if (isLimited()) {
                <strong>Limitada:</strong> permite hasta la cantidad configurada.
              } @else {
                <strong>Ilimitada:</strong> permite turnos superpuestos sin límite.
              }
            </div>
          </section>

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
      padding: 1.5rem; width: min(520px, 95vw);
      box-shadow: var(--shadow-lg);
    }
    .panel-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1.25rem; }
    .grid-two {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .9rem;
    }
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
    .field-error {
      margin: 0;
      font-size: .78rem;
      color: var(--danger, #c53030);
    }
    .capacity-block {
      margin-top: .15rem;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--bg) 72%, var(--white));
    }
    .capacity-block__header h4 {
      margin: 0 0 .25rem;
      font-size: .95rem;
      font-weight: 700;
    }
    .capacity-block__header p {
      margin: 0 0 1rem;
      font-size: .82rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .capacity-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .9rem;
      align-items: start;
    }
    .capacity-help {
      margin: -.15rem 0 1rem;
      padding: .7rem .8rem;
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--bg) 85%, var(--white));
      color: var(--text);
      font-size: .82rem;
      line-height: 1.4;
    }
    .capacity-help--limited {
      background: color-mix(in srgb, var(--warning-bg, #fff4db) 78%, var(--white));
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
    @media (max-width: 640px) {
      .grid-two { grid-template-columns: 1fr; }
      .capacity-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class BoxForm implements OnInit, AfterViewInit {
  editItem  = input<Box | null>(null);
  saved     = output<BoxRequest>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private nombreInput = viewChild<ElementRef<HTMLInputElement>>('nombreInput');
  protected submitted = signal(false);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: ['BOX' as BoxTipo, Validators.required],
    capacityType: ['UNLIMITED' as BoxCapacidadTipo, Validators.required],
    capacity: [''],
    activo: [true],
  });

  ngOnInit(): void {
    this.form.controls.capacityType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((capacityType) => this.syncCapacityValidators(capacityType));

    const item = this.editItem();
    if (item) {
      this.form.patchValue({
        nombre: item.nombre,
        tipo: item.tipo,
        capacityType: item.capacityType,
        capacity: item.capacity != null ? String(item.capacity) : '',
        activo: item.activo,
      });
    }

    this.syncCapacityValidators(this.form.controls.capacityType.value);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.nombreInput()?.nativeElement.focus());
  }

  toggleActivo(): void {
    this.form.controls.activo.setValue(!this.form.controls.activo.value);
  }

  isLimited(): boolean {
    return this.form.controls.capacityType.value === 'LIMITED';
  }

  showError(controlName: 'nombre' | 'capacity', errorKey: string): boolean {
    const control = this.form.controls[controlName];
    return !!control.errors?.[errorKey] && (control.touched || this.submitted());
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    this.saved.emit({
      nombre: value.nombre.trim(),
      codigo: this.editItem()?.codigo || undefined,
      tipo: value.tipo,
      capacityType: value.capacityType,
      capacity: value.capacityType === 'LIMITED' ? Number(value.capacity) : undefined,
      activo: value.activo,
    });
  }

  private syncCapacityValidators(capacityType: BoxCapacidadTipo): void {
    if (capacityType === 'LIMITED') {
      this.form.controls.capacity.setValidators([
        Validators.required,
        Validators.pattern(/^[1-9]\d*$/),
        Validators.min(1),
      ]);
    } else {
      this.form.controls.capacity.setValue('');
      this.form.controls.capacity.clearValidators();
    }

    this.form.controls.capacity.updateValueAndValidity({ emitEvent: false });
  }
}
