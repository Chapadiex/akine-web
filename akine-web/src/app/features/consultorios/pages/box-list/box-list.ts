import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { BoxCapacidadForm, BoxCapacidadPayload } from '../../components/box-capacidad-form/box-capacidad-form';
import { BoxForm } from '../../components/box-form/box-form';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { Box, BoxRequest } from '../../models/consultorio.models';
import { BoxService } from '../../services/box.service';

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
          <button class="btn-primary" (click)="showForm.set(true)">+ Nuevo Box</button>
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
              <tr><th>Nombre</th><th>Codigo</th><th>Tipo</th><th>Capacidad</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              @for (b of items(); track b.id) {
                <tr>
                  <td>{{ b.nombre }}</td>
                  <td>{{ b.codigo ?? '-' }}</td>
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
                  <td>
                    @if (canWrite() && b.activo) {
                      <button class="btn-icon" title="Capacidad" (click)="startCapacidad(b)">Capacidad</button>
                      <button class="btn-icon btn-danger" title="Dar de baja"
                              (click)="startDelete(b)">Baja</button>
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
      <app-box-form (saved)="onCreate($event)" (cancelled)="showForm.set(false)" />
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
    .btn-icon { background: none; border: none; cursor: pointer; font-size: .85rem; padding: .2rem .4rem;
                border-radius: var(--radius); }
    .btn-danger:hover { background: var(--error-bg); }
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
  deleteTarget = signal<Box | null>(null);
  capacityTarget = signal<Box | null>(null);

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

  onCreate(req: BoxRequest): void {
    this.svc.create(this.consultorioId, req).subscribe({
      next: () => { this.toast.success('Box creado'); this.showForm.set(false); this.load(); },
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
