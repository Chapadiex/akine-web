import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import { PacienteRequest } from '../../models/paciente.models';
import { PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-paciente-quick-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">

      <!-- Fila 1: DNI -->
      <div class="field">
        <label for="qf-dni">DNI *</label>
        <div class="input-wrap">
          <input
            id="qf-dni"
            formControlName="dni"
            inputmode="numeric"
            placeholder="30111222"
            autocomplete="off"
            [class.field-error]="form.controls.dni.invalid && form.controls.dni.touched"
          />
          @if (form.controls.dni.pending) {
            <span class="input-hint">Verificando...</span>
          }
        </div>
        @if (form.controls.dni.touched) {
          @if (form.controls.dni.hasError('required')) {
            <span class="error-msg">El DNI es obligatorio.</span>
          } @else if (form.controls.dni.hasError('pattern')) {
            <span class="error-msg">El DNI debe tener entre 7 y 10 d&iacute;gitos.</span>
          } @else if (form.controls.dni.hasError('dniDuplicado')) {
            <span class="error-msg">Ya existe un paciente con ese DNI en este consultorio.</span>
          }
        }
      </div>

      <!-- Fila 2: Apellido | Nombre -->
      <div class="row-2">
        <div class="field">
          <label for="qf-apellido">Apellido *</label>
          <input
            id="qf-apellido"
            formControlName="apellido"
            placeholder="Apellido"
            [class.field-error]="form.controls.apellido.invalid && form.controls.apellido.touched"
          />
          @if (form.controls.apellido.touched && form.controls.apellido.hasError('required')) {
            <span class="error-msg">El apellido es obligatorio.</span>
          }
        </div>
        <div class="field">
          <label for="qf-nombre">Nombre *</label>
          <input
            id="qf-nombre"
            formControlName="nombre"
            placeholder="Nombre"
            [class.field-error]="form.controls.nombre.invalid && form.controls.nombre.touched"
          />
          @if (form.controls.nombre.touched && form.controls.nombre.hasError('required')) {
            <span class="error-msg">El nombre es obligatorio.</span>
          }
        </div>
      </div>

      <!-- Fila 3: Teléfono | Email -->
      <div class="row-2">
        <div class="field">
          <label for="qf-telefono">Tel&eacute;fono *</label>
          <input
            id="qf-telefono"
            formControlName="telefono"
            type="tel"
            inputmode="tel"
            placeholder="1155554444"
            [class.field-error]="form.controls.telefono.invalid && form.controls.telefono.touched"
          />
          @if (form.controls.telefono.touched && form.controls.telefono.hasError('required')) {
            <span class="error-msg">El tel&eacute;fono es obligatorio.</span>
          }
          @if (form.controls.telefono.touched && form.controls.telefono.hasError('pattern')) {
            <span class="error-msg">Solo n&uacute;meros, entre 7 y 15 d&iacute;gitos.</span>
          }
        </div>
        <div class="field">
          <label for="qf-email">Email</label>
          <input
            id="qf-email"
            formControlName="email"
            type="email"
            inputmode="email"
            placeholder="mail@ejemplo.com"
            [class.field-error]="form.controls.email.invalid && form.controls.email.touched"
          />
          @if (form.controls.email.touched && form.controls.email.hasError('email')) {
            <span class="error-msg">Ingrese un email v&aacute;lido.</span>
          }
        </div>
      </div>

      <!-- Fila 4: Tiene obra social -->
      <div class="field-toggle">
        <label class="toggle-label">
          <input
            type="checkbox"
            [checked]="tieneObraSocial()"
            (change)="onToggleObraSocial()"
          />
          <span>Tiene obra social</span>
        </label>
      </div>

      <!-- Filas 5-6: Bloque cobertura (condicional) -->
      @if (tieneObraSocial()) {
        <div class="os-block">
          <!-- Fila 5: Obra social | Plan -->
          <div class="row-2">
            <div class="field">
              <label for="qf-obraSocial">Obra social *</label>
              <input
                id="qf-obraSocial"
                formControlName="obraSocialNombre"
                placeholder="Nombre de obra social"
                [class.field-error]="form.controls.obraSocialNombre.invalid && form.controls.obraSocialNombre.touched"
              />
              @if (form.controls.obraSocialNombre.touched && form.controls.obraSocialNombre.hasError('required')) {
                <span class="error-msg">La obra social es obligatoria.</span>
              }
            </div>
            <div class="field">
              <label for="qf-plan">Plan</label>
              <input
                id="qf-plan"
                formControlName="obraSocialPlan"
                placeholder="Plan"
              />
            </div>
          </div>
          <!-- Fila 6: Nro. afiliado -->
          <div class="field">
            <label for="qf-nroAfiliado">Nro. afiliado</label>
            <input
              id="qf-nroAfiliado"
              formControlName="obraSocialNroAfiliado"
              placeholder="N&uacute;mero de afiliado"
            />
          </div>
        </div>
      }

      @if (confirmCancel()) {
        <div class="cancel-confirm">
          <span class="cancel-confirm__text">¿Descartar los cambios?</span>
          <div class="cancel-confirm__actions">
            <button type="button" class="btn-cancel" (click)="confirmCancel.set(false)">Seguir editando</button>
            <button type="button" class="btn-discard" (click)="cancelled.emit()">Descartar</button>
          </div>
        </div>
      } @else {
        <div class="actions">
          <button type="button" class="btn-cancel" (click)="requestCancel()">Cancelar</button>
          <button type="submit" class="btn-save" [disabled]="form.invalid || form.pending">
            Guardar
          </button>
        </div>
      }
    </form>
  `,
  styles: [`
    .field {
      display: flex; flex-direction: column; gap: .35rem; margin-bottom: .75rem;
    }
    .field label { font-size: .85rem; color: var(--text-muted); font-weight: 600; }
    .field input {
      padding: .55rem .75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      outline: none;
      font-size: .95rem;
      font-family: inherit;
      background: var(--white);
    }
    .field input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .field-error {
      border-color: #e53e3e !important;
      background: color-mix(in srgb, #e53e3e 4%, var(--white)) !important;
    }
    .field-error:focus {
      border-color: #e53e3e !important;
      box-shadow: 0 0 0 3px color-mix(in srgb, #e53e3e 18%, transparent) !important;
    }
    .error-msg {
      font-size: .78rem; color: #c53030; font-weight: 500;
    }
    .input-wrap { position: relative; }
    .input-wrap input { width: 100%; box-sizing: border-box; }
    .input-hint {
      position: absolute; right: .65rem; top: 50%; transform: translateY(-50%);
      font-size: .75rem; color: var(--text-muted); pointer-events: none;
    }
    .row-2 {
      display: grid; grid-template-columns: 1fr 1fr; gap: .75rem;
    }
    .field-toggle { margin-bottom: .75rem; }
    .toggle-label {
      display: inline-flex; align-items: center; gap: .5rem;
      font-size: .9rem; color: var(--text); cursor: pointer; font-weight: 500;
    }
    .toggle-label input[type="checkbox"] {
      accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer;
    }
    .os-block {
      background: color-mix(in srgb, var(--bg) 40%, var(--white));
      border: 1px solid color-mix(in srgb, var(--border) 80%, var(--primary) 20%);
      border-radius: var(--radius);
      padding: .75rem .75rem .1rem;
      margin-bottom: .75rem;
    }
    .actions {
      display: flex; gap: .75rem; justify-content: flex-end; margin-top: .5rem;
    }
    .btn-cancel {
      padding: .5rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white); cursor: pointer;
      font-size: .9rem; font-family: inherit;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-save {
      padding: .5rem 1rem; border: none;
      border-radius: var(--radius); background: var(--primary);
      color: #fff; cursor: pointer; font-size: .9rem; font-weight: 600;
      font-family: inherit;
    }
    .btn-save:hover { opacity: .9; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    .btn-discard {
      padding: .5rem 1rem; border: 1px solid #e53e3e;
      border-radius: var(--radius); background: #e53e3e;
      color: #fff; cursor: pointer; font-size: .9rem; font-weight: 600;
      font-family: inherit;
    }
    .btn-discard:hover { opacity: .88; }
    .cancel-confirm {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap;
      border-top: 1px solid var(--border); padding-top: .75rem; margin-top: .5rem;
    }
    .cancel-confirm__text {
      font-size: .9rem; color: var(--text); font-weight: 500;
    }
    .cancel-confirm__actions {
      display: flex; gap: .75rem;
    }
    @media (max-width: 480px) {
      .row-2 { grid-template-columns: 1fr; gap: 0; }
      .cancel-confirm { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class PacienteQuickForm implements AfterViewInit {
  consultorioId = input<string>('');
  initialDni = input<string>('');
  saved = output<PacienteRequest>();
  cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly tieneObraSocial = signal(false);
  readonly confirmCancel = signal(false);

  readonly form = this.fb.nonNullable.group({
    dni: [
      '',
      [Validators.required, Validators.pattern(/^[0-9]{7,10}$/)],
      [this.dniAsyncValidator()],
    ],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    obraSocialNombre: [''],
    obraSocialPlan: [''],
    obraSocialNroAfiliado: [''],
  });

  constructor() {
    effect(() => {
      const dni = this.initialDni();
      if (dni) {
        this.form.patchValue({ dni }, { emitEvent: false });
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const dniInput = this.el.nativeElement.querySelector('#qf-dni') as HTMLInputElement;
      dniInput?.focus();
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmCancel()) {
      this.confirmCancel.set(false);
      return;
    }
    this.requestCancel();
  }

  requestCancel(): void {
    if (this.form.dirty) {
      this.confirmCancel.set(true);
    } else {
      this.cancelled.emit();
    }
  }

  onToggleObraSocial(): void {
    const next = !this.tieneObraSocial();
    this.tieneObraSocial.set(next);

    if (next) {
      this.form.controls.obraSocialNombre.addValidators(Validators.required);
      this.form.controls.obraSocialNombre.updateValueAndValidity();
      setTimeout(() => {
        const input = this.el.nativeElement.querySelector('#qf-obraSocial') as HTMLInputElement;
        input?.focus();
      });
    } else {
      this.form.controls.obraSocialNombre.removeValidators(Validators.required);
      this.form.controls.obraSocialNombre.setValue('');
      this.form.controls.obraSocialPlan.setValue('');
      this.form.controls.obraSocialNroAfiliado.setValue('');
      this.form.controls.obraSocialNombre.updateValueAndValidity();
    }
  }

  submit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const withOs = this.tieneObraSocial();
    this.saved.emit({
      dni: v.dni,
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono,
      email: this.toOptional(v.email),
      obraSocialNombre: withOs ? this.toOptional(v.obraSocialNombre) : undefined,
      obraSocialPlan: withOs ? this.toOptional(v.obraSocialPlan) : undefined,
      obraSocialNroAfiliado: withOs ? this.toOptional(v.obraSocialNroAfiliado) : undefined,
    });
  }

  private dniAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const cid = this.consultorioId();
      if (!cid || !control.value) return of(null);
      return timer(400).pipe(
        switchMap(() => this.pacienteSvc.search(cid, control.value as string)),
        map((results) => (results.length > 0 ? { dniDuplicado: true } : null)),
        catchError(() => of(null)),
      );
    };
  }

  private toOptional(value: string): string | undefined {
    return value?.trim() || undefined;
  }
}
