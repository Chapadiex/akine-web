import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PacienteRequest } from '../../models/paciente.models';
import { PACIENTE_PAISES } from '../../models/paciente-paises';
import { PACIENTE_PROFESIONES_COMUNES } from '../../models/paciente-profesiones';

@Component({
  selector: 'app-paciente-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="section-shell">
        <div class="section-tabs" role="tablist" aria-label="Secciones de la ficha del paciente">
          @for (section of sections; track section.id) {
            <button
              type="button"
              class="section-tab"
              [class.section-tab-active]="activeSection() === section.id"
              [attr.aria-selected]="activeSection() === section.id"
              (click)="setActiveSection(section.id)"
            >
              {{ section.label }}
            </button>
          }
        </div>
      </div>

      @if (activeSection() === 'basicos') {
        <div class="section-panel">
          <div class="section-heading">
            <strong>Datos basicos</strong>
            <span>Identificacion principal y datos obligatorios.</span>
          </div>

          <div class="grid">
            <div class="field">
              <label>DNI *</label>
              <input formControlName="dni" placeholder="30111222" [readOnly]="mode() === 'edit'" />
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

          <div class="grid">
            <div class="field">
              <label>Fecha de nacimiento</label>
              <input formControlName="fechaNacimiento" type="date" />
            </div>
            <div class="field">
              <label>Sexo</label>
              <select formControlName="sexo">
                <option value="">Seleccionar</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="No binario">No binario</option>
                <option value="Prefiere no decir">Prefiere no decir</option>
              </select>
            </div>
          </div>
        </div>
      }

      @if (activeSection() === 'otros') {
        <div class="section-panel">
          <div class="section-heading">
            <strong>Otros datos</strong>
            <span>Contacto, perfil y referencias personales.</span>
          </div>

          <div class="grid">
            <div class="field">
              <label>Email</label>
              <input formControlName="email" type="email" placeholder="mail@ejemplo.com" />
            </div>

            <div class="field profession-field">
              <label>Profesion</label>

              <button
                type="button"
                class="profession-trigger"
                [class.profession-trigger-open]="professionOpen()"
                (click)="toggleProfessionMenu()"
              >
                <span class="profession-trigger-copy">
                  {{ form.controls.profesion.value || 'Seleccionar o buscar profesion' }}
                </span>
                <span class="profession-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                    <path d="m5 7 5 6 5-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>

              @if (professionOpen()) {
                <div class="profession-panel">
                  <div class="profession-search-row">
                    <input
                      class="profession-search"
                      type="text"
                      [value]="professionQuery()"
                      placeholder="Buscar profesion"
                      (input)="updateProfessionQuery($any($event.target).value)"
                    />
                  </div>

                  @if (canUseCustomProfession()) {
                    <button type="button" class="profession-custom" (click)="useCustomProfession()">
                      Usar "{{ professionQuery().trim() }}"
                    </button>
                  }

                  <div class="profession-list" role="listbox" aria-label="Profesiones sugeridas">
                    @for (profession of filteredProfessions(); track profession) {
                      <button
                        type="button"
                        class="profession-option"
                        [class.profession-option-active]="form.controls.profesion.value === profession"
                        (click)="selectProfession(profession)"
                      >
                        {{ profession }}
                      </button>
                    }

                    @if (filteredProfessions().length === 0 && !canUseCustomProfession()) {
                      <div class="profession-empty">
                        No hay coincidencias para la busqueda actual.
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="field field-full">
            <label>Domicilio</label>
            <input formControlName="domicilio" placeholder="Calle, numero, localidad" />
          </div>

          <div class="grid">
            <div class="field nationality-field">
              <label>Nacionalidad</label>

              <button
                type="button"
                class="profession-trigger"
                [class.profession-trigger-open]="nationalityOpen()"
                (click)="toggleNationalityMenu()"
              >
                <span class="profession-trigger-copy">
                  {{ form.controls.nacionalidad.value || 'Seleccionar pais' }}
                </span>
                <span class="profession-trigger-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                    <path d="m5 7 5 6 5-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>

              @if (nationalityOpen()) {
                <div class="profession-panel">
                  <div class="profession-search-row">
                    <input
                      class="profession-search"
                      type="text"
                      [value]="nationalityQuery()"
                      placeholder="Buscar pais"
                      (input)="updateNationalityQuery($any($event.target).value)"
                    />
                  </div>

                  <div class="profession-list" role="listbox" aria-label="Paises sugeridos">
                    @for (country of filteredCountries(); track country) {
                      <button
                        type="button"
                        class="profession-option"
                        [class.profession-option-active]="form.controls.nacionalidad.value === country"
                        (click)="selectNationality(country)"
                      >
                        {{ country }}
                      </button>
                    }

                    @if (filteredCountries().length === 0) {
                      <div class="profession-empty">
                        No hay coincidencias para la busqueda actual.
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="field">
              <label>Estado civil</label>
              <select formControlName="estadoCivil">
                <option value="">Seleccionar</option>
                <option value="Soltero/a">Soltero/a</option>
                <option value="Casado/a">Casado/a</option>
                <option value="Union convivencial">Union convivencial</option>
                <option value="Divorciado/a">Divorciado/a</option>
                <option value="Viudo/a">Viudo/a</option>
              </select>
            </div>
          </div>
        </div>
      }

      @if (activeSection() === 'obra-social') {
        <div class="section-panel">
          <div class="section-heading">
            <strong>Obra social</strong>
            <span>Cobertura, plan y numero de afiliado.</span>
          </div>

          <div class="field field-full">
            <label>Obra Social</label>
            <input formControlName="obraSocialNombre" placeholder="Nombre de obra social" />
          </div>

          <div class="grid">
            <div class="field">
              <label>Plan</label>
              <input formControlName="obraSocialPlan" placeholder="Plan" />
            </div>
            <div class="field">
              <label>Nro. Afiliado</label>
              <input formControlName="obraSocialNroAfiliado" placeholder="Nro. afiliado" />
            </div>
          </div>
        </div>
      }

      <div class="actions">
        <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
        <button type="submit" class="btn-save" [disabled]="form.invalid">
          {{ mode() === 'edit' ? 'Guardar cambios' : 'Guardar' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .section-shell {
      display: grid;
      gap: .45rem;
      margin-bottom: .95rem;
    }
    .section-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: .35rem;
      padding: .22rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: color-mix(in srgb, var(--border) 50%, var(--white) 50%);
    }
    .section-tab {
      border: 1px solid transparent;
      border-radius: 11px;
      background: transparent;
      color: var(--text);
      font-size: .86rem;
      font-weight: 700;
      padding: .48rem .78rem;
      cursor: pointer;
      transition: background .16s ease, border-color .16s ease, color .16s ease;
    }
    .section-tab:hover {
      background: color-mix(in srgb, var(--white) 80%, var(--border) 20%);
    }
    .section-tab-active {
      background: var(--white);
      border-color: var(--border);
      box-shadow: var(--shadow-sm);
      color: var(--primary);
    }
    .section-panel {
      border: 1px solid color-mix(in srgb, var(--border) 92%, var(--primary) 8%);
      border-radius: 16px;
      background: color-mix(in srgb, var(--bg) 18%, var(--white));
      padding: .9rem .95rem .1rem;
      margin-bottom: .2rem;
    }
    .section-heading {
      display: grid;
      gap: .15rem;
      margin-bottom: .85rem;
    }
    .section-heading strong {
      color: var(--text);
      font-size: .98rem;
    }
    .section-heading span {
      color: var(--text-muted);
      font-size: .8rem;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .82rem; }
    .field-full { margin-bottom: .82rem; }
    .field label { font-size: .85rem; color: var(--text-muted); font-weight: 600; }
    .field input,
    .field select {
      padding: .55rem .75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      outline: none;
      font-size: .95rem;
      background: var(--white);
    }
    .field input[readonly] {
      background: color-mix(in srgb, var(--bg) 72%, var(--white));
      color: var(--text-muted);
    }
    .field input:focus,
    .field select:focus,
    .profession-trigger:focus,
    .profession-search:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .profession-field,
    .nationality-field { position: relative; }
    .profession-trigger {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      padding: .55rem .75rem;
      font-size: .95rem;
      color: var(--text);
      cursor: pointer;
      text-align: left;
      transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
    }
    .profession-trigger-open {
      border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
      background: color-mix(in srgb, var(--primary) 4%, var(--white));
    }
    .profession-trigger-copy {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .profession-trigger-icon {
      display: inline-grid;
      place-items: center;
      color: var(--text-muted);
      flex: 0 0 auto;
    }
    .profession-panel {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + .35rem);
      border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border));
      border-radius: 14px;
      background: var(--white);
      box-shadow: var(--shadow-lg);
      padding: .65rem;
      display: grid;
      gap: .55rem;
      z-index: 15;
    }
    .profession-search-row { position: relative; }
    .profession-search {
      width: 100%;
      min-height: 40px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: .55rem .7rem;
      font-size: .92rem;
      outline: none;
      background: color-mix(in srgb, var(--bg) 24%, var(--white));
    }
    .profession-custom,
    .profession-option {
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text);
      text-align: left;
      border-radius: 10px;
      padding: .52rem .62rem;
      cursor: pointer;
      transition: background .14s ease, border-color .14s ease, color .14s ease;
    }
    .profession-custom {
      border-color: color-mix(in srgb, var(--primary) 18%, var(--border));
      background: color-mix(in srgb, var(--primary) 6%, var(--white));
      color: var(--primary);
      font-weight: 700;
    }
    .profession-list {
      max-height: 260px;
      overflow: auto;
      display: grid;
      gap: .2rem;
      padding-right: .1rem;
    }
    .profession-option:hover,
    .profession-option-active {
      background: color-mix(in srgb, var(--primary) 8%, var(--white));
      border-color: color-mix(in srgb, var(--primary) 12%, var(--border));
    }
    .profession-empty {
      padding: .65rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg) 30%, var(--white));
      color: var(--text-muted);
      font-size: .88rem;
    }
    .actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }
    .btn-cancel {
      padding: .5rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      cursor: pointer;
    }
    .btn-save {
      padding: .5rem 1rem;
      border: none;
      border-radius: var(--radius);
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; gap: 0; }
      .section-tabs { gap: .28rem; }
      .section-tab { flex: 1 1 calc(50% - .28rem); text-align: center; }
      .profession-panel { position: static; margin-top: .35rem; }
    }
  `],
})
export class PacienteForm {
  initialDni = input<string>('');
  initialPaciente = input<Partial<PacienteRequest> | null>(null);
  mode = input<'create' | 'edit'>('create');
  saved = output<PacienteRequest>();
  cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private lastHydrationKey = '';

  readonly professionOpen = signal(false);
  readonly professionQuery = signal('');
  readonly nationalityOpen = signal(false);
  readonly nationalityQuery = signal('');
  readonly commonProfessions = PACIENTE_PROFESIONES_COMUNES;
  readonly countries = PACIENTE_PAISES;
  readonly sections = [
    { id: 'basicos', label: 'Datos basicos' },
    { id: 'otros', label: 'Otros' },
    { id: 'obra-social', label: 'Obra social' },
  ] as const;
  readonly activeSection = signal<'basicos' | 'otros' | 'obra-social'>('basicos');

  readonly filteredProfessions = computed(() => {
    const query = this.normalizeValue(this.professionQuery());
    return this.commonProfessions.filter((profession) =>
      this.normalizeValue(profession).includes(query),
    );
  });

  readonly filteredCountries = computed(() => {
    const query = this.normalizeValue(this.nationalityQuery());
    return this.countries.filter((country) =>
      this.normalizeValue(country).includes(query),
    );
  });

  readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{7,10}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    fechaNacimiento: [''],
    sexo: ['', [Validators.maxLength(30)]],
    domicilio: ['', [Validators.maxLength(255)]],
    nacionalidad: ['', [Validators.maxLength(100)]],
    estadoCivil: ['', [Validators.maxLength(50)]],
    profesion: ['', [Validators.maxLength(100)]],
    obraSocialNombre: [''],
    obraSocialPlan: [''],
    obraSocialNroAfiliado: [''],
  });

  constructor() {
    effect(() => {
      const patient = this.initialPaciente();
      const initialDni = this.initialDni();
      const isEdit = this.mode() === 'edit';
      const defaultNationality = isEdit ? '' : 'Argentina';
      const hydrationKey = JSON.stringify({
        mode: this.mode(),
        initialDni,
        dni: patient?.dni ?? '',
        nombre: patient?.nombre ?? '',
        apellido: patient?.apellido ?? '',
        telefono: patient?.telefono ?? '',
        email: patient?.email ?? '',
        fechaNacimiento: patient?.fechaNacimiento ?? '',
        sexo: patient?.sexo ?? '',
        domicilio: patient?.domicilio ?? '',
        nacionalidad: patient?.nacionalidad ?? defaultNationality,
        estadoCivil: patient?.estadoCivil ?? '',
        profesion: patient?.profesion ?? '',
        obraSocialNombre: patient?.obraSocialNombre ?? '',
        obraSocialPlan: patient?.obraSocialPlan ?? '',
        obraSocialNroAfiliado: patient?.obraSocialNroAfiliado ?? '',
      });

      if (this.lastHydrationKey === hydrationKey) {
        return;
      }
      this.lastHydrationKey = hydrationKey;

      this.form.patchValue({
        dni: patient?.dni ?? initialDni ?? '',
        nombre: patient?.nombre ?? '',
        apellido: patient?.apellido ?? '',
        telefono: patient?.telefono ?? '',
        email: patient?.email ?? '',
        fechaNacimiento: patient?.fechaNacimiento ?? '',
        sexo: patient?.sexo ?? '',
        domicilio: patient?.domicilio ?? '',
        nacionalidad: patient?.nacionalidad ?? defaultNationality,
        estadoCivil: patient?.estadoCivil ?? '',
        profesion: patient?.profesion ?? '',
        obraSocialNombre: patient?.obraSocialNombre ?? '',
        obraSocialPlan: patient?.obraSocialPlan ?? '',
        obraSocialNroAfiliado: patient?.obraSocialNroAfiliado ?? '',
      }, { emitEvent: false });

      this.professionQuery.set('');
      this.nationalityQuery.set('');
      this.activeSection.set('basicos');

      const dniControl = this.form.controls.dni;
      if (isEdit) {
        dniControl.disable({ emitEvent: false });
      } else {
        dniControl.enable({ emitEvent: false });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const professionField = this.elementRef.nativeElement.querySelector('.profession-field');
    const nationalityField = this.elementRef.nativeElement.querySelector('.nationality-field');

    if (!professionField?.contains(event.target as Node)) {
      this.professionOpen.set(false);
    }
    if (!nationalityField?.contains(event.target as Node)) {
      this.nationalityOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.professionOpen.set(false);
    this.nationalityOpen.set(false);
  }

  setActiveSection(section: 'basicos' | 'otros' | 'obra-social'): void {
    this.professionOpen.set(false);
    this.nationalityOpen.set(false);
    this.activeSection.set(section);
  }

  toggleProfessionMenu(): void {
    const nextState = !this.professionOpen();
    this.nationalityOpen.set(false);
    this.professionOpen.set(nextState);
    this.professionQuery.set(nextState ? this.form.controls.profesion.value : '');
  }

  updateProfessionQuery(value: string): void {
    this.professionQuery.set(value);
  }

  selectProfession(profession: string): void {
    this.form.controls.profesion.setValue(profession);
    this.professionQuery.set(profession);
    this.professionOpen.set(false);
  }

  toggleNationalityMenu(): void {
    const nextState = !this.nationalityOpen();
    this.professionOpen.set(false);
    this.nationalityOpen.set(nextState);
    this.nationalityQuery.set(nextState ? this.form.controls.nacionalidad.value : '');
  }

  updateNationalityQuery(value: string): void {
    this.nationalityQuery.set(value);
  }

  selectNationality(country: string): void {
    this.form.controls.nacionalidad.setValue(country);
    this.nationalityQuery.set(country);
    this.nationalityOpen.set(false);
  }

  canUseCustomProfession(): boolean {
    const query = this.professionQuery().trim();
    if (!query) return false;
    return !this.commonProfessions.some(
      (profession) => this.normalizeProfession(profession) === this.normalizeProfession(query),
    );
  }

  useCustomProfession(): void {
    const query = this.professionQuery().trim();
    if (!query) return;
    this.form.controls.profesion.setValue(query);
    this.professionOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.moveToFirstInvalidSection();
      return;
    }

    const v = this.form.getRawValue();
    this.saved.emit({
      dni: v.dni,
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono,
      email: this.toOptional(v.email),
      fechaNacimiento: this.toOptional(v.fechaNacimiento),
      sexo: this.toOptional(v.sexo),
      domicilio: this.toOptional(v.domicilio),
      nacionalidad: this.toOptional(v.nacionalidad),
      estadoCivil: this.toOptional(v.estadoCivil),
      profesion: this.toOptional(v.profesion),
      obraSocialNombre: this.toOptional(v.obraSocialNombre),
      obraSocialPlan: this.toOptional(v.obraSocialPlan),
      obraSocialNroAfiliado: this.toOptional(v.obraSocialNroAfiliado),
    });
  }

  private toOptional(value: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeProfession(value: string): string {
    return this.normalizeValue(value);
  }

  private normalizeValue(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private moveToFirstInvalidSection(): void {
    const sectionByControl: Record<string, 'basicos' | 'otros' | 'obra-social'> = {
      dni: 'basicos',
      telefono: 'basicos',
      nombre: 'basicos',
      apellido: 'basicos',
      fechaNacimiento: 'basicos',
      sexo: 'basicos',
      email: 'otros',
      profesion: 'otros',
      domicilio: 'otros',
      nacionalidad: 'otros',
      estadoCivil: 'otros',
      obraSocialNombre: 'obra-social',
      obraSocialPlan: 'obra-social',
      obraSocialNroAfiliado: 'obra-social',
    };

    for (const controlName of Object.keys(this.form.controls)) {
      if (this.form.controls[controlName as keyof typeof this.form.controls].invalid) {
        this.setActiveSection(sectionByControl[controlName] ?? 'basicos');
        return;
      }
    }
  }
}
