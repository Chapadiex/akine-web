import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ProfesionalForm } from '../../components/profesional-form/profesional-form';
import {
  Profesional,
  ProfesionalEstadoRequest,
  ProfesionalRequest,
} from '../../models/consultorio.models';
import { ProfesionalService } from '../../services/profesional.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-profesional-list',
  standalone: true,
  imports: [ProfesionalForm, ConfirmDialog, RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-page">
      <div class="sub-header">
        <span class="sub-count">{{ items().length }} profesional(es)</span>
        @if (canWrite()) {
          <button class="btn-primary" (click)="openCreate()">+ Nuevo Profesional</button>
        }
      </div>

      <form [formGroup]="filtersForm" class="filters" (ngSubmit)="load()">
        <input formControlName="dni" placeholder="Buscar por DNI" />
        <input formControlName="q" placeholder="Nombre / Apellido" />
        <input formControlName="matricula" placeholder="Matricula" />
        <input formControlName="especialidades" placeholder="Especialidad (coma separada)" />
        <select formControlName="estado">
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="BAJA">Baja</option>
        </select>
        <button class="btn-filter" type="submit">Filtrar</button>
      </form>

      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (items().length === 0) {
        <p class="empty-msg">No hay profesionales registrados.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Matricula</th>
                <th>Especialidades</th>
                <th>Consultorios</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of items(); track p.id) {
                <tr>
                  <td>{{ p.apellido }}</td>
                  <td>{{ p.nombre }}</td>
                  <td>{{ p.matricula }}</td>
                  <td>
                    <div class="chips">
                      @for (e of p.especialidades; track e) {
                        <span class="chip">{{ e }}</span>
                      }
                    </div>
                  </td>
                  <td>{{ p.consultoriosAsociados ?? 0 }}</td>
                  <td>
                    <span class="badge" [class.badge-active]="p.activo">
                      {{ p.activo ? 'Activo' : 'Baja' }}
                    </span>
                  </td>
                  <td class="actions">
                    <button class="btn-icon" (click)="openView(p)">Ver</button>
                    @if (canWrite()) {
                      <button class="btn-icon" (click)="openEdit(p)">Editar</button>
                      <button class="btn-icon" (click)="toggleEstado(p)">
                        {{ p.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                    }
                    <a class="btn-icon" [routerLink]="['..', 'agenda', 'profesionales', p.id, 'disponibilidad']">Agenda</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (showForm()) {
      <app-profesional-form
        [editItem]="editTarget()"
        [consultorioId]="consultorioId"
        (saved)="onSave($event)"
        (savedEstado)="pendingEstado.set($event)"
        (cancelled)="closeForm()"
      />
    }

    @if (deleteTarget()) {
      <app-confirm-dialog
        [title]="deleteTarget()!.activo ? 'Dar de baja profesional' : 'Activar profesional'"
        [message]="deleteMessage()"
        (confirmed)="confirmEstado()"
        (cancelled)="deleteTarget.set(null)"
      />
    }
  `,
  styles: [`
    .sub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .sub-count { color: var(--text-muted); font-size: .9rem; }
    .filters { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .5rem; margin-bottom: 1rem; }
    .filters input, .filters select {
      padding: .5rem .65rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: .85rem;
    }
    .btn-filter, .btn-primary {
      padding: .5rem .8rem; border: none; border-radius: var(--radius); background: var(--primary); color: #fff;
      font-weight: 600; cursor: pointer; font-size: .85rem;
    }
    .loading-msg, .empty-msg { color: var(--text-muted); text-align: center; margin-top: 2rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    th { background: var(--bg); padding: .7rem 1rem; text-align: left; font-size: .78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    td { padding: .7rem 1rem; border-top: 1px solid var(--border); font-size: .88rem; vertical-align: top; }
    .chips { display: flex; flex-wrap: wrap; gap: .3rem; }
    .chip { padding: .1rem .45rem; border-radius: 999px; background: var(--bg); font-size: .75rem; }
    .badge { padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600; background: var(--bg); color: var(--text-muted); }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .actions { white-space: nowrap; }
    .btn-icon {
      background: none; border: none; cursor: pointer; font-size: .82rem; padding: .2rem .35rem;
      border-radius: var(--radius); color: var(--primary); text-decoration: none;
    }
    .btn-icon:hover { background: var(--bg); }
    @media (max-width: 1024px) {
      .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  `],
})
export class ProfesionalListPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(ProfesionalService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<Profesional[]>([]);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly editTarget = signal<Profesional | null>(null);
  readonly deleteTarget = signal<Profesional | null>(null);
  readonly pendingEstado = signal<ProfesionalEstadoRequest | null>(null);
  readonly mode = signal<'create' | 'edit' | 'view'>('create');

  readonly filtersForm = this.fb.nonNullable.group({
    dni: [''],
    q: [''],
    matricula: [''],
    especialidades: [''],
    estado: [''],
  });

  consultorioId = '';

  readonly canWrite = () => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.loading.set(false);
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.load();
  }

  deleteMessage(): string {
    const target = this.deleteTarget();
    if (!target) return '';
    return target.activo
      ? `Vas a dar de baja a ${target.nombre} ${target.apellido}.`
      : `Vas a activar a ${target.nombre} ${target.apellido}.`;
  }

  openCreate(): void {
    this.mode.set('create');
    this.editTarget.set(null);
    this.pendingEstado.set({ activo: true });
    this.showForm.set(true);
  }

  openEdit(p: Profesional): void {
    this.mode.set('edit');
    this.editTarget.set(p);
    this.pendingEstado.set({
      activo: p.activo,
      fechaDeBaja: p.fechaBaja,
      motivoDeBaja: p.motivoBaja,
    });
    this.showForm.set(true);
  }

  openView(p: Profesional): void {
    this.openEdit(p);
  }

  toggleEstado(p: Profesional): void {
    this.deleteTarget.set(p);
  }

  confirmEstado(): void {
    const p = this.deleteTarget();
    if (!p) return;

    const payload: ProfesionalEstadoRequest = p.activo
      ? { activo: false, fechaDeBaja: new Date().toISOString().slice(0, 10), motivoDeBaja: 'Baja logica' }
      : { activo: true };

    this.svc.changeEstado(this.consultorioId, p.id, payload).subscribe({
      next: () => {
        this.toast.success(p.activo ? 'Profesional dado de baja' : 'Profesional activado');
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.deleteTarget.set(null);
      },
    });
  }

  onSave(req: ProfesionalRequest): void {
    const target = this.editTarget();
    const estado = this.pendingEstado() ?? { activo: true };

    const save$ = target
      ? this.svc.update(this.consultorioId, target.id, req)
      : this.svc.create(this.consultorioId, req);

    save$.subscribe({
      next: (saved) => {
        this.svc.changeEstado(this.consultorioId, saved.id, estado).subscribe({
          next: () => {
            this.toast.success(target ? 'Profesional actualizado' : 'Profesional creado');
            this.closeForm();
            this.load();
          },
          error: (err) => this.toast.error(this.errMap.toMessage(err)),
        });
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editTarget.set(null);
    this.pendingEstado.set(null);
    this.mode.set('create');
  }

  load(): void {
    this.loading.set(true);
    const f = this.filtersForm.getRawValue();
    const especialidades = f.especialidades
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    this.svc.list(this.consultorioId, {
      dni: f.dni || undefined,
      q: f.q || undefined,
      matricula: f.matricula || undefined,
      especialidades: especialidades.length > 0 ? especialidades : undefined,
      activo: f.estado === '' ? undefined : f.estado === 'ACTIVO',
    }).subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }
}
