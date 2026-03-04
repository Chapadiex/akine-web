import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ObraSocial, ObraSocialEstado, ObraSocialListItem, ObraSocialUpsertRequest } from '../../models/obra-social.models';
import { ObraSocialService } from '../../services/obra-social.service';
import { ObraSocialWizard } from '../../components/obra-social-wizard/obra-social-wizard';
import { ObraSocialDetailDrawer } from '../../components/obra-social-detail-drawer/obra-social-detail-drawer';

@Component({
  selector: 'app-obras-sociales-list-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatMenuModule,
    MatIconModule,
    MatChipsModule,
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
            <h1>Obras Sociales</h1>
            @if (canWrite()) {
              <button mat-flat-button color="primary" (click)="openCreate()">+ Nueva Obra Social</button>
            }
          </header>

          <form [formGroup]="filtersForm" class="filters" (ngSubmit)="load()">
            <mat-form-field class="search-field">
              <mat-label>Buscar por nombre / acrónimo / CUIT</mat-label>
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

            <button mat-stroked-button type="submit">Filtrar</button>
          </form>

          <table mat-table [dataSource]="rows()" class="full-table">
            <ng-container matColumnDef="acronimo"><th mat-header-cell *matHeaderCellDef>Acrónimo</th><td mat-cell *matCellDef="let r">{{ r.acronimo }}</td></ng-container>
            <ng-container matColumnDef="nombreCompleto"><th mat-header-cell *matHeaderCellDef>Nombre completo</th><td mat-cell *matCellDef="let r">{{ r.nombreCompleto }}</td></ng-container>
            <ng-container matColumnDef="cuit"><th mat-header-cell *matHeaderCellDef>CUIT</th><td mat-cell *matCellDef="let r">{{ r.cuit }}</td></ng-container>
            <ng-container matColumnDef="contacto"><th mat-header-cell *matHeaderCellDef>Contacto</th><td mat-cell *matCellDef="let r">{{ r.email || r.telefono || '—' }}</td></ng-container>
            <ng-container matColumnDef="representante"><th mat-header-cell *matHeaderCellDef>Representante</th><td mat-cell *matCellDef="let r">{{ r.representante || '—' }}</td></ng-container>
            <ng-container matColumnDef="planes"><th mat-header-cell *matHeaderCellDef>Planes</th><td mat-cell *matCellDef="let r"><span matTooltip="Ver planes">{{ r.planesCount }}</span></td></ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let r">
                <mat-chip [color]="r.estado === 'ACTIVE' ? 'primary' : undefined" selected>
                  {{ r.estado === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
                </mat-chip>
                @if (r.estado === 'ACTIVE' && !r.hasPlanes) {
                  <mat-chip color="warn" selected>Sin planes</mat-chip>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let r">
                <button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openDetail(r)">Ver detalle</button>
                  @if (canWrite()) {
                    <button mat-menu-item (click)="loadAndOpenEdit(r.id)">Editar</button>
                    <button mat-menu-item (click)="toggleEstado(r)">{{ r.estado === 'ACTIVE' ? 'Desactivar' : 'Activar' }}</button>
                    <button mat-menu-item (click)="loadAndManagePlans(r.id)">Gestionar planes</button>
                  }
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
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
    .page { padding: 1rem 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .filters { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: .75rem; align-items: end; margin-bottom: 1rem; }
    .search-field { width: 100%; }
    .full-table { width: 100%; }
    .drawer { width: min(420px, 90vw); }
  `],
})
export class ObrasSocialesListPage implements OnInit {
  private readonly svc = inject(ObraSocialService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly auth = inject(AuthService);
  private readonly consultorioCtx = inject(ConsultorioContextService);

  readonly displayedColumns = ['acronimo', 'nombreCompleto', 'cuit', 'contacto', 'representante', 'planes', 'estado', 'acciones'];

  readonly rows = signal<ObraSocialListItem[]>([]);
  readonly selectedDetail = signal<ObraSocial | null>(null);
  readonly drawerOpen = signal(false);

  readonly wizardOpen = signal(false);
  readonly editingItem = signal<ObraSocial | null>(null);
  readonly managePlansOnly = signal(false);

  readonly filtersForm = this.fb.nonNullable.group({
    q: [''],
    estado: [''],
    planes: [''],
  });

  readonly existingNames = computed(() => this.rows().map((r) => r.nombreCompleto));

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
      return;
    }

    const v = this.filtersForm.getRawValue();
    const conPlanes = v.planes === 'CON' ? true : v.planes === 'SIN' ? false : undefined;
    this.svc.list(cid, {
      q: v.q || undefined,
      estado: (v.estado || undefined) as ObraSocialEstado | undefined,
      conPlanes,
      page: 0,
      size: 50,
    }).subscribe({
      next: (res) => this.rows.set(res.content),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
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
    this.managePlansOnly.set(false);
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
    this.managePlansOnly.set(true);
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
    this.editingItem.set(null);
    this.managePlansOnly.set(false);
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

