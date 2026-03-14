import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ConsultorioForm } from '../../components/consultorio-form/consultorio-form';
import { Consultorio, ConsultorioRequest } from '../../models/consultorio.models';
import { ConsultorioService } from '../../services/consultorio.service';

@Component({
  selector: 'app-consultorio-list',
  standalone: true,
  imports: [RouterLink, ConsultorioForm, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Consultorios</h1>
        @if (isAdmin()) {
          <button class="btn-primary" (click)="showForm.set(true)">+ Nuevo</button>
        }
      </div>

      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (visibleItems().length === 0) {
        <p class="empty-msg">No hay consultorios registrados.</p>
      } @else {
        <div class="table-wrap">
          <table class="app-data-table">
            <thead>
              <tr>
                <th class="col-text">Nombre</th><th class="col-text-short">CUIT</th><th class="col-text-short">Teléfono</th>
                <th class="col-text">Email</th><th class="col-status">Estado</th><th class="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (c of visibleItems(); track c.id) {
                <tr>
                  <td class="col-text">
                    <a [routerLink]="['/app/consultorios', c.id]" class="link">{{ c.name }}</a>
                  </td>
                  <td class="col-text-short">{{ c.cuit ?? '-' }}</td>
                  <td class="col-text-short">{{ c.phone ?? '-' }}</td>
                  <td class="col-text">{{ c.email ?? '-' }}</td>
                  <td class="col-status">
                    <span class="badge" [class.badge-active]="c.status === 'ACTIVE'">
                      {{ c.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="col-actions actions-cell">
                    @if (canEdit(c)) {
                      <button class="table-row-action" title="Editar" (click)="startEdit(c)">Editar</button>
                    }
                    @if (isAdmin() && c.status === 'ACTIVE') {
                      <button class="table-row-action table-row-action--danger" title="Dar de baja" (click)="startDelete(c)">Baja</button>
                    }
                    @if (isAdmin() && c.status !== 'ACTIVE') {
                      <button class="table-row-action table-row-action--success" title="Reactivar" (click)="startActivate(c)">Reactivar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (showForm()) {
      <app-consultorio-form
        [editItem]="editTarget()"
        (saved)="onSaved($event)"
        (cancelled)="closeForm()"
      />
    }

    @if (deleteTarget()) {
      <app-confirm-dialog
        title="Dar de baja consultorio"
        [message]="'�Dar de baja ' + deleteTarget()!.name + '? El consultorio quedar� inactivo.'"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      />
    }

    @if (activateTarget()) {
      <app-confirm-dialog
        title="Reactivar consultorio"
        [message]="'¿Reactivar ' + activateTarget()!.name + '?'"
        (confirmed)="confirmActivate()"
        (cancelled)="activateTarget.set(null)"
      />
    }

    @if (defaultTarget()) {
      <app-confirm-dialog
        title="Consultorio predeterminado"
        [message]="'¿Desea utilizar ' + defaultTarget()!.name + ' como consultorio predeterminado?'"
        variant="primary"
        confirmLabel="Sí"
        (confirmed)="confirmSetDefault()"
        (cancelled)="declineSetDefault()"
      />
    }
  `,
  styles: [`
    .page { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 700; }
    .btn-primary {
      padding: .55rem 1.1rem; background: var(--primary); color: #fff;
      border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer;
    }
    .btn-primary:hover { background: var(--primary-hover); }
    .loading-msg, .empty-msg { color: var(--text-muted); text-align: center; margin-top: 3rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--white);
            border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    th { background: var(--bg); padding: .75rem 1rem; text-align: left;
         font-size: .8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    td { padding: .75rem 1rem; border-top: 1px solid var(--border); font-size: .9rem; }
    .link { color: var(--primary); text-decoration: none; font-weight: 600; }
    .link:hover { text-decoration: underline; }
    .badge { padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
             background: var(--bg); color: var(--text-muted); }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .actions-cell { min-width: 220px; }
  `],
})
export class ConsultorioListPage implements OnInit {
  private svc = inject(ConsultorioService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private consultorioCtx = inject(ConsultorioContextService);

  items = signal<Consultorio[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editTarget = signal<Consultorio | null>(null);
  deleteTarget = signal<Consultorio | null>(null);
  activateTarget = signal<Consultorio | null>(null);
  defaultTarget = signal<Consultorio | null>(null);

  isAdmin = () => this.auth.hasRole('ADMIN');
  canEdit = (c: Consultorio) => c.status === 'ACTIVE' && this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');
  visibleItems = () => this.isAdmin() ? this.items() : this.items().filter((c) => c.status === 'ACTIVE');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.loading.set(false); },
    });
  }

  startEdit(c: Consultorio): void {
    this.editTarget.set(c);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editTarget.set(null);
  }

  onSaved(req: ConsultorioRequest): void {
    const target = this.editTarget();
    const obs = target
      ? this.svc.update(target.id, req)
      : this.svc.create(req);

    obs.subscribe({
      next: (saved) => {
        this.closeForm();
        this.load();

        if (target) {
          // Edit mode — no default selection logic
          this.toast.success('Guardado correctamente');
          return;
        }

        // Creation mode — check if this is the first consultorio
        const hadConsultorios = this.consultorioCtx.consultorios().length > 0;
        if (!hadConsultorios) {
          // Rule 1: first consultorio → auto-select
          this.consultorioCtx.reloadAndSelect(saved.id);
          this.toast.success('Consultorio creado y seleccionado como predeterminado.');
        } else {
          // Rule 2: already has consultorios → ask user
          this.defaultTarget.set(saved);
        }
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  confirmSetDefault(): void {
    const target = this.defaultTarget();
    if (!target) return;
    this.consultorioCtx.reloadAndSelect(target.id);
    this.toast.success('Consultorio creado y seleccionado como predeterminado.');
    this.defaultTarget.set(null);
  }

  declineSetDefault(): void {
    const target = this.defaultTarget();
    if (!target) return;
    this.consultorioCtx.reloadAndSelect();
    this.toast.success('Consultorio creado correctamente.');
    this.defaultTarget.set(null);
  }

  startDelete(c: Consultorio): void {
    this.deleteTarget.set(c);
  }

  startActivate(c: Consultorio): void {
    this.activateTarget.set(c);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.svc.inactivate(target.id).subscribe({
      next: () => {
        this.toast.success('Consultorio dado de baja');
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.deleteTarget.set(null); },
    });
  }

  confirmActivate(): void {
    const target = this.activateTarget();
    if (!target) return;
    this.svc.activate(target.id).subscribe({
      next: () => {
        this.toast.success('Consultorio reactivado');
        this.activateTarget.set(null);
        this.load();
      },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.activateTarget.set(null); },
    });
  }
}
