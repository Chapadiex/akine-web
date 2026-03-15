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
import { BoxForm } from '../../components/box-form/box-form';
import { Box, BoxRequest } from '../../models/consultorio.models';
import { ConsultorioCompletenessRefreshService } from '../../services/consultorio-completeness-refresh.service';
import { BoxService } from '../../services/box.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-box-list',
  standalone: true,
  imports: [BoxForm],
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
          <table class="app-data-table">
            <thead>
              <tr><th class="col-text">Nombre</th><th class="col-text-short">Tipo</th><th class="col-numeric">Capacidad</th><th class="col-status">Estado</th><th class="col-actions">Acciones</th></tr>
            </thead>
            <tbody>
              @for (b of items(); track b.id) {
                <tr>
                  <td class="col-text">{{ b.nombre }}</td>
                  <td class="col-text-short">{{ b.tipo }}</td>
                  <td class="col-numeric">
                    @if (b.capacityType === 'LIMITED') {
                      {{ b.capacity ?? 0 }}
                    } @else {
                      Sin limite
                    }
                  </td>
                  <td class="col-status">
                    <span class="badge" [class.badge-active]="b.activo">
                      {{ b.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="col-actions actions-cell">
                    @if (canWrite()) {
                      <button
                        class="table-row-action"
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
    .actions-cell { min-width: 220px; }
    .actions-empty { color: var(--text-muted); }
  `],
})
export class BoxListPage implements OnInit {
  private route   = inject(ActivatedRoute);
  private svc     = inject(BoxService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private errMap  = inject(ErrorMapperService);
  private completenessRefresh = inject(ConsultorioCompletenessRefreshService);

  items        = signal<Box[]>([]);
  loading      = signal(true);
  showForm     = signal(false);
  editTarget   = signal<Box | null>(null);

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
      next: () => {
        this.toast.success(target ? 'Box actualizado' : 'Box creado');
        this.closeForm();
        this.load();
        this.completenessRefresh.notify(this.consultorioId);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
