import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Especialidad } from '../../models/especialidad.models';
import { EspecialidadService } from '../../services/especialidad.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-especialidades-list',
  standalone: true,
  imports: [FormsModule, PageSectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-section-header
        title="Especialidades"
        description="Configuraci&oacute;n de especialidades habilitadas por consultorio."
        titleLevel="h3"
      >
        <button
          header-actions
          class="btn-icon"
          type="button"
          aria-label="Mostrar u ocultar filtros"
          [attr.aria-expanded]="filtersExpanded()"
          (click)="toggleFilters()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        @if (canWrite()) {
          <button header-actions class="btn-primary" type="button" (click)="openCreate()">+ Agregar especialidad</button>
        }
      </app-page-section-header>

      @if (filtersExpanded()) {
        <div class="filters-panel">
          <label class="search-field">
            <span class="sr-only">Buscar especialidad</span>
            <input
              type="text"
              placeholder="Buscar especialidad..."
              [ngModel]="search()"
              (ngModelChange)="onSearchChange($event)"
            />
          </label>

          <label class="toggle" [class.toggle-active]="onlyActive()">
            <input
              type="checkbox"
              aria-label="Mostrar solo especialidades activas"
              [ngModel]="onlyActive()"
              (ngModelChange)="onOnlyActiveChange($event)"
            />
            <span class="toggle-control" aria-hidden="true">
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-copy">
              <strong>Solo activas</strong>
              <small>{{ onlyActive() ? 'Oculta las especialidades dadas de baja.' : 'Incluye tambien las dadas de baja.' }}</small>
            </span>
          </label>
        </div>
      }

      @if (loading()) {
        <p class="empty">Cargando especialidades...</p>
      } @else {
        <table class="table app-data-table">
          <thead>
            <tr>
              <th class="col-text">Nombre</th>
              <th class="col-status">Estado</th>
              <th class="col-actions">Accion</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td class="col-text">{{ item.nombre }}</td>
                <td class="col-status">
                  <span class="badge" [class.badge-active]="item.activo">
                    {{ item.activo ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="col-actions">
                  @if (canWrite()) {
                    <button
                      class="table-row-action"
                      type="button"
                      title="Editar especialidad"
                      aria-label="Editar especialidad"
                      (click)="openEdit(item)"
                    >
                      Editar
                    </button>
                  } @else {
                    <span class="muted">Solo lectura</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="empty">No hay especialidades para el filtro actual.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h4>{{ editTarget() ? 'Editar especialidad' : 'Nueva especialidad' }}</h4>
              <p>
                {{ editTarget()
                  ? 'Actualiza el nombre visible de la especialidad para este catalogo.'
                  : 'Agrega una nueva especialidad al catalogo del consultorio.' }}
              </p>
            </div>
            <button class="icon-btn" type="button" title="Cerrar" aria-label="Cerrar modal" (click)="closeModal()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div class="field">
            <label for="especialidad-nombre">Nombre</label>
            <input
              id="especialidad-nombre"
              type="text"
              maxlength="80"
              placeholder="Ej. Fisioterapia respiratoria"
              [ngModel]="newNombre()"
              (ngModelChange)="newNombre.set($event)"
            />
            @if (formError()) {
              <small>{{ formError() }}</small>
            }
          </div>

          <div class="actions">
            <button class="btn-secondary" type="button" (click)="closeModal()">Cancelar</button>
            <button class="btn-primary" type="button" (click)="saveModal()" [disabled]="saving()">
              {{ saving() ? 'Guardando...' : editTarget() ? 'Guardar cambios' : 'Guardar especialidad' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { display: grid; gap: 1rem; }
    .btn-primary {
      min-height: 2.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 .95rem;
      white-space: nowrap;
    }
    .btn-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--white);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
      cursor: pointer;
      transition: border-color .18s ease, background-color .18s ease, color .18s ease;
    }
    .btn-icon[aria-expanded='true'] {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, white);
      color: var(--primary);
    }
    .filters-panel {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto;
      gap: .8rem;
      align-items: center;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg, 16px) - 2px);
      background: color-mix(in srgb, var(--white) 92%, var(--bg));
    }
    .search-field { min-width: 260px; }
    .filters-panel input[type="text"] {
      width: 100%;
      min-width: 260px;
      padding: .5rem .65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
    }
    .filters-panel input[type="text"]:focus,
    .field input:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
    }
    .toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: .75rem;
      min-height: 48px;
      padding: .5rem .7rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg, 16px) - 2px);
      background: var(--white);
      cursor: pointer;
    }
    .toggle input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .toggle-control {
      width: 44px;
      height: 24px;
      padding: 2px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--border) 75%, var(--bg));
      display: inline-flex;
      align-items: center;
      transition: background .18s ease;
    }
    .toggle-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--white);
      box-shadow: 0 3px 8px rgb(15 23 42 / 18%);
      transition: transform .18s ease;
    }
    .toggle-copy { display: grid; gap: .1rem; }
    .toggle-copy strong { font-size: .84rem; color: var(--text); font-weight: 700; }
    .toggle-copy small { font-size: .73rem; color: var(--text-muted); }
    .toggle-active {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 7%, var(--white));
    }
    .toggle-active .toggle-control { background: var(--primary); }
    .toggle-active .toggle-thumb { transform: translateX(20px); }
    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface, var(--white));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .table th,
    .table td { padding: .65rem; border-bottom: 1px solid var(--border); font-size: .86rem; }
    .table th { text-align: left; color: var(--text-muted); font-weight: 600; }
    .table tr:last-child td { border-bottom: 0; }
    .badge {
      padding: .2rem .55rem;
      border-radius: 999px;
      background: var(--bg);
      color: var(--text-muted);
      font-size: .75rem;
    }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .btn-primary,
    .btn-secondary {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: .45rem .75rem;
      cursor: pointer;
      font-size: .84rem;
      background: var(--white);
    }
    .btn-primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
      font-weight: 600;
    }
    .btn-primary:disabled,
    .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }
    .muted { color: var(--text-muted); font-size: .8rem; }
    .empty { color: var(--text-muted); text-align: center; padding: 1rem; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / 35%);
      display: grid;
      place-items: center;
      z-index: 900;
    }
    .modal {
      width: min(520px, 92vw);
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: 1rem;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border);
      display: grid;
      gap: .85rem;
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: .8rem;
    }
    .modal h4 { margin: 0 0 .25rem; font-size: 1rem; }
    .modal p { margin: 0; color: var(--text-muted); font-size: .82rem; line-height: 1.4; }
    .field { display: grid; gap: .35rem; }
    .field label { font-size: .84rem; color: var(--text-muted); font-weight: 600; }
    .field input {
      padding: .52rem .65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .field small { color: var(--error); font-size: .78rem; }
    .actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .1rem; }
    .icon-btn {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--white);
      display: inline-grid;
      place-items: center;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 1.2rem;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (max-width: 720px) {
      .header { flex-direction: column; align-items: stretch; }
      .header-actions { justify-content: space-between; }
      .header .btn-primary { flex: 1; }
      .filters-panel { grid-template-columns: 1fr; }
      .toggle { width: 100%; }
    }
  `],
})
export class EspecialidadesListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(EspecialidadService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private auth = inject(AuthService);

  readonly items = signal<Especialidad[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly includeInactive = signal(false);
  readonly filtersExpanded = signal(false);
  readonly showModal = signal(false);
  readonly editTarget = signal<Especialidad | null>(null);
  readonly newNombre = signal('');
  readonly formError = signal('');
  readonly saving = signal(false);
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));
  readonly onlyActive = computed(() => !this.includeInactive());

  private consultorioId = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.loading.set(false);
      this.toast.error('No se encontro el consultorio.');
      return;
    }
    this.load();
  }

  toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 250);
  }

  onOnlyActiveChange(value: boolean): void {
    this.includeInactive.set(!value);
    this.load();
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.formError.set('');
    this.newNombre.set('');
    this.showModal.set(true);
  }

  openEdit(item: Especialidad): void {
    this.editTarget.set(item);
    this.formError.set('');
    this.newNombre.set(item.nombre);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editTarget.set(null);
    this.saving.set(false);
    this.formError.set('');
    this.newNombre.set('');
  }

  saveModal(): void {
    const nombre = (this.newNombre() ?? '').trim();
    if (nombre.length < 3 || nombre.length > 80) {
      this.formError.set('El nombre debe tener entre 3 y 80 caracteres.');
      return;
    }

    const slug = this.toSlug(nombre);
    if (!slug) {
      this.formError.set('El nombre no es valido.');
      return;
    }

    const target = this.editTarget();
    const exists = this.items().some((item) => item.slug === slug && item.id !== target?.id);
    if (exists) {
      this.formError.set('Ya existe una especialidad con ese nombre en este consultorio.');
      return;
    }

    this.saving.set(true);

    const request$ = target
      ? this.svc.update(this.consultorioId, target.id, { nombre })
      : this.svc.create(this.consultorioId, { nombre });

    request$.subscribe({
      next: (saved) => {
        if (target) {
          this.items.set(this.items().map((item) => (item.id === saved.id ? saved : item)));
          this.toast.success('Especialidad actualizada');
        } else {
          this.toast.success('Especialidad agregada');
          this.load();
        }
        this.closeModal();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.toFriendlyError(err));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list(this.consultorioId, {
      search: this.search(),
      includeInactive: this.includeInactive(),
    }).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.toFriendlyError(err));
      },
    });
  }

  private toSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/g, '')
      .replace(/-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private toFriendlyError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 404) {
      return 'El backend no tiene habilitado el modulo de especialidades en este entorno. Reinicia o actualiza la API.';
    }
    return this.errMap.toMessage(err);
  }
}
