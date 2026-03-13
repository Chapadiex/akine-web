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
import { Profesional, ProfesionalRequest } from '../../models/consultorio.models';
import { EspecialidadService } from '../../services/especialidad.service';

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
          <h2>{{ isEdit() ? 'Editar profesional' : 'Agregar profesional' }}</h2>
          <button class="icon-close" type="button" (click)="cancelled.emit()">×</button>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (submitted() && (form.invalid || especialidades().length === 0)) {
            <div class="form-alert">Hay campos incompletos. Revisá los marcados en rojo.</div>
          }
          @if (isEdit() && submitted() && !form.controls.activo.value
              && (!form.controls.fechaBaja.value || !form.controls.motivoBaja.value.trim())) {
            <div class="form-alert">Si el profesional está inactivo, completá la fecha y el motivo de baja.</div>
          }

          <!-- Selector de modo (solo en alta) -->
          @if (!isEdit()) {
            <div class="mode-cards">
              <button
                type="button"
                class="mode-card"
                [class.mode-card-active]="modo() === 'rapida'"
                (click)="setModo('rapida')"
              >
                <span class="mode-card-icon">⚡</span>
                <strong>Carga rápida</strong>
                <span>Invitá o vinculá en segundos</span>
              </button>
              <button
                type="button"
                class="mode-card"
                [class.mode-card-active]="modo() === 'completa'"
                (click)="setModo('completa')"
              >
                <span class="mode-card-icon">📋</span>
                <strong>Carga completa</strong>
                <span>Completá la ficha con todos los datos</span>
              </button>
            </div>
          }

          <!-- ────── CARGA RÁPIDA ────── -->
          @if (!isEdit() && modo() === 'rapida') {
            <div class="form-section">
              <label class="field">
                <span>Email <em class="req">*</em></span>
                <input formControlName="email" type="email" placeholder="profesional@mail.com"
                  inputmode="email" [class.input-invalid]="isInvalid('email')" />
                @if (isInvalid('email')) {
                  <small class="field-error">
                    @if (form.controls.email.hasError('required')) { El email es obligatorio. }
                    @else { Email inválido. }
                  </small>
                }
              </label>

              <div class="field">
                <span>Especialidades <em class="req">*</em></span>
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
                @if (submitted() && especialidades().length === 0) {
                  <small class="field-error">Seleccioná al menos una especialidad.</small>
                }
              </div>

              <div class="form-grid">
                <label class="field">
                  <span>Nombre <em class="optional">(opcional)</em></span>
                  <input formControlName="nombre" placeholder="Nombre" />
                </label>
                <label class="field">
                  <span>Matrícula <em class="optional">(opcional)</em></span>
                  <input formControlName="matricula" placeholder="Ej: MP-1234" />
                </label>
              </div>

              <div class="field">
                <span>Acceso al sistema</span>
                <div class="acceso-opts">
                  <label class="acceso-opt" [class.acceso-opt-active]="acceso() === 'invitar'">
                    <input type="radio" name="acceso_r" [checked]="acceso() === 'invitar'"
                      (change)="acceso.set('invitar')" />
                    <span class="acceso-opt-body">
                      <strong>Invitar al sistema</strong>
                      <span>Recibirá un email para crear su cuenta</span>
                    </span>
                  </label>
                  <label class="acceso-opt" [class.acceso-opt-active]="acceso() === 'sin_acceso'">
                    <input type="radio" name="acceso_r" [checked]="acceso() === 'sin_acceso'"
                      (change)="acceso.set('sin_acceso')" />
                    <span class="acceso-opt-body">
                      <strong>Agregar sin acceso</strong>
                      <span>Podés habilitarlo más tarde desde su perfil</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          }

          <!-- ────── CARGA COMPLETA / EDICIÓN ────── -->
          @if (isEdit() || modo() === 'completa') {
            <div class="section-divider">Identidad</div>
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
            </div>

            <div class="section-divider">Datos profesionales</div>
            <label class="field">
              <span>Matrícula <em class="req">*</em></span>
              <input formControlName="matricula" placeholder="Ej: MP-1234"
                [class.input-invalid]="isInvalid('matricula')" />
              @if (isInvalid('matricula') && form.controls.matricula.hasError('required')) {
                <small class="field-error">La matrícula es obligatoria.</small>
              }
            </label>

            <div class="field">
              <span>Especialidades <em class="req">*</em></span>
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
              @if (submitted() && especialidades().length === 0) {
                <small class="field-error">Seleccioná al menos una especialidad.</small>
              }
            </div>

            <div class="section-divider">Contacto <em class="section-opt">(opcional)</em></div>
            <div class="form-grid">
              <label class="field">
                <span>Email</span>
                <input formControlName="email" type="email" placeholder="profesional@mail.com"
                  inputmode="email" [class.input-invalid]="isInvalid('email')" />
                @if (isInvalid('email') && form.controls.email.hasError('email')) {
                  <small class="field-error">Email inválido.</small>
                }
              </label>
              <label class="field">
                <span>Teléfono</span>
                <input formControlName="telefono" type="tel" placeholder="1155554444"
                  inputmode="tel" [class.input-invalid]="isInvalid('telefono')" />
                @if (isInvalid('telefono') && form.controls.telefono.hasError('pattern')) {
                  <small class="field-error">Teléfono inválido.</small>
                }
              </label>
              <label class="field">
                <span>DNI <em class="optional">(opcional)</em></span>
                <input formControlName="nroDocumento" placeholder="30111222" inputmode="numeric"
                  [class.input-invalid]="isInvalid('nroDocumento')" />
                @if (isInvalid('nroDocumento') && form.controls.nroDocumento.hasError('pattern')) {
                  <small class="field-error">El DNI debe tener entre 7 y 10 dígitos.</small>
                }
              </label>
            </div>

            <!-- Estado (solo edición) -->
            @if (isEdit()) {
              <div class="section-divider">Estado</div>
              <label class="toggle-row">
                <input type="checkbox" formControlName="activo" />
                <span>Profesional activo</span>
              </label>
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

            <!-- Acceso (solo alta completa) -->
            @if (!isEdit()) {
              <div class="section-divider">Acceso al sistema</div>
              <div class="acceso-opts">
                <label class="acceso-opt" [class.acceso-opt-active]="acceso() === 'invitar'">
                  <input type="radio" name="acceso_c" [checked]="acceso() === 'invitar'"
                    (change)="acceso.set('invitar')" />
                  <span class="acceso-opt-body">
                    <strong>Invitar al sistema</strong>
                    <span>Recibirá un email para crear su cuenta</span>
                  </span>
                </label>
                <label class="acceso-opt" [class.acceso-opt-active]="acceso() === 'sin_acceso'">
                  <input type="radio" name="acceso_c" [checked]="acceso() === 'sin_acceso'"
                    (change)="acceso.set('sin_acceso')" />
                  <span class="acceso-opt-body">
                    <strong>Agregar sin acceso</strong>
                    <span>Podés habilitarlo más tarde desde su perfil</span>
                  </span>
                </label>
              </div>
            }
          }

          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-save">{{ ctaLabel() }}</button>
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
      width: min(780px, 100%);
      max-height: calc(100dvh - 2rem);
      overflow: auto;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg) + 2px);
      box-shadow: var(--shadow-lg);
      padding: 1.25rem 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: .85rem;
      animation: modal-enter .2s ease;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center; gap: .8rem;
    }
    .modal-header h2 { margin: 0; font-size: 1.15rem; font-weight: 700; }
    .icon-close {
      flex-shrink: 0; width: 2rem; height: 2rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--white);
      color: var(--text); cursor: pointer; font-size: 1.1rem; line-height: 1;
    }
    .icon-close:hover { background: var(--bg); }

    /* Alert */
    .form-alert {
      border: 1px solid color-mix(in srgb, var(--error) 40%, var(--border));
      background: color-mix(in srgb, var(--error) 8%, white);
      color: var(--error); border-radius: var(--radius);
      padding: .55rem .7rem; font-size: .82rem; font-weight: 600;
    }

    /* Mode cards */
    .mode-cards { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
    .mode-card {
      display: flex; flex-direction: column; align-items: flex-start; gap: .2rem;
      padding: .8rem 1rem;
      border: 1.5px solid var(--border); border-radius: var(--radius-lg);
      background: var(--white); cursor: pointer; text-align: left;
      transition: border-color .15s, background .15s;
    }
    .mode-card:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); background: var(--bg); }
    .mode-card-active {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 6%, var(--white));
    }
    .mode-card-icon { font-size: 1.1rem; line-height: 1; margin-bottom: .1rem; }
    .mode-card strong { font-size: .9rem; font-weight: 700; color: var(--text); }
    .mode-card span { font-size: .78rem; color: var(--text-muted); }

    /* Section dividers */
    .section-divider {
      font-size: .72rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
      color: var(--text-muted);
      display: flex; align-items: center; gap: .5rem;
      margin-top: .1rem;
    }
    .section-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .section-opt { font-weight: 400; text-transform: none; letter-spacing: 0; font-size: .72rem; }

    /* Form section wrapper (rápida) */
    .form-section { display: flex; flex-direction: column; gap: .7rem; }

    /* Fields */
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
    .field { display: flex; flex-direction: column; gap: .28rem; font-size: .87rem; }
    .field > span:first-child { font-weight: 600; font-size: .82rem; color: var(--text); }
    .req { color: var(--error); font-style: normal; }
    .optional { font-weight: 400; color: var(--text-muted); font-size: .78rem; font-style: normal; }
    .field-error { font-size: .74rem; color: var(--error); }
    .field input {
      border: 1px solid var(--border); border-radius: var(--radius);
      padding: .56rem .65rem; font: inherit; background: var(--white);
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
    .chips-row { display: flex; flex-wrap: wrap; gap: .35rem; min-height: 1.4rem; }
    .chip {
      display: inline-flex; align-items: center; gap: .35rem;
      padding: .22rem .5rem; border-radius: 999px;
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      color: var(--primary); font-size: .8rem; font-weight: 600;
    }
    .chip-remove {
      border: none; background: transparent; color: inherit; cursor: pointer;
      font-size: .85rem; line-height: 1; opacity: .7; padding: 0;
    }
    .chip-remove:hover { opacity: 1; }

    /* Combobox */
    .combobox { position: relative; }
    .combobox-input {
      width: 100%; padding: .56rem .65rem;
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
    .dropdown li { padding: .5rem .75rem; cursor: pointer; font-size: .9rem; }
    .dropdown li:hover { background: var(--bg); }
    .dropdown-hint { padding: .5rem .75rem; font-size: .82rem; color: var(--text-muted); }

    /* Acceso options */
    .acceso-opts { display: flex; flex-direction: column; gap: .4rem; }
    .acceso-opt {
      display: flex; align-items: flex-start; gap: .6rem;
      padding: .6rem .75rem;
      border: 1.5px solid var(--border); border-radius: var(--radius);
      cursor: pointer; transition: border-color .15s, background .15s;
    }
    .acceso-opt:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); }
    .acceso-opt-active {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 5%, var(--white));
    }
    .acceso-opt input[type=radio] { margin-top: .18rem; flex-shrink: 0; }
    .acceso-opt-body { display: flex; flex-direction: column; gap: .1rem; }
    .acceso-opt-body strong { font-size: .88rem; color: var(--text); }
    .acceso-opt-body span { font-size: .78rem; color: var(--text-muted); }

    /* Estado */
    .toggle-row {
      display: flex; align-items: center; gap: .6rem;
      font-size: .88rem; color: var(--text); cursor: pointer;
    }
    .toggle-row input[type=checkbox] { width: 1.1rem; height: 1.1rem; }

    /* Actions */
    .modal-actions {
      display: flex; justify-content: flex-end; gap: .75rem;
      border-top: 1px solid var(--border); padding-top: .85rem; margin-top: .2rem;
    }
    .btn-cancel {
      padding: .5rem 1.1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white);
      cursor: pointer; font-size: .88rem;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-save {
      padding: .5rem 1.2rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; font-weight: 600;
      cursor: pointer; font-size: .88rem;
    }
    .btn-save:hover { opacity: .9; }

    @keyframes modal-enter {
      from { transform: translateY(6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 680px) {
      .mode-cards { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `],
  host: {
    '(document:click)': 'dropdownOpen.set(false)',
  },
})
export class ProfesionalForm {
  readonly editItem = input<Profesional | null>(null);
  readonly consultorioId = input<string>('');

  readonly saved = output<ProfesionalRequest>();
  readonly savedEstado = output<{ activo: boolean; fechaDeBaja?: string; motivoDeBaja?: string }>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly especialidadSvc = inject(EspecialidadService);

  readonly modo = signal<Modo>('rapida');
  readonly acceso = signal<Acceso>('invitar');

  readonly especialidadInput = signal('');
  readonly especialidades = signal<string[]>([]);
  readonly submitted = signal(false);
  readonly dropdownOpen = signal(false);
  readonly catalogoEspecialidades = signal<{ id: string; nombre: string; activo: boolean }[]>([]);

  readonly isEdit = computed(() => this.editItem() !== null);

  readonly ctaLabel = computed(() => {
    if (this.isEdit()) return 'Guardar cambios';
    if (this.modo() === 'rapida') {
      return this.acceso() === 'invitar' ? 'Invitar al sistema' : 'Agregar profesional';
    }
    return 'Guardar profesional';
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
    nombre: ['', [Validators.maxLength(100)]],
    apellido: ['', [Validators.maxLength(100)]],
    nroDocumento: ['', [Validators.pattern(/^$|^[0-9]{7,10}$/)]],
    matricula: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.pattern(/^[0-9+\-()\s]{6,30}$/)]],
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
      const m = this.modo();
      if (this.isEdit()) return;
      this.applyValidators(m);
    });

    effect(() => {
      const item = this.editItem();
      if (!item) {
        this.form.reset({
          nombre: '', apellido: '', nroDocumento: '', matricula: '',
          email: '', telefono: '', activo: true, fechaBaja: '', motivoBaja: '',
        });
        this.especialidades.set([]);
        this.modo.set('rapida');
        this.acceso.set('invitar');
        this.submitted.set(false);
        this.applyValidators('rapida');
        return;
      }
      this.applyValidators('completa');
      this.form.patchValue({
        nombre: item.nombre ?? '',
        apellido: item.apellido ?? '',
        nroDocumento: item.nroDocumento ?? '',
        matricula: item.matricula ?? '',
        email: item.email ?? '',
        telefono: item.telefono ?? '',
        activo: item.activo,
        fechaBaja: item.fechaBaja ?? '',
        motivoBaja: item.motivoBaja ?? '',
      });
      this.especialidades.set(item.especialidades ?? []);
      this.submitted.set(false);
    });
  }

  setModo(m: Modo): void {
    this.modo.set(m);
    this.submitted.set(false);
    (['nombre', 'apellido', 'matricula', 'email'] as const).forEach((f) =>
      this.form.controls[f].markAsUntouched(),
    );
  }

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  onInputChange(value: string): void {
    this.especialidadInput.set(value);
    this.dropdownOpen.set(true);
  }

  addFromCatalog(nombre: string): void {
    const exists = this.especialidades().some((x) => x.toLowerCase() === nombre.toLowerCase());
    if (!exists) {
      this.especialidades.set([...this.especialidades(), nombre]);
    }
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
      if (!exists) {
        this.especialidades.set([...this.especialidades(), value]);
      }
      this.especialidadInput.set('');
      this.dropdownOpen.set(false);
    }
  }

  removeEspecialidad(value: string): void {
    this.especialidades.set(this.especialidades().filter((x) => x !== value));
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.especialidades().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    if (this.isEdit() && !v.activo && (!v.fechaBaja || !v.motivoBaja.trim())) {
      return;
    }

    const req: ProfesionalRequest = {
      nombre: v.nombre || undefined,
      apellido: v.apellido || undefined,
      nroDocumento: v.nroDocumento || undefined,
      matricula: v.matricula || undefined,
      especialidad: this.especialidades()[0],
      especialidades: this.especialidades().join('|'),
      email: v.email || undefined,
      telefono: v.telefono || undefined,
    };

    // savedEstado primero para que el parent actualice pendingEstado antes de que onSave lo lea
    const accesoActivo = this.isEdit() ? v.activo : this.acceso() === 'invitar';
    this.savedEstado.emit({
      activo: accesoActivo,
      fechaDeBaja: v.fechaBaja || undefined,
      motivoDeBaja: v.motivoBaja || undefined,
    });

    this.saved.emit(req);
  }

  private applyValidators(m: Modo): void {
    const c = this.form.controls;
    if (m === 'rapida') {
      c.nombre.setValidators([Validators.maxLength(100)]);
      c.apellido.setValidators([Validators.maxLength(100)]);
      c.matricula.setValidators([Validators.maxLength(50)]);
      c.email.setValidators([Validators.required, Validators.email, Validators.maxLength(255)]);
    } else {
      c.nombre.setValidators([Validators.required, Validators.maxLength(100)]);
      c.apellido.setValidators([Validators.required, Validators.maxLength(100)]);
      c.matricula.setValidators([Validators.required, Validators.maxLength(50)]);
      c.email.setValidators([Validators.email, Validators.maxLength(255)]);
    }
    c.nombre.updateValueAndValidity({ emitEvent: false });
    c.apellido.updateValueAndValidity({ emitEvent: false });
    c.matricula.updateValueAndValidity({ emitEvent: false });
    c.email.updateValueAndValidity({ emitEvent: false });
  }
}
