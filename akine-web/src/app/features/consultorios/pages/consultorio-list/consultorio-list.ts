import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioCompleteness } from '../../models/consultorio-completeness.models';
import { Consultorio } from '../../models/consultorio.models';
import { ConsultorioCompletenessService } from '../../services/consultorio-completeness.service';
import { ConsultorioService } from '../../services/consultorio.service';

@Component({
  selector: 'app-consultorio-list',
  standalone: true,
  imports: [RouterLink, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Consultorios</h1>
          <p class="page-copy">Alta rapida, estados de completitud por capas y acceso directo a edicion completa.</p>
        </div>
        @if (isAdmin()) {
          <a class="btn-primary" routerLink="/app/consultorios/nuevo">Nuevo consultorio</a>
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
                <th class="col-text">Nombre</th>
                <th class="col-text">Completitud</th>
                <th class="col-text-short">Telefono</th>
                <th class="col-text">Email</th>
                <th class="col-status">Estado</th>
                <th class="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of visibleItems(); track item.id) {
                <tr>
                  <td class="col-text">
                    <a [routerLink]="['/app/consultorios', item.id]" class="link">{{ item.name }}</a>
                  </td>
                  <td class="col-text">
                    @if (completenessById()[item.id]; as completeness) {
                      <div class="layer-wrap">
                        @for (layer of completeness.layers; track layer.key) {
                          <span class="layer-chip" [class.layer-chip-done]="layer.isComplete" [attr.title]="layer.isComplete ? layer.helperText : layer.missingItems.join(', ')">
                            {{ layer.shortLabel }}
                          </span>
                        }
                      </div>
                    } @else {
                      <span class="layer-chip">Revisando</span>
                    }
                  </td>
                  <td class="col-text-short">{{ item.phone || '-' }}</td>
                  <td class="col-text">{{ item.email || '-' }}</td>
                  <td class="col-status">
                    <span class="badge" [class.badge-active]="item.status === 'ACTIVE'">{{ item.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}</span>
                  </td>
                  <td class="col-actions actions-cell">
                    <a class="table-row-action" [routerLink]="['/app/consultorios', item.id]">Ver</a>
                    @if (canEdit(item)) {
                      <a class="table-row-action" [routerLink]="['/app/consultorios', item.id, 'editar']">Editar</a>
                    }
                    @if (isAdmin() && item.status === 'ACTIVE') {
                      <button class="table-row-action table-row-action--danger" type="button" (click)="startDelete(item)">Baja</button>
                    }
                    @if (isAdmin() && item.status !== 'ACTIVE') {
                      <button class="table-row-action table-row-action--success" type="button" (click)="startActivate(item)">Reactivar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (deleteTarget()) {
      <app-confirm-dialog
        title="Dar de baja consultorio"
        [message]="'¿Dar de baja ' + deleteTarget()!.name + '? El consultorio quedará inactivo.'"
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
  `,
  styles: [`
    .page { padding: 1.5rem; max-width: 1180px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
    .page-title { font-size: 1.55rem; font-weight: 800; margin: 0; }
    .page-copy { margin: .3rem 0 0; color: var(--text-muted); max-width: 58ch; }
    .btn-primary { padding: .62rem 1rem; background: var(--primary); color: #fff; border-radius: 12px; text-decoration: none; font-weight: 700; }
    .loading-msg, .empty-msg { color: var(--text-muted); text-align: center; margin-top: 3rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    th { background: var(--bg); padding: .75rem 1rem; text-align: left; font-size: .8rem; font-weight: 600; color: var(--text-muted); }
    td { padding: .8rem 1rem; border-top: 1px solid var(--border); font-size: .9rem; vertical-align: middle; }
    .link { color: var(--primary); text-decoration: none; font-weight: 700; }
    .layer-wrap { display: flex; flex-wrap: wrap; gap: .35rem; }
    .layer-chip, .badge {
      display: inline-flex; align-items: center; justify-content: center; padding: .25rem .62rem; border-radius: 999px; border: 1px solid var(--border); font-size: .74rem; font-weight: 800; white-space: nowrap;
      background: var(--bg); color: var(--text-muted);
    }
    .layer-chip-done { background: var(--success-bg); border-color: var(--success-border); color: var(--success); }
    .badge-active { background: var(--success-bg); color: var(--success); border-color: var(--success-border); }
    .actions-cell { min-width: 240px; }
  `],
})
export class ConsultorioListPage implements OnInit {
  private readonly svc = inject(ConsultorioService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly completenessSvc = inject(ConsultorioCompletenessService);
  private readonly router = inject(Router);

  readonly items = signal<Consultorio[]>([]);
  readonly completenessById = signal<Record<string, ConsultorioCompleteness>>({});
  readonly loading = signal(true);
  readonly deleteTarget = signal<Consultorio | null>(null);
  readonly activateTarget = signal<Consultorio | null>(null);

  isAdmin = () => this.auth.hasRole('ADMIN');
  canEdit = (c: Consultorio) => c.status === 'ACTIVE' && this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');
  visibleItems = () => this.isAdmin() ? this.items() : this.items().filter((c) => c.status === 'ACTIVE');

  ngOnInit(): void {
    this.load();
  }

  startDelete(item: Consultorio): void { this.deleteTarget.set(item); }
  startActivate(item: Consultorio): void { this.activateTarget.set(item); }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.svc.inactivate(target.id).subscribe({
      next: () => {
        this.toast.success('Consultorio dado de baja');
        this.deleteTarget.set(null);
        this.consultorioCtx.reloadAndSelect();
        this.load();
      },
      error: (err) => {
        this.deleteTarget.set(null);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  confirmActivate(): void {
    const target = this.activateTarget();
    if (!target) return;
    this.svc.activate(target.id).subscribe({
      next: (saved) => {
        this.toast.success('Consultorio reactivado');
        this.activateTarget.set(null);
        this.consultorioCtx.reloadAndSelect(saved.id);
        this.load();
      },
      error: (err) => {
        this.activateTarget.set(null);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
        this.loadCompleteness(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private loadCompleteness(items: Consultorio[]): void {
    if (items.length === 0) {
      this.completenessById.set({});
      return;
    }

    forkJoin(
      items.map((consultorio) =>
        this.completenessSvc.loadCompleteness(consultorio.id, consultorio).pipe(
          map((result) => [consultorio.id, result] as const),
          catchError(() => of([consultorio.id, {
            isComplete: false,
            hasCriticalMissing: true,
            completionPercentage: 0,
            missingItems: ['No se pudo evaluar la completitud.'],
            layers: [],
            sections: [],
          } satisfies ConsultorioCompleteness] as const)),
        ),
      ),
    ).subscribe((entries) => {
      this.completenessById.set(Object.fromEntries(entries));
    });
  }
}
