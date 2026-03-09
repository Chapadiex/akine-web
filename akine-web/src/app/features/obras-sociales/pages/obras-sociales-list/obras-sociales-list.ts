import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ObraSocialDetailDrawer } from '../../components/obra-social-detail-drawer/obra-social-detail-drawer';
import { ObraSocialWizard } from '../../components/obra-social-wizard/obra-social-wizard';
import { ObraSocial, ObraSocialEstado, ObraSocialListItem, ObraSocialUpsertRequest } from '../../models/obra-social.models';
import { ObraSocialService } from '../../services/obra-social.service';

@Component({
  selector: 'app-obras-sociales-list-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatMenuModule,
    MatIconModule,
    MatTooltipModule,
    MatSidenavModule,
    ObraSocialWizard,
    ObraSocialDetailDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-drawer-container class="container">
      <mat-drawer mode="side" position="end" [opened]="drawerOpen()" class="drawer">
        <app-obra-social-detail-drawer
          [obraSocial]="selectedDetail()"
          (edit)="openEdit($event)"
          (managePlans)="openManagePlans($event)"
        />
      </mat-drawer>

      <mat-drawer-content>
        <div class="page">
          <header class="page-header">
            <div class="page-heading">
              <h1>Obras sociales</h1>
              <p>Gestioná cobertura, planes y parámetros operativos por consultorio.</p>
            </div>

            <div class="page-actions">
              <button mat-stroked-button type="button" (click)="resetFilters()">Limpiar filtros</button>
              @if (canWrite()) {
                <button mat-flat-button color="primary" type="button" (click)="openCreate()">Nueva obra social</button>
              }
            </div>
          </header>

          <section class="summary-grid" aria-label="Resumen operativo">
            <article class="summary-card">
              <span class="summary-label">Total</span>
              <strong>{{ rows().length }}</strong>
              <small>{{ activeCount() }} activas y {{ inactiveCount() }} inactivas</small>
            </article>
            <article class="summary-card">
              <span class="summary-label">Con planes</span>
              <strong>{{ withPlansCount() }}</strong>
              <small>{{ withoutPlansCount() }} sin planes todavía</small>
            </article>
            <article class="summary-card">
              <span class="summary-label">Requieren atención</span>
              <strong>{{ attentionCount() }}</strong>
              <small>Activas sin planes o sin contacto primario</small>
            </article>
            <article class="summary-card">
              <span class="summary-label">Última actualización</span>
              <strong>{{ latestUpdatedAt() ? (latestUpdatedAt()! | date:'dd/MM/yyyy') : '—' }}</strong>
              <small>Fecha máxima según el listado visible</small>
            </article>
          </section>

          <section class="filters-panel">
            <div class="filters-panel__head">
              <div>
                <h2>Filtros</h2>
                <p>Buscá por nombre, acrónimo o CUIT y ajustá el estado de la cobertura configurada.</p>
              </div>
              <button mat-stroked-button type="button" (click)="load()">Actualizar</button>
            </div>

            <form [formGroup]="filtersForm" class="filters" (ngSubmit)="load()">
              <mat-form-field class="search-field">
                <mat-label>Buscar por nombre, acrónimo o CUIT</mat-label>
                <input matInput formControlName="q" />
              </mat-form-field>

              <mat-form-field>
                <mat-label>Estado</mat-label>
                <mat-select formControlName="estado">
                  <mat-option value="">Todas</mat-option>
                  <mat-option value="ACTIVE">Activa</mat-option>
                  <mat-option value="INACTIVE">Inactiva</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field>
                <mat-label>Planes</mat-label>
                <mat-select formControlName="planes">
                  <mat-option value="">Todos</mat-option>
                  <mat-option value="CON">Con planes</mat-option>
                  <mat-option value="SIN">Sin planes</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit">Aplicar</button>
            </form>
          </section>

          <section class="table-panel">
            <div class="table-panel__head">
              <div>
                <h2>Listado</h2>
                <p>{{ rows().length }} resultados visibles para el consultorio seleccionado.</p>
              </div>
            </div>

            @if (loading()) {
              <div class="state-block">
                <strong>Cargando obras sociales...</strong>
                <p>Estamos recuperando planes, cobertura y estado administrativo.</p>
              </div>
            } @else if (rows().length === 0) {
              <div class="state-block state-block-empty">
                <strong>No hay resultados para estos filtros.</strong>
                <p>Limpiá la búsqueda o cargá una nueva obra social para empezar a configurar cobertura y planes.</p>
              </div>
            } @else {
              <div class="table-wrap">
                <table mat-table [dataSource]="rows()" class="full-table">
                  <ng-container matColumnDef="acronimo">
                    <th mat-header-cell *matHeaderCellDef>Acrónimo</th>
                    <td mat-cell *matCellDef="let r">
                      <button class="table-link" type="button" (click)="openDetail(r)">{{ r.acronimo }}</button>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="nombreCompleto">
                    <th mat-header-cell *matHeaderCellDef>Obra social</th>
                    <td mat-cell *matCellDef="let r">
                      <div class="cell-primary">
                        <strong>{{ r.nombreCompleto }}</strong>
                        <small>{{ r.representante || 'Sin representante asignado' }}</small>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="cuit">
                    <th mat-header-cell *matHeaderCellDef>CUIT</th>
                    <td mat-cell *matCellDef="let r">{{ r.cuit }}</td>
                  </ng-container>

                  <ng-container matColumnDef="contacto">
                    <th mat-header-cell *matHeaderCellDef>Contacto</th>
                    <td mat-cell *matCellDef="let r">
                      <div class="cell-primary">
                        <strong>{{ r.email || r.telefono || 'Sin contacto cargado' }}</strong>
                        <small>{{ r.email && r.telefono ? r.telefono : 'Dato principal expuesto en la grilla' }}</small>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="planes">
                    <th mat-header-cell *matHeaderCellDef>Planes</th>
                    <td mat-cell *matCellDef="let r">
                      <div class="cell-stack cell-stack--compact">
                        <strong>{{ r.planesCount }}</strong>
                        <span class="inline-badges">
                          <span class="badge" [class.badge--ok]="r.hasPlanes" [class.badge--warn]="!r.hasPlanes">
                            {{ r.hasPlanes ? 'Configurados' : 'Pendientes' }}
                          </span>
                        </span>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="estado">
                    <th mat-header-cell *matHeaderCellDef>Estado</th>
                    <td mat-cell *matCellDef="let r">
                      <div class="cell-stack cell-stack--compact">
                        <span class="badge" [class.badge--active]="r.estado === 'ACTIVE'">
                          {{ r.estado === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
                        </span>
                        @if (r.estado === 'ACTIVE' && !r.hasPlanes) {
                          <span class="badge badge--warn">Sin planes</span>
                        }
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="acciones">
                    <th mat-header-cell *matHeaderCellDef>Acciones</th>
                    <td mat-cell *matCellDef="let r">
                      <button
                        mat-icon-button
                        [matMenuTriggerFor]="menu"
                        [matTooltip]="'Acciones para ' + r.nombreCompleto"
                        aria-label="Abrir acciones de obra social"
                      >
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #menu="matMenu">
                        <button mat-menu-item (click)="openDetail(r)">Ver detalle</button>
                        @if (canWrite()) {
                          <button mat-menu-item (click)="loadAndOpenEdit(r.id)">Editar</button>
                          <button mat-menu-item (click)="toggleEstado(r)">
                            {{ r.estado === 'ACTIVE' ? 'Desactivar' : 'Activar' }}
                          </button>
                          <button mat-menu-item (click)="loadAndManagePlans(r.id)">Gestionar planes</button>
                        }
                      </mat-menu>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                </table>
              </div>
            }
          </section>
        </div>
      </mat-drawer-content>
    </mat-drawer-container>

    @if (wizardOpen()) {
      <app-obra-social-wizard
        [editItem]="editingItem()"
        [existingNames]="existingNames()"
        (save)="saveFromWizard($event)"
        (cancel)="closeWizard()"
      />
    }
  `,
  styles: [`
    .container { height: calc(100vh - 80px); }
    .page {
      padding: 1rem 1.5rem 1.5rem;
      display: grid;
      gap: 1rem;
    }
    .page-header,
    .filters-panel__head,
    .table-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .page-heading h1,
    .filters-panel__head h2,
    .table-panel__head h2 {
      margin: 0;
      color: var(--text);
    }
    .page-heading p,
    .filters-panel__head p,
    .table-panel__head p {
      margin: .2rem 0 0;
      color: var(--text-muted);
    }
    .page-actions {
      display: inline-flex;
      gap: .65rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: .75rem;
    }
    .summary-card,
    .filters-panel,
    .table-panel {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      box-shadow: var(--shadow-sm);
    }
    .summary-card {
      padding: .85rem .95rem;
      display: grid;
      gap: .22rem;
    }
    .summary-label {
      color: var(--text-muted);
      font-size: .72rem;
      text-transform: uppercase;
      letter-spacing: .03em;
      font-weight: 700;
    }
    .summary-card strong {
      color: var(--text);
      font-size: 1.28rem;
      line-height: 1;
    }
    .summary-card small {
      color: var(--text-muted);
      font-size: .76rem;
    }
    .filters-panel,
    .table-panel {
      padding: .95rem 1rem 1rem;
    }
    .filters {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr auto;
      gap: .75rem;
      align-items: end;
    }
    .search-field { width: 100%; }
    .table-wrap {
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    .full-table { width: 100%; background: var(--white); }
    .cell-primary,
    .cell-stack {
      display: grid;
      gap: .15rem;
    }
    .cell-primary strong,
    .cell-stack strong {
      color: var(--text);
      font-size: .86rem;
    }
    .cell-primary small {
      color: var(--text-muted);
      font-size: .75rem;
    }
    .cell-stack--compact { gap: .3rem; }
    .inline-badges {
      display: inline-flex;
      flex-wrap: wrap;
      gap: .35rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      padding: .15rem .5rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: .72rem;
      font-weight: 700;
      background: var(--white);
    }
    .badge--active,
    .badge--ok {
      color: var(--success);
      border-color: var(--success-border);
      background: var(--success-bg);
    }
    .badge--warn {
      color: color-mix(in srgb, var(--warning) 85%, var(--text));
      border-color: color-mix(in srgb, var(--warning) 24%, var(--border));
      background: color-mix(in srgb, var(--warning) 10%, var(--white));
    }
    .table-link {
      border: 0;
      background: transparent;
      padding: 0;
      color: var(--primary);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      text-align: left;
    }
    .table-link:hover { text-decoration: underline; }
    .state-block {
      border: 1px dashed var(--border);
      border-radius: 10px;
      padding: 1rem;
      display: grid;
      gap: .25rem;
      color: var(--text);
      background: color-mix(in srgb, var(--bg) 60%, var(--white));
    }
    .state-block p {
      margin: 0;
      color: var(--text-muted);
    }
    .state-block-empty {
      background: color-mix(in srgb, var(--primary) 3%, var(--white));
    }
    .drawer {
      width: min(460px, 92vw);
      border-left: 1px solid var(--border);
    }
    @media (max-width: 1080px) {
      .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .page { padding-inline: 1rem; }
      .page-header,
      .filters-panel__head,
      .table-panel__head {
        flex-direction: column;
      }
      .page-actions {
        width: 100%;
        justify-content: flex-start;
      }
      .summary-grid,
      .filters {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `],
})
export class ObrasSocialesListPage implements OnInit {
  private readonly svc = inject(ObraSocialService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly auth = inject(AuthService);
  private readonly consultorioCtx = inject(ConsultorioContextService);

  readonly displayedColumns = ['acronimo', 'nombreCompleto', 'cuit', 'contacto', 'planes', 'estado', 'acciones'];

  readonly rows = signal<ObraSocialListItem[]>([]);
  readonly selectedDetail = signal<ObraSocial | null>(null);
  readonly drawerOpen = signal(false);
  readonly wizardOpen = signal(false);
  readonly editingItem = signal<ObraSocial | null>(null);
  readonly loading = signal(false);

  readonly filtersForm = this.fb.nonNullable.group({
    q: [''],
    estado: [''],
    planes: [''],
  });

  readonly existingNames = computed(() => this.rows().map((row) => row.nombreCompleto));
  readonly activeCount = computed(() => this.rows().filter((row) => row.estado === 'ACTIVE').length);
  readonly inactiveCount = computed(() => this.rows().filter((row) => row.estado === 'INACTIVE').length);
  readonly withPlansCount = computed(() => this.rows().filter((row) => row.hasPlanes).length);
  readonly withoutPlansCount = computed(() => this.rows().filter((row) => !row.hasPlanes).length);
  readonly attentionCount = computed(() =>
    this.rows().filter((row) => (row.estado === 'ACTIVE' && !row.hasPlanes) || (!row.email && !row.telefono)).length,
  );
  readonly latestUpdatedAt = computed(() => {
    const stamps = this.rows()
      .map((row) => row.updatedAt)
      .filter((value): value is string => !!value)
      .sort((a, b) => b.localeCompare(a));
    return stamps[0] ?? null;
  });

  ngOnInit(): void {
    this.load();
  }

  canWrite(): boolean {
    return this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');
  }

  load(): void {
    const cid = this.consultorioCtx.selectedConsultorioId();
    if (!cid) {
      this.rows.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const v = this.filtersForm.getRawValue();
    const conPlanes = v.planes === 'CON' ? true : v.planes === 'SIN' ? false : undefined;
    this.svc.list(cid, {
      q: v.q || undefined,
      estado: (v.estado || undefined) as ObraSocialEstado | undefined,
      conPlanes,
      page: 0,
      size: 50,
    }).subscribe({
      next: (res) => {
        this.rows.set(res.content);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  resetFilters(): void {
    this.filtersForm.reset({
      q: '',
      estado: '',
      planes: '',
    });
    this.load();
  }

  openDetail(row: ObraSocialListItem): void {
    const cid = this.consultorioCtx.selectedConsultorioId();
    if (!cid) return;
    this.svc.getById(cid, row.id).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.drawerOpen.set(true);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  openCreate(): void {
    this.editingItem.set(null);
    this.wizardOpen.set(true);
  }

  loadAndOpenEdit(id: string): void {
    const cid = this.consultorioCtx.selectedConsultorioId();
    if (!cid) return;
    this.svc.getById(cid, id).subscribe({
      next: (detail) => this.openEdit(detail),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  openEdit(item: ObraSocial): void {
    this.editingItem.set(item);
    this.wizardOpen.set(true);
  }

  loadAndManagePlans(id: string): void {
    const cid = this.consultorioCtx.selectedConsultorioId();
    if (!cid) return;
    this.svc.getById(cid, id).subscribe({
      next: (detail) => this.openManagePlans(detail),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  openManagePlans(item: ObraSocial): void {
    this.editingItem.set(item);
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
    this.editingItem.set(null);
  }

  saveFromWizard(req: ObraSocialUpsertRequest): void {
    const cid = this.consultorioCtx.selectedConsultorioId();
    if (!cid) return;

    const target = this.editingItem();
    const obs = target
      ? this.svc.update(cid, target.id, req)
      : this.svc.create(cid, req);

    obs.subscribe({
      next: (saved) => {
        this.toast.success('Obra social guardada');
        this.closeWizard();
        this.load();
        this.selectedDetail.set(saved);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  toggleEstado(row: ObraSocialListItem): void {
    const cid = this.consultorioCtx.selectedConsultorioId();
    if (!cid) return;
    const targetEstado: ObraSocialEstado = row.estado === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.svc.changeStatus(cid, row.id, targetEstado).subscribe({
      next: () => {
        this.toast.success('Estado actualizado');
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
