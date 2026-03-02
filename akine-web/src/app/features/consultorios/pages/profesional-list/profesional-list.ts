import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { ProfesionalForm } from '../../components/profesional-form/profesional-form';
import { Profesional, ProfesionalRequest } from '../../models/consultorio.models';
import { ProfesionalService } from '../../services/profesional.service';

@Component({
  selector: 'app-profesional-list',
  standalone: true,
  imports: [ProfesionalForm, ConfirmDialog, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-page">
      <div class="sub-header">
        <span class="sub-count">{{ items().length }} profesional(es)</span>
        @if (canWrite()) {
          <button class="btn-primary" (click)="showForm.set(true)">+ Nuevo Profesional</button>
        }
      </div>

      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (items().length === 0) {
        <p class="empty-msg">No hay profesionales registrados.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Matricula</th><th>Especialidad</th>
                <th>Email</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of items(); track p.id) {
                <tr>
                  <td>{{ p.nombre }} {{ p.apellido }}</td>
                  <td>{{ p.matricula }}</td>
                  <td>{{ p.especialidad ?? '-' }}</td>
                  <td>{{ p.email ?? '-' }}</td>
                  <td>
                    <span class="badge" [class.badge-active]="p.activo">
                      {{ p.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <a class="btn-icon" [routerLink]="['../profesionales', p.id, 'disponibilidad']">Agenda</a>
                    @if (canWrite() && p.activo) {
                      <button class="btn-icon btn-danger" title="Dar de baja"
                              (click)="startDelete(p)">Baja</button>
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
      <app-profesional-form (saved)="onCreate($event)" (cancelled)="showForm.set(false)" />
    }

    @if (deleteTarget()) {
      <app-confirm-dialog
        title="Dar de baja profesional"
        [message]="'Dar de baja ' + deleteTarget()!.nombre + ' ' + deleteTarget()!.apellido + '?'"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      />
    }
  `,
  styles: [`
    .sub-page { }
    .sub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .sub-count { color: var(--text-muted); font-size: .9rem; }
    .btn-primary {
      padding: .45rem 1rem; background: var(--primary); color: #fff;
      border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: .875rem;
    }
    .btn-primary:hover { background: var(--primary-hover); }
    .loading-msg, .empty-msg { color: var(--text-muted); text-align: center; margin-top: 2rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--white);
            border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    th { background: var(--bg); padding: .7rem 1rem; text-align: left;
         font-size: .78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    td { padding: .7rem 1rem; border-top: 1px solid var(--border); font-size: .9rem; }
    .badge { padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
             background: var(--bg); color: var(--text-muted); }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: .85rem; padding: .2rem .4rem;
                border-radius: var(--radius); color: var(--primary); text-decoration: none; }
    .btn-danger { color: inherit; }
    .btn-danger:hover { background: var(--error-bg); }
  `],
})
export class ProfesionalListPage implements OnInit {
  private route   = inject(ActivatedRoute);
  private svc     = inject(ProfesionalService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private errMap  = inject(ErrorMapperService);

  items        = signal<Profesional[]>([]);
  loading      = signal(true);
  showForm     = signal(false);
  deleteTarget = signal<Profesional | null>(null);

  private consultorioId = '';

  canWrite = () => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');

  ngOnInit(): void {
    this.consultorioId = this.route.parent!.snapshot.paramMap.get('id')!;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list(this.consultorioId).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err)  => { this.toast.error(this.errMap.toMessage(err)); this.loading.set(false); },
    });
  }

  onCreate(req: ProfesionalRequest): void {
    this.svc.create(this.consultorioId, req).subscribe({
      next: () => { this.toast.success('Profesional creado'); this.showForm.set(false); this.load(); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  startDelete(p: Profesional): void { this.deleteTarget.set(p); }

  confirmDelete(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.svc.inactivate(this.consultorioId, t.id).subscribe({
      next: () => { this.toast.success('Profesional dado de baja'); this.deleteTarget.set(null); this.load(); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.deleteTarget.set(null); },
    });
  }
}
