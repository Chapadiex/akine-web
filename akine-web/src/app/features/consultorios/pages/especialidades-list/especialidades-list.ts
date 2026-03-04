import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Especialidad } from '../../models/especialidad.models';
import { EspecialidadService } from '../../services/especialidad.service';

@Component({
  selector: 'app-especialidades-list',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h3>Especialidades</h3>
          <p>Configuración de especialidades habilitadas por consultorio.</p>
        </div>
        @if (canWrite()) {
          <button class="btn-primary" (click)="openCreate()">+ Agregar especialidad</button>
        }
      </div>

      <div class="toolbar">
        <input
          type="text"
          placeholder="Buscar especialidad..."
          [ngModel]="search()"
          (ngModelChange)="onSearchChange($event)"
        />
        <label class="check">
          <input type="checkbox" [ngModel]="includeInactive()" (ngModelChange)="onToggleIncludeInactive($event)" />
          Mostrar inactivas
        </label>
      </div>

      @if (loading()) {
        <p class="empty">Cargando especialidades...</p>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th class="col-actions">Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td>{{ item.nombre }}</td>
                <td>
                  <span class="badge" [class.badge-active]="item.activo">
                    {{ item.activo ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="col-actions">
                  @if (canWrite()) {
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
                <td colspan="3" class="empty">No hay especialidades para el filtro actual.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="closeCreate()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h4>Agregar especialidad</h4>
          <div class="field">
            <label>Nombre</label>
            <input type="text" maxlength="80" [ngModel]="newNombre()" (ngModelChange)="newNombre.set($event)" />
            @if (formError()) {
              <small>{{ formError() }}</small>
            }
          </div>
          <div class="actions">
            <button class="btn-secondary" (click)="closeCreate()">Cancelar</button>
            <button class="btn-primary" (click)="saveCreate()" [disabled]="saving()">Guardar</button>
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
    .table { width: 100%; border-collapse: collapse; background: var(--surface, var(--white)); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .table th, .table td { padding: .65rem; border-bottom: 1px solid var(--border); font-size: .86rem; }
    .table th { text-align: left; color: var(--text-muted); font-weight: 600; }
    .table tr:last-child td { border-bottom: 0; }
    .col-actions { text-align: right; width: 180px; }
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
  readonly showModal = signal(false);
  readonly newNombre = signal('');
  readonly formError = signal('');
  readonly saving = signal(false);
  readonly loadingActionId = signal('');
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));

  private consultorioId = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.consultorioId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    if (!this.consultorioId) {
      this.loading.set(false);
      this.toast.error('No se encontró el consultorio.');
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
    this.formError.set('');
    this.newNombre.set('');
    this.showModal.set(true);
  }

  closeCreate(): void {
    this.showModal.set(false);
    this.saving.set(false);
    this.formError.set('');
    this.newNombre.set('');
  }

  saveCreate(): void {
    const nombre = (this.newNombre() ?? '').trim();
    if (nombre.length < 3 || nombre.length > 80) {
      this.formError.set('El nombre debe tener entre 3 y 80 caracteres.');
      return;
    }
    const slug = this.toSlug(nombre);
    if (!slug) {
      this.formError.set('El nombre no es válido.');
      return;
    }
    const exists = this.items().some((x) => x.slug === slug);
    if (exists) {
      this.formError.set('Ya existe una especialidad con ese nombre en este consultorio.');
      return;
    }

    this.saving.set(true);
    this.svc.create(this.consultorioId, { nombre }).subscribe({
      next: () => {
        this.toast.success('Especialidad agregada');
        this.closeCreate();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.toFriendlyError(err));
      },
    });
  }

  toggleEstado(item: Especialidad): void {
    if (!this.canWrite()) return;
    this.loadingActionId.set(item.id);
    const op$ = item.activo
      ? this.svc.deactivate(this.consultorioId, item.id)
      : this.svc.activate(this.consultorioId, item.id);
    op$.subscribe({
      next: (updated) => {
        this.items.set(this.items().map((it) => (it.id === updated.id ? updated : it)));
        this.loadingActionId.set('');
        this.toast.success(item.activo ? 'Especialidad desactivada' : 'Especialidad activada');
      },
      error: (err) => {
        this.loadingActionId.set('');
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
      return 'El backend no tiene habilitado el módulo de especialidades en este entorno. Reiniciá/actualizá la API.';
    }
    return this.errMap.toMessage(err);
  }
}
