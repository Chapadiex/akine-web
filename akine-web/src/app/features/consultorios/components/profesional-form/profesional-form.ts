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

@Component({
  selector: 'app-profesional-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h3 class="panel-title">{{ editItem() ? 'Editar Profesional' : 'Nuevo Profesional' }}</h3>

        <div class="tabs">
          <button type="button" [class.active]="tab() === 'personales'" (click)="tab.set('personales')">Datos personales</button>
          <button type="button" [class.active]="tab() === 'profesionales'" (click)="tab.set('profesionales')">Datos profesionales</button>
          <button type="button" [class.active]="tab() === 'estado'" (click)="tab.set('estado')">Estado</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (tab() === 'personales') {
            <div class="row">
              <div class="field">
                <label>DNI *</label>
                <input formControlName="nroDocumento" maxlength="10" placeholder="Solo numeros" />
                @if (form.controls.nroDocumento.touched && form.controls.nroDocumento.invalid) {
                  <small>DNI invalido (7 a 10 digitos).</small>
                }
              </div>
              <div class="field">
                <label>Email</label>
                <input formControlName="email" type="email" placeholder="profesional@mail.com" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <small>Email invalido.</small>
                }
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Nombre *</label>
                <input formControlName="nombre" />
              </div>
              <div class="field">
                <label>Apellido *</label>
                <input formControlName="apellido" />
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Telefono</label>
                <input formControlName="telefono" placeholder="Ej: 1155550000" />
              </div>
              <div class="field">
                <label>Fecha alta</label>
                <input formControlName="fechaAlta" type="date" />
              </div>
            </div>
            <div class="field">
              <label>Domicilio</label>
              <input formControlName="domicilio" />
            </div>
            <div class="field">
              <label>Foto perfil (URL)</label>
              <input formControlName="fotoPerfilUrl" />
            </div>
          }

          @if (tab() === 'profesionales') {
            <div class="field">
              <label>Matricula *</label>
              <input formControlName="matricula" placeholder="Ej: MP-1234" />
            </div>

            <div class="field">
              <label>Especialidades *</label>

              <div class="chips">
                @for (e of especialidades(); track e) {
                  <span class="chip">{{ e }} <button type="button" (click)="removeEspecialidad(e)">x</button></span>
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
                      <li
                        role="option"
                        (mousedown)="$event.preventDefault(); addFromCatalog(opt.nombre)"
                      >{{ opt.nombre }}</li>
                    }
                  </ul>
                }

                @if (dropdownOpen() && filteredOptions().length === 0 && especialidadInput().trim()) {
                  <div class="dropdown dropdown-hint">
                    <span>Presiona Enter para agregar "{{ especialidadInput().trim() }}"</span>
                  </div>
                }
              </div>

              @if (showEspecialidadesError()) {
                <small>Debe seleccionar al menos una especialidad.</small>
              }
            </div>
          }

          @if (tab() === 'estado') {
            <div class="field-inline">
              <label>Activo</label>
              <input type="checkbox" formControlName="activo" />
            </div>
            @if (!form.controls.activo.value) {
              <div class="row">
                <div class="field">
                  <label>Fecha de baja *</label>
                  <input formControlName="fechaBaja" type="date" />
                </div>
                <div class="field">
                  <label>Motivo de baja *</label>
                  <input formControlName="motivoBaja" />
                </div>
              </div>
            }
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
    .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / .4); display: flex; justify-content: center; align-items: flex-start; padding-top: 4vh; z-index: 900; }
    .panel { background: var(--white); border-radius: var(--radius-lg); padding: 1.25rem; width: min(760px, 96vw); box-shadow: var(--shadow-lg); }
    .panel-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; }
    .tabs { display: flex; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tabs button { border: 1px solid var(--border); background: var(--white); border-radius: var(--radius); padding: .4rem .7rem; cursor: pointer; font-size: .85rem; }
    .tabs button.active { border-color: var(--primary); color: var(--primary); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; margin-bottom: .9rem; }
    .field-inline { display: flex; align-items: center; gap: .5rem; margin-bottom: .9rem; }
    .field label { font-size: .84rem; font-weight: 600; color: var(--text-muted); }
    .field input { padding: .55rem .75rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: .95rem; }
    .field small { color: var(--error); font-size: .78rem; }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .4rem; min-height: 1.5rem; }
    .chip { border-radius: 999px; background: var(--bg); padding: .2rem .5rem; font-size: .8rem; display: inline-flex; align-items: center; gap: .35rem; }
    .chip button { border: 0; background: transparent; cursor: pointer; color: var(--text-muted); font-size: .75rem; }
    .combobox { position: relative; }
    .combobox-input { width: 100%; padding: .55rem .75rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: .95rem; box-sizing: border-box; }
    .combobox-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent); }
    .dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-lg); z-index: 100; list-style: none; margin: 0; padding: .25rem 0; max-height: 200px; overflow-y: auto; }
    .dropdown li { padding: .5rem .75rem; cursor: pointer; font-size: .9rem; }
    .dropdown li:hover { background: var(--bg); }
    .dropdown-hint { padding: .5rem .75rem; font-size: .82rem; color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; gap: .7rem; margin-top: 1rem; }
    .btn-cancel { padding: .5rem 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--white); cursor: pointer; }
    .btn-save { padding: .5rem 1rem; border: none; border-radius: var(--radius); background: var(--primary); color: #fff; font-weight: 600; cursor: pointer; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
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

  readonly tab = signal<'personales' | 'profesionales' | 'estado'>('personales');
  readonly especialidadInput = signal('');
  readonly especialidades = signal<string[]>([]);
  readonly submitted = signal(false);
  readonly dropdownOpen = signal(false);
  readonly catalogoEspecialidades = signal<{ id: string; nombre: string; activo: boolean }[]>([]);

  readonly showEspecialidadesError = computed(
    () => this.submitted() && this.especialidades().length === 0,
  );

  readonly filteredOptions = computed(() => {
    const q = this.especialidadInput().toLowerCase();
    const selected = new Set(this.especialidades().map((e) => e.toLowerCase()));
    return this.catalogoEspecialidades()
      .filter((e) => e.activo)
      .filter((e) => !selected.has(e.nombre.toLowerCase()))
      .filter((e) => !q || e.nombre.toLowerCase().includes(q));
  });

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    nroDocumento: ['', [Validators.required, Validators.pattern(/^[0-9]{7,10}$/)]],
    matricula: ['', Validators.required],
    email: ['', Validators.email],
    telefono: ['', Validators.pattern(/^[0-9+\-()\s]{6,30}$/)],
    domicilio: [''],
    fotoPerfilUrl: [''],
    fechaAlta: [new Date().toISOString().slice(0, 10)],
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
      const item = this.editItem();
      if (!item) {
        this.form.reset({
          nombre: '',
          apellido: '',
          nroDocumento: '',
          matricula: '',
          email: '',
          telefono: '',
          domicilio: '',
          fotoPerfilUrl: '',
          fechaAlta: new Date().toISOString().slice(0, 10),
          activo: true,
          fechaBaja: '',
          motivoBaja: '',
        });
        this.especialidades.set([]);
        return;
      }

      this.form.patchValue({
        nombre: item.nombre ?? '',
        apellido: item.apellido ?? '',
        nroDocumento: item.nroDocumento ?? '',
        matricula: item.matricula ?? '',
        email: item.email ?? '',
        telefono: item.telefono ?? '',
        domicilio: item.domicilio ?? '',
        fotoPerfilUrl: item.fotoPerfilUrl ?? '',
        fechaAlta: item.fechaAlta ?? new Date().toISOString().slice(0, 10),
        activo: item.activo,
        fechaBaja: item.fechaBaja ?? '',
        motivoBaja: item.motivoBaja ?? '',
      });
      this.especialidades.set(item.especialidades ?? []);
    });
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
    if (this.form.invalid || this.especialidades().length === 0) return;

    const v = this.form.getRawValue();
    if (!v.activo && (!v.fechaBaja || !v.motivoBaja?.trim())) return;

    const req: ProfesionalRequest = {
      nombre: v.nombre,
      apellido: v.apellido,
      nroDocumento: v.nroDocumento || undefined,
      matricula: v.matricula,
      especialidad: this.especialidades()[0],
      especialidades: this.especialidades().join('|'),
      email: v.email || undefined,
      telefono: v.telefono || undefined,
      domicilio: v.domicilio || undefined,
      fotoPerfilUrl: v.fotoPerfilUrl || undefined,
    };
    this.saved.emit(req);
    this.savedEstado.emit({
      activo: v.activo,
      fechaDeBaja: v.fechaBaja || undefined,
      motivoDeBaja: v.motivoBaja || undefined,
    });
  }
}
