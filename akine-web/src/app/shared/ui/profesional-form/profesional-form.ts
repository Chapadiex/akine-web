import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EspecialidadService } from '../../../features/consultorios/services/especialidad.service';

export interface ProfesionalFormEditValue {
  nombre?: string;
  apellido?: string;
  nroDocumento?: string;
  email?: string;
  matricula?: string;
  telefono?: string;
  domicilio?: string;
  especialidades?: string[];
  activo?: boolean;
  fechaBaja?: string;
  motivoBaja?: string;
}

export interface ProfesionalFormResult {
  nombre: string;
  apellido: string;
  nroDocumento: string;
  email: string;
  matricula?: string;
  telefono?: string;
  domicilio?: string;
  especialidades: string[];
  modoAlta: 'DIRECTA' | 'INVITACION';
  activo: boolean;
  fechaDeBaja?: string;
  motivoDeBaja?: string;
}

type Modo = 'rapida' | 'completa';
type Acceso = 'invitar' | 'sin_acceso';

@Component({
  selector: 'app-profesional-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="cancelled.emit()">
      <section class="modal" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div>
            <h2>{{ editValue() ? 'Editar profesional' : 'Agregar profesional' }}</h2>
            @if (!editValue()) {
              <p class="modal-subtitle">
                {{ modo() === 'rapida' ? 'Completá solo los datos obligatorios.' : 'Agregá también datos opcionales del perfil.' }}
              </p>
            }
          </div>
          <button class="icon-close" type="button" (click)="cancelled.emit()">×</button>
        </header>

        <!-- Selector de modo compacto (solo en alta) -->
        @if (!editValue()) {
          <div class="mode-tabs">
            <button
              type="button"
              class="mode-tab"
              [class.active]="modo() === 'rapida'"
              (click)="setModo('rapida')"
            >Rápida</button>
            <button
              type="button"
              class="mode-tab"
              [class.active]="modo() === 'completa'"
              (click)="setModo('completa')"
            >Completa</button>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (showEstado() && submitted() && !form.controls.activo.value
              && (!form.controls.fechaBaja.value || !form.controls.motivoBaja.value.trim())) {
            <div class="form-alert">Si el profesional está inactivo, completá la fecha y el motivo de baja.</div>
          }

          <!-- Datos obligatorios (siempre visibles) -->
          <div class="form-grid">
            <label class="field">
              <span>Nombre <em class="req">*</em></span>
              <input formControlName="nombre" placeholder="Nombre"
                [class.input-invalid]="isInvalid('nombre')" />
              @if (isInvalid('nombre') && form.controls.nombre.hasError('required')) {
                <small class="field-error">El nombre es obligatorio.</small>
              }
            </label>
            <label class="field">
              <span>Apellido <em class="req">*</em></span>
              <input formControlName="apellido" placeholder="Apellido"
                [class.input-invalid]="isInvalid('apellido')" />
              @if (isInvalid('apellido') && form.controls.apellido.hasError('required')) {
                <small class="field-error">El apellido es obligatorio.</small>
              }
            </label>
            <label class="field">
              <span>Email <em class="req">*</em></span>
              <input formControlName="email" type="email" placeholder="profesional@mail.com"
                inputmode="email" [class.input-invalid]="isInvalid('email')" />
              @if (isInvalid('email')) {
                <small class="field-error">
                  @if (form.controls.email.hasError('required')) { El email es obligatorio. }
                  @else if (form.controls.email.hasError('duplicate')) { Ya existe un profesional con este email. }
                  @else { Email inválido. }
                </small>
              }
            </label>
            <label class="field">
              <span>DNI <em class="req">*</em></span>
              <input formControlName="nroDocumento" placeholder="30111222" inputmode="numeric"
                [class.input-invalid]="isInvalid('nroDocumento')" />
              @if (isInvalid('nroDocumento')) {
                <small class="field-error">
                  @if (form.controls.nroDocumento.hasError('required')) { El DNI es obligatorio. }
                  @else { El DNI debe tener entre 7 y 10 dígitos. }
                </small>
              }
            </label>
          </div>

          <!-- Especialidades (siempre visible, opcional) -->
          <div class="field">
            <span>Especialidades</span>
            <div class="chips-row">
              @for (e of especialidades(); track e) {
                <span class="chip">
                  {{ e }}
                  <button type="button" class="chip-remove" (click)="removeEspecialidad(e)"
                    [attr.aria-label]="'Remover ' + e">×</button>
                </span>
              }
            </div>
            <div class="combobox" (click)="$event.stopPropagation()">
              <input
                class="combobox-input"
                [value]="especialidadInput()"
                (input)="onInputChange($any($event.target).value)"
                (focus)="dropdownOpen.set(true)"
                (keydown.enter)="$event.preventDefault(); selectFirst()"
                (keydown.escape)="dropdownOpen.set(false)"
                placeholder="Buscar o escribir especialidad..."
              />
              @if (dropdownOpen() && filteredOptions().length > 0) {
                <ul class="dropdown" role="listbox">
                  @for (opt of filteredOptions(); track opt.id) {
                    <li role="option"
                      (mousedown)="$event.preventDefault(); addFromCatalog(opt.nombre)">{{ opt.nombre }}</li>
                  }
                </ul>
              }
              @if (dropdownOpen() && filteredOptions().length === 0 && especialidadInput().trim()) {
                <div class="dropdown dropdown-hint">
                  <span>Presioná Enter para agregar "{{ especialidadInput().trim() }}"</span>
                </div>
              }
            </div>
          </div>

          <!-- Datos opcionales (solo en completa o edición) -->
          @if (mostrarOpcionales()) {
            <div class="section-divider">Datos opcionales</div>
            <div class="form-grid">
              <label class="field">
                <span>Matrícula</span>
                <input formControlName="matricula" placeholder="Ej: MP-1234" />
              </label>
              <label class="field">
                <span>Teléfono</span>
                <input formControlName="telefono" type="tel" placeholder="1155554444"
                  inputmode="tel" [class.input-invalid]="isInvalid('telefono')" />
                @if (isInvalid('telefono') && form.controls.telefono.hasError('pattern')) {
                  <small class="field-error">Teléfono inválido.</small>
                }
              </label>
              <label class="field field-full">
                <span>Dirección</span>
                <input formControlName="domicilio" placeholder="Calle, número, localidad" />
              </label>
            </div>
          }

          <!-- Acceso (solo en alta) -->
          @if (!editValue()) {
            <div class="field">
              <span>Acceso al sistema</span>
              <div class="access-inline" role="radiogroup" aria-label="Acceso al sistema">
                <label class="access-choice" [class.selected]="acceso() === 'invitar'">
                  <input
                    type="radio"
                    name="acceso_pf"
                    [checked]="acceso() === 'invitar'"
                    (change)="acceso.set('invitar')"
                  />
                  <span class="access-choice-radio" aria-hidden="true"></span>
                  <span>Invitar al sistema</span>
                </label>
                <span class="access-divider" aria-hidden="true">|</span>
                <label class="access-choice" [class.selected]="acceso() === 'sin_acceso'">
                  <input
                    type="radio"
                    name="acceso_pf"
                    [checked]="acceso() === 'sin_acceso'"
                    (change)="acceso.set('sin_acceso')"
                  />
                  <span class="access-choice-radio" aria-hidden="true"></span>
                  <span>Agregar sin acceso</span>
                </label>
                <span class="access-divider" aria-hidden="true">|</span>
                <small class="access-hint">
                  @if (acceso() === 'invitar') { Recibirá un email para crear su cuenta. }
                  @else { Podrás habilitarlo más adelante desde su perfil. }
                </small>
              </div>
            </div>
          }

          <!-- Estado (solo edición con showEstado) -->
          @if (showEstado()) {
            <div class="section-divider">Estado</div>
            <button
              type="button"
              class="toggle"
              role="switch"
              [attr.aria-checked]="form.controls.activo.value"
              [attr.aria-label]="form.controls.activo.value ? 'Marcar profesional como inactivo' : 'Marcar profesional como activo'"
              [class.toggle-on]="form.controls.activo.value"
              (click)="toggleActivo()"
            >
              <span class="toggle-track" aria-hidden="true">
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-copy">
                <strong>{{ form.controls.activo.value ? 'Activo' : 'Inactivo' }}</strong>
                <small>Estado del profesional</small>
              </span>
            </button>
            @if (!form.controls.activo.value) {
              <div class="form-grid" style="margin-top:.6rem">
                <label class="field">
                  <span>Fecha de baja <em class="req">*</em></span>
                  <input formControlName="fechaBaja" type="date"
                    [class.input-invalid]="submitted() && !form.controls.fechaBaja.value" />
                  @if (submitted() && !form.controls.fechaBaja.value) {
                    <small class="field-error">La fecha de baja es obligatoria.</small>
                  }
                </label>
                <label class="field">
                  <span>Motivo de baja <em class="req">*</em></span>
                  <input formControlName="motivoBaja" placeholder="Motivo"
                    [class.input-invalid]="submitted() && !form.controls.motivoBaja.value.trim()" />
                  @if (submitted() && !form.controls.motivoBaja.value.trim()) {
                    <small class="field-error">El motivo de baja es obligatorio.</small>
                  }
                </label>
              </div>
            }
          }

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-save" [disabled]="saving()">
              {{ saving() ? 'Guardandoâ€¦' : ctaLabel() }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0;
      background: color-mix(in srgb, #0c172a 55%, transparent);
      display: grid; place-items: center; z-index: 900; padding: 1rem;
    }
    .modal {
      width: min(740px, 100%);
      max-height: calc(100dvh - 2rem);
      overflow: auto;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg) + 2px);
      box-shadow: var(--shadow-lg);
      padding: 1.1rem 1.2rem 1rem;
      display: flex;
      flex-direction: column;
      gap: .75rem;
      animation: modal-enter .2s ease;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: flex-start; gap: .8rem;
    }
    .modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .modal-subtitle { margin: .15rem 0 0; font-size: .8rem; color: var(--text-muted); }
    .icon-close {
      flex-shrink: 0; width: 2rem; height: 2rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--white);
      color: var(--text); cursor: pointer; font-size: 1.1rem; line-height: 1;
    }
    .icon-close:hover { background: var(--bg); }

    /* Compact mode tabs */
    .mode-tabs {
      display: inline-flex;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--white);
      align-self: flex-start;
    }
    .mode-tab {
      padding: .4rem 1.1rem;
      border: none; border-right: 1px solid var(--border);
      background: transparent; cursor: pointer;
      font-size: .86rem; font-weight: 600; color: var(--text);
      line-height: 1.2; min-height: 2.1rem;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background .12s, color .12s;
    }
    .mode-tab:last-child { border-right: none; }
    .mode-tab:hover { background: var(--bg); }
    .mode-tab.active {
      background: var(--primary); color: #fff;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 80%, #000);
    }

    /* Alert */
    .form-alert {
      border: 1px solid color-mix(in srgb, var(--error) 40%, var(--border));
      background: color-mix(in srgb, var(--error) 8%, white);
      color: var(--error); border-radius: var(--radius);
      padding: .5rem .7rem; font-size: .82rem; font-weight: 600;
    }

    /* Section dividers */
    .section-divider {
      font-size: .72rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
      color: var(--text-muted);
      display: flex; align-items: center; gap: .5rem;
    }
    .section-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .optional-section { display: flex; flex-direction: column; gap: .6rem; }

    /* Fields */
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
    .field-full { grid-column: 1 / -1; }
    .field { display: flex; flex-direction: column; gap: .26rem; }
    .field > span:first-child { font-weight: 600; font-size: .8rem; color: var(--text); }
    .req { color: var(--error); font-style: normal; }
    .field-error { font-size: .74rem; color: var(--error); }
    .field-hint { font-size: .76rem; color: var(--text-muted); }
    .field input {
      border: 1px solid var(--border); border-radius: var(--radius);
      padding: .52rem .62rem; font: inherit; background: var(--white);
    }
    .field input:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .input-invalid {
      border-color: #e53e3e !important;
      background: color-mix(in srgb, #e53e3e 4%, var(--white)) !important;
    }
    .input-invalid:focus {
      box-shadow: 0 0 0 3px color-mix(in srgb, #e53e3e 18%, transparent) !important;
    }

    /* Chips */
    .chips-row { display: flex; flex-wrap: wrap; gap: .3rem; min-height: 1.2rem; }
    .chip {
      display: inline-flex; align-items: center; gap: .3rem;
      padding: .2rem .45rem; border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      color: var(--primary); font-size: .78rem; font-weight: 600;
    }
    .chip-remove {
      border: none; background: transparent; color: inherit; cursor: pointer;
      font-size: .82rem; line-height: 1; opacity: .7; padding: 0;
    }
    .chip-remove:hover { opacity: 1; }

    /* Combobox */
    .combobox { position: relative; }
    .combobox-input {
      width: 100%; padding: .52rem .62rem;
      border: 1px solid var(--border); border-radius: var(--radius);
      font: inherit; box-sizing: border-box;
    }
    .combobox-input:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: var(--shadow-lg);
      z-index: 100; list-style: none; margin: 0; padding: .25rem 0;
      max-height: 200px; overflow-y: auto;
    }
    .dropdown li { padding: .45rem .7rem; cursor: pointer; font-size: .88rem; }
    .dropdown li:hover { background: var(--bg); }
    .dropdown-hint { padding: .45rem .7rem; font-size: .8rem; color: var(--text-muted); }

    /* Compact acceso inline */
    .access-inline {
      display: flex; align-items: center; gap: .38rem; flex-wrap: wrap;
      min-height: 2rem;
      padding-bottom: .15rem;
      border-bottom: 1px solid var(--border);
    }
    .access-choice {
      position: relative;
      display: inline-flex; align-items: center; gap: .2rem;
      cursor: pointer; font-size: .84rem; color: var(--text);
      line-height: 1.35;
    }
    .access-choice input[type=radio] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 1px;
      height: 1px;
    }
    .access-choice:hover { color: var(--primary); }
    .access-choice.selected { color: var(--primary); }
    .access-choice-radio {
      width: .9rem;
      height: .9rem;
      border: 1.5px solid color-mix(in srgb, var(--text-muted) 65%, var(--border));
      border-radius: 999px;
      background: var(--white);
      flex: 0 0 auto;
      transition: border-color .12s ease, box-shadow .12s ease, background-color .12s ease;
    }
    .access-choice.selected .access-choice-radio {
      border-color: var(--primary);
      box-shadow: inset 0 0 0 2.5px var(--white);
      background: var(--primary);
    }
    .access-choice span:last-child {
      white-space: nowrap;
    }
    .access-divider {
      color: var(--text-muted);
      font-size: .8rem;
    }
    .access-hint {
      font-size: .76rem;
      color: var(--text-muted);
      line-height: 1.35;
    }

    /* Estado */
    .toggle {
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--white);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      gap: .7rem;
      padding: .4rem .72rem .4rem .45rem;
      cursor: pointer;
      width: fit-content;
      transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease;
    }
    .toggle:hover {
      border-color: color-mix(in srgb, var(--primary) 32%, var(--border));
      background: color-mix(in srgb, var(--primary) 4%, var(--white));
    }
    .toggle:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .toggle-track {
      width: 40px;
      height: 24px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--text-muted) 24%, var(--border));
      position: relative;
      transition: background .15s ease;
      flex: 0 0 auto;
    }
    .toggle-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      position: absolute;
      left: 3px;
      top: 3px;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.18);
      transition: left .15s ease;
    }
    .toggle-copy {
      display: grid;
      gap: .05rem;
      text-align: left;
    }
    .toggle-copy strong {
      font-size: .86rem;
      line-height: 1.1;
    }
    .toggle-copy small {
      font-size: .72rem;
      color: var(--text-muted);
      line-height: 1.1;
    }
    .toggle-on .toggle-track {
      background: color-mix(in srgb, var(--success) 60%, var(--primary));
    }
    .toggle-on .toggle-thumb {
      left: 19px;
    }
    .toggle-on .toggle-copy strong {
      color: var(--success);
    }

    /* Actions */
    .modal-actions {
      display: flex; justify-content: flex-end; gap: .65rem;
      border-top: 1px solid var(--border); padding-top: .8rem; margin-top: .1rem;
    }
    .btn-cancel {
      padding: .48rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white);
      cursor: pointer; font-size: .87rem;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-save {
      padding: .48rem 1.1rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; font-weight: 600;
      cursor: pointer; font-size: .87rem;
    }
    .btn-save:hover { opacity: .9; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }

    @keyframes modal-enter {
      from { transform: translateY(6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .field-full { grid-column: auto; }
      .access-inline {
        align-items: flex-start;
        row-gap: .25rem;
      }
      .access-hint {
        flex-basis: 100%;
      }
    }
  `],
  host: { '(document:click)': 'dropdownOpen.set(false)' },
})
export class ProfesionalForm {
  readonly editValue = input<ProfesionalFormEditValue | null>(null);
  readonly consultorioId = input<string>('');
  /** Mostrar sección de estado (activo/inactivo) en edición. Default: true */
  readonly showEstado = input<boolean>(true);
  /** Indicador de operación en curso (para deshabilitar el botón) */
  readonly saving = input<boolean>(false);

  readonly submitted$ = output<ProfesionalFormResult>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly especialidadSvc = inject(EspecialidadService);

  readonly modo = signal<Modo>('rapida');
  readonly acceso = signal<Acceso>('invitar');
  readonly submitted = signal(false);

  readonly especialidadInput = signal('');
  readonly especialidades = signal<string[]>([]);
  readonly dropdownOpen = signal(false);
  readonly catalogoEspecialidades = signal<{ id: string; nombre: string; activo: boolean }[]>([]);

  readonly mostrarOpcionales = computed(() => this.editValue() !== null || this.modo() === 'completa');

  readonly ctaLabel = computed(() => {
    if (this.editValue()) return 'Guardar cambios';
    return this.acceso() === 'invitar' ? 'Invitar al sistema' : 'Guardar profesional';
  });

  readonly filteredOptions = computed(() => {
    const q = this.especialidadInput().toLowerCase();
    const selected = new Set(this.especialidades().map((e) => e.toLowerCase()));
    return this.catalogoEspecialidades()
      .filter((e) => e.activo)
      .filter((e) => !selected.has(e.nombre.toLowerCase()))
      .filter((e) => !q || e.nombre.toLowerCase().includes(q));
  });

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    nroDocumento: ['', [Validators.required, Validators.pattern(/^[0-9]{7,10}$/)]],
    matricula: ['', [Validators.maxLength(50)]],
    telefono: ['', [Validators.pattern(/^[0-9+\-()\s]{6,30}$/)]],
    domicilio: ['', [Validators.maxLength(255)]],
    activo: [true],
    fechaBaja: [''],
    motivoBaja: [''],
  });

  constructor() {
    effect(() => {
      const cid = this.consultorioId();
      if (!cid) return;
      this.especialidadSvc.list(cid, { includeInactive: false }).subscribe({
        next: (rows) => this.catalogoEspecialidades.set(rows),
        error: () => this.catalogoEspecialidades.set([]),
      });
    });

    effect(() => {
      const ev = this.editValue();
      if (!ev) {
        this.form.reset({
          nombre: '', apellido: '', email: '', nroDocumento: '',
          matricula: '', telefono: '', domicilio: '',
          activo: true, fechaBaja: '', motivoBaja: '',
        });
        this.especialidades.set([]);
        this.modo.set('rapida');
        this.acceso.set('invitar');
        this.submitted.set(false);
        return;
      }
      this.form.patchValue({
        nombre: ev.nombre ?? '',
        apellido: ev.apellido ?? '',
        email: ev.email ?? '',
        nroDocumento: ev.nroDocumento ?? '',
        matricula: ev.matricula ?? '',
        telefono: ev.telefono ?? '',
        domicilio: ev.domicilio ?? '',
        activo: ev.activo ?? true,
        fechaBaja: ev.fechaBaja ?? '',
        motivoBaja: ev.motivoBaja ?? '',
      });
      this.especialidades.set(ev.especialidades ?? []);
      this.submitted.set(false);
    });
  }

  setModo(m: Modo): void {
    this.modo.set(m);
    this.submitted.set(false);
  }

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  setEmailError(error: string): void {
    this.form.controls.email.setErrors({ ...this.form.controls.email.errors, [error]: true });
    this.form.controls.email.markAsTouched();
  }

  clearEmailError(error: string): void {
    const errors = { ...(this.form.controls.email.errors ?? {}) };
    delete errors[error];
    this.form.controls.email.setErrors(Object.keys(errors).length ? errors : null);
  }

  onInputChange(value: string): void {
    this.especialidadInput.set(value);
    this.dropdownOpen.set(true);
  }

  addFromCatalog(nombre: string): void {
    const exists = this.especialidades().some((x) => x.toLowerCase() === nombre.toLowerCase());
    if (!exists) this.especialidades.set([...this.especialidades(), nombre]);
    this.especialidadInput.set('');
    this.dropdownOpen.set(false);
  }

  selectFirst(): void {
    const options = this.filteredOptions();
    if (options.length > 0) {
      this.addFromCatalog(options[0].nombre);
    } else {
      const value = this.especialidadInput().trim();
      if (!value) return;
      const exists = this.especialidades().some((x) => x.toLowerCase() === value.toLowerCase());
      if (!exists) this.especialidades.set([...this.especialidades(), value]);
      this.especialidadInput.set('');
      this.dropdownOpen.set(false);
    }
  }

  removeEspecialidad(value: string): void {
    this.especialidades.set(this.especialidades().filter((x) => x !== value));
  }

  toggleActivo(): void {
    const current = this.form.controls.activo.value;
    this.form.controls.activo.setValue(!current);
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    if (this.showEstado() && this.editValue() && !v.activo && (!v.fechaBaja || !v.motivoBaja.trim())) {
      return;
    }

    const accesoActivo = this.editValue() ? v.activo : this.acceso() === 'invitar';
    const modoAlta = this.editValue()
      ? 'DIRECTA'
      : (this.acceso() === 'invitar' ? 'INVITACION' : 'DIRECTA');

    this.submitted$.emit({
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      nroDocumento: v.nroDocumento.trim(),
      email: v.email.trim(),
      matricula: v.matricula.trim() || undefined,
      telefono: v.telefono.trim() || undefined,
      domicilio: v.domicilio.trim() || undefined,
      especialidades: this.especialidades(),
      modoAlta,
      activo: accesoActivo,
      fechaDeBaja: v.fechaBaja || undefined,
      motivoDeBaja: v.motivoBaja.trim() || undefined,
    });
  }
}




