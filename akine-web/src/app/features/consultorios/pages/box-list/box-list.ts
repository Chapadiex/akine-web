import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { BoxCapacidadForm, BoxCapacidadPayload } from '../../components/box-capacidad-form/box-capacidad-form';
import { BoxForm } from '../../components/box-form/box-form';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Box, BoxRequest } from '../../models/consultorio.models';
import { BoxService } from '../../services/box.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-box-list',
  standalone: true,
  imports: [BoxForm, ConfirmDialog, BoxCapacidadForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-page">
      <div class="sub-header">
        <span class="sub-count">{{ items().length }} box(es)</span>
        @if (canWrite()) {
          <button class="btn-primary" (click)="startCreate()">+ Nuevo Box</button>
        }
      </div>

      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (items().length === 0) {
        <p class="empty-msg">No hay boxes registrados.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Tipo</th><th>Capacidad</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              @for (b of items(); track b.id) {
                <tr>
                  <td>{{ b.nombre }}</td>
                  <td>{{ b.tipo }}</td>
                  <td>
                    @if (b.capacityType === 'LIMITED') {
                      {{ b.capacity ?? 0 }}
                    } @else {
                      Sin limite
                    }
                  </td>
                  <td>
                    <span class="badge" [class.badge-active]="b.activo">
                      {{ b.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    @if (canWrite()) {
                      <button
                        class="action-btn"
                        title="Editar box"
                        aria-label="Editar box"
                        (click)="startEdit(b)"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                          <path d="M3 17.25V21h3.75L19.8 7.95l-3.75-3.75L3 17.25z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                          <path d="M14.5 5.5 18.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        </svg>
                        <span>Editar</span>
                      </button>
                    }

                    @if (canWrite() && b.activo) {
                      <button
                        class="action-btn"
                        title="Configurar capacidad"
                        aria-label="Configurar capacidad"
                        (click)="startCapacidad(b)"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                          <path d="M4 19.5h16M7 17V10M12 17V6M17 17v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <span>Capacidad</span>
                      </button>
                      <button
                        class="action-btn action-btn-danger"
                        title="Dar de baja"
                        aria-label="Dar de baja"
                        (click)="startDelete(b)"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                          <path d="M4 7h16M9 7V5h6v2M8 7l.7 11h6.6L16 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                          <path d="M10.5 10.5v5M13.5 10.5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        </svg>
                        <span>Baja</span>
                      </button>
                    } @else if (!canWrite()) {
                      <span class="actions-empty">-</span>
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
      <app-box-form
        [editItem]="editTarget()"
        (saved)="onSaved($event)"
        (cancelled)="closeForm()"
      />
    }

    @if (deleteTarget()) {
      <app-confirm-dialog
        title="Dar de baja box"
        [message]="'Dar de baja ' + deleteTarget()!.nombre + '?'"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      />
    }

    @if (capacityTarget()) {
      <app-box-capacidad-form
        [capacityType]="capacityTarget()!.capacityType"
        [capacity]="capacityTarget()!.capacity"
        (saved)="confirmCapacidad($event)"
        (cancelled)="capacityTarget.set(null)"
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
    .actions-cell { width: 320px; }
    .actions-empty { color: var(--text-muted); }
    .action-btn {
      height: 30px; border-radius: 9px;
      border: 1px solid var(--border); background: var(--white);
      display: inline-flex; align-items: center; gap: .35rem;
      padding: 0 .5rem;
      margin-right: .35rem;
      color: var(--text-muted); cursor: pointer;
      transition: all .15s ease;
      font-size: .82rem;
      font-weight: 700;
      line-height: 1;
    }
    .action-btn:last-child { margin-right: 0; }
    .action-btn:hover {
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 8%, var(--white));
    }
    .action-btn-danger:hover {
      border-color: color-mix(in srgb, var(--error) 35%, var(--border));
      color: var(--error);
      background: var(--error-bg);
    }
  `],
})
export class BoxListPage implements OnInit {
  private route   = inject(ActivatedRoute);
  private svc     = inject(BoxService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private errMap  = inject(ErrorMapperService);

  items        = signal<Box[]>([]);
  loading      = signal(true);
  showForm     = signal(false);
  editTarget   = signal<Box | null>(null);
  deleteTarget = signal<Box | null>(null);
  capacityTarget = signal<Box | null>(null);

  private consultorioId = '';

  canWrite = () => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.loading.set(false);
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list(this.consultorioId).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err)  => { this.toast.error(this.errMap.toMessage(err)); this.loading.set(false); },
    });
  }

  startCreate(): void {
    this.editTarget.set(null);
    this.showForm.set(true);
  }

  startEdit(item: Box): void {
    this.editTarget.set(item);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editTarget.set(null);
  }

  onSaved(req: BoxRequest): void {
    const target = this.editTarget();
    const request$ = target
      ? this.svc.update(this.consultorioId, target.id, req)
      : this.svc.create(this.consultorioId, req);

    request$.subscribe({
      next: (updated) => {
        if (target && req.activo !== undefined && req.activo !== updated.activo) {
          if (req.activo) {
            this.svc.activate(this.consultorioId, target.id).subscribe({
              next: () => {
                this.toast.success('Box actualizado');
                this.closeForm();
                this.load();
              },
              error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                  this.toast.error('No se pudo activar el box: falta endpoint /activar en backend. Reinicia/actualiza API.');
                  return;
                }
                this.toast.error(this.errMap.toMessage(err));
              },
            });
          } else {
            this.svc.inactivate(this.consultorioId, target.id).subscribe({
              next: () => {
                this.toast.success('Box actualizado');
                this.closeForm();
                this.load();
              },
              error: (err: unknown) => this.toast.error(this.errMap.toMessage(err)),
            });
          }
          return;
        }

        this.toast.success(target ? 'Box actualizado' : 'Box creado');
        this.closeForm();
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  startDelete(b: Box): void { this.deleteTarget.set(b); }
  startCapacidad(b: Box): void { this.capacityTarget.set(b); }

  confirmDelete(): void {
    const t = this.deleteTarget();
    if (!t) return;
    this.svc.inactivate(this.consultorioId, t.id).subscribe({
      next: () => { this.toast.success('Box dado de baja'); this.deleteTarget.set(null); this.load(); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.deleteTarget.set(null); },
    });
  }

  confirmCapacidad(payload: BoxCapacidadPayload): void {
    const t = this.capacityTarget();
    if (!t) return;
    this.svc.updateCapacidad(this.consultorioId, t.id, payload.capacityType, payload.capacity).subscribe({
      next: () => { this.toast.success('Capacidad actualizada'); this.capacityTarget.set(null); this.load(); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.capacityTarget.set(null); },
    });
  }
}
