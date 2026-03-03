import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
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
        @if (canWrite()) {
          <button class="btn-primary" (click)="showForm.set(true)">+ Nuevo</button>
        }
      </div>

      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (items().length === 0) {
        <p class="empty-msg">No hay consultorios registrados.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>CUIT</th><th>Teléfono</th>
                <th>Email</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (c of items(); track c.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/app/consultorios', c.id]" class="link">{{ c.name }}</a>
                  </td>
                  <td>{{ c.cuit ?? '—' }}</td>
                  <td>{{ c.phone ?? '—' }}</td>
                  <td>{{ c.email ?? '—' }}</td>
                  <td>
                    <span class="badge" [class.badge-active]="c.status === 'ACTIVE'">
                      {{ c.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    @if (canWrite()) {
                      <button class="btn-icon" title="Editar" (click)="startEdit(c)">✏️</button>
                      @if (c.status === 'ACTIVE') {
                        <button class="btn-icon btn-danger" title="Dar de baja"
                                (click)="startDelete(c)">🗑️</button>
                      }
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
        [message]="'¿Dar de baja ' + deleteTarget()!.name + '? El consultorio quedará inactivo.'"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
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
    .actions-cell { display: flex; gap: .5rem; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: .2rem .4rem;
                border-radius: var(--radius); }
    .btn-icon:hover { background: var(--bg); }
    .btn-danger:hover { background: var(--error-bg); }
  `],
})
export class ConsultorioListPage implements OnInit {
  private svc     = inject(ConsultorioService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private errMap  = inject(ErrorMapperService);
  private router  = inject(Router);

  items       = signal<Consultorio[]>([]);
  loading     = signal(true);
  showForm    = signal(false);
  editTarget  = signal<Consultorio | null>(null);
  deleteTarget = signal<Consultorio | null>(null);

  canWrite = () => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err)  => { this.toast.error(this.errMap.toMessage(err)); this.loading.set(false); },
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
      next: () => {
        this.toast.success('Guardado correctamente');
        this.closeForm();
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  startDelete(c: Consultorio): void {
    this.deleteTarget.set(c);
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
}
