import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { CargoEmpleadoCatalogo } from '../../../colaboradores/models/colaboradores.models';
import { ColaboradoresService } from '../../../colaboradores/services/colaboradores.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-cargos-empleado-list',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h3>Cargos de empleado</h3>
          <p>ABM de cargos administrativos reutilizables en altas y ediciones de empleados.</p>
        </div>
        @if (canWrite()) {
          <button class="btn-primary" (click)="openCreate()">+ Agregar cargo</button>
        }
      </div>

      <div class="toolbar">
        <input
          type="text"
          placeholder="Buscar cargo..."
          [ngModel]="search()"
          (ngModelChange)="onSearchChange($event)"
        />
        <label class="check">
          <input type="checkbox" [ngModel]="includeInactive()" (ngModelChange)="onToggleIncludeInactive($event)" />
          Mostrar inactivos
        </label>
      </div>

      @if (loading()) {
        <p class="empty">Cargando cargos...</p>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Slug</th>
              <th>Estado</th>
              <th class="col-actions">Accion</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>{{ item.nombre }}</td>
                <td><code>{{ item.slug }}</code></td>
                <td>
                  <span class="badge" [class.badge-active]="item.activo">
                    {{ item.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="col-actions">
                  @if (canWrite()) {
                    <button class="btn-secondary" (click)="openEdit(item)">Editar</button>
                    <button class="btn-secondary" (click)="toggleEstado(item)" [disabled]="loadingActionId() === item.id">
                      {{ item.activo ? 'Desactivar' : 'Activar' }}
                    </button>
                  } @else {
                    <span class="muted">Solo lectura</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">No hay cargos para el filtro actual.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h4>{{ editingId() ? 'Editar cargo' : 'Agregar cargo' }}</h4>
          <div class="field">
            <label>Nombre</label>
            <input type="text" maxlength="80" [ngModel]="newNombre()" (ngModelChange)="newNombre.set($event)" />
            @if (formError()) {
              <small>{{ formError() }}</small>
            }
          </div>
          <div class="actions">
            <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">Guardar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { display: grid; gap: 1rem; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .header h3 { margin: 0; font-size: 1.15rem; font-weight: 700; }
    .header p { margin: .15rem 0 0; color: var(--text-muted); font-size: .85rem; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: .8rem; flex-wrap: wrap; }
    .toolbar input[type="text"] {
      flex: 1; min-width: 260px; padding: .5rem .65rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white);
    }
    .check { display: inline-flex; align-items: center; gap: .45rem; font-size: .85rem; color: var(--text); }
    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface, var(--white));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .table th, .table td { padding: .65rem; border-bottom: 1px solid var(--border); font-size: .86rem; }
    .table th { text-align: left; color: var(--text-muted); font-weight: 600; }
    .table tr:last-child td { border-bottom: 0; }
    .col-actions { text-align: right; width: 250px; }
    .col-actions .btn-secondary + .btn-secondary { margin-left: .4rem; }
    .badge { padding: .2rem .55rem; border-radius: 999px; background: var(--bg); color: var(--text-muted); font-size: .75rem; }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .btn-primary, .btn-secondary {
      border: 1px solid var(--border); border-radius: var(--radius); padding: .45rem .75rem; cursor: pointer;
      font-size: .84rem; background: var(--white);
    }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }
    .muted { color: var(--text-muted); font-size: .8rem; }
    .empty { color: var(--text-muted); text-align: center; padding: 1rem; }
    .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 35%); display: grid; place-items: center; z-index: 900; }
    .modal { width: min(480px, 92vw); background: var(--white); border-radius: var(--radius-lg); padding: 1rem; box-shadow: var(--shadow-lg); }
    .modal h4 { margin: 0 0 .8rem; font-size: 1rem; }
    .field { display: grid; gap: .35rem; }
    .field label { font-size: .84rem; color: var(--text-muted); font-weight: 600; }
    .field input { padding: .52rem .65rem; border: 1px solid var(--border); border-radius: var(--radius); }
    .field small { color: var(--error); font-size: .78rem; }
    .actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .95rem; }
  `],
})
export class CargosEmpleadoListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(ColaboradoresService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private auth = inject(AuthService);

  readonly items = signal<CargoEmpleadoCatalogo[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly includeInactive = signal(false);
  readonly showModal = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly newNombre = signal('');
  readonly formError = signal('');
  readonly saving = signal(false);
  readonly loadingActionId = signal('');
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));

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

  onSearchChange(value: string): void {
    this.search.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 250);
  }

  onToggleIncludeInactive(value: boolean): void {
    this.includeInactive.set(!!value);
    this.load();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.newNombre.set('');
    this.showModal.set(true);
  }

  openEdit(item: CargoEmpleadoCatalogo): void {
    this.editingId.set(item.id);
    this.formError.set('');
    this.newNombre.set(item.nombre);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
    this.saving.set(false);
    this.formError.set('');
    this.newNombre.set('');
  }

  save(): void {
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

    const editingId = this.editingId();
    const exists = this.items().some((x) => x.slug === slug && x.id !== editingId);
    if (exists) {
      this.formError.set('Ya existe un cargo con ese nombre.');
      return;
    }

    this.saving.set(true);
    const request$ = editingId
      ? this.svc.updateCargoEmpleado(this.consultorioId, editingId, { nombre })
      : this.svc.createCargoEmpleado(this.consultorioId, { nombre });

    request$.subscribe({
      next: () => {
        this.toast.success(editingId ? 'Cargo actualizado' : 'Cargo agregado');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.toFriendlyError(err));
      },
    });
  }

  toggleEstado(item: CargoEmpleadoCatalogo): void {
    if (!this.canWrite()) return;
    this.loadingActionId.set(item.id);
    const op$ = item.activo
      ? this.svc.deactivateCargoEmpleado(this.consultorioId, item.id)
      : this.svc.activateCargoEmpleado(this.consultorioId, item.id);
    op$.subscribe({
      next: (updated) => {
        this.items.set(this.items().map((it) => (it.id === updated.id ? updated : it)));
        this.loadingActionId.set('');
        this.toast.success(item.activo ? 'Cargo desactivado' : 'Cargo activado');
      },
      error: (err) => {
        this.loadingActionId.set('');
        this.toast.error(this.toFriendlyError(err));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.svc.listCargosEmpleado(this.consultorioId, {
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
      return 'El backend no tiene habilitado el modulo de cargos de empleado en este entorno.';
    }
    return this.errMap.toMessage(err);
  }
}
