import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  ProfesionalForm,
  ProfesionalFormEditValue,
  ProfesionalFormResult,
} from '../../../../shared/ui/profesional-form/profesional-form';
import { Profesional, ProfesionalEstadoRequest, ProfesionalRequest } from '../../models/consultorio.models';
import { ProfesionalService } from '../../services/profesional.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-profesional-list',
  standalone: true,
  imports: [ProfesionalForm, ReactiveFormsModule],
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
                  <td>
                    <span class="badge" [class.badge-active]="p.activo">
                      {{ p.activo ? 'Activo' : 'Baja' }}
                    </span>
                  </td>
                  <td class="actions">
                    @if (canWrite()) {
                      <button type="button" class="btn-action" (click)="openEdit(p)">Editar</button>
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
      <app-profesional-form
        [editValue]="formEditValue()"
        [consultorioId]="consultorioId"
        [showEstado]="isEditMode()"
        [saving]="saving()"
        (submitted$)="onSubmit($event)"
        (cancelled)="closeForm()"
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
    .actions { width: 1%; }
    .btn-action {
      display: inline-flex; align-items: center; justify-content: center; min-height: 2rem; padding: .38rem .72rem;
      border: 1px solid color-mix(in srgb, var(--border) 82%, var(--primary) 18%);
      border-radius: 999px; background: var(--white); color: color-mix(in srgb, var(--text) 82%, var(--primary) 18%);
      cursor: pointer; font-size: .8rem; font-weight: 600; line-height: 1; text-decoration: none;
      transition: background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease, transform .18s ease;
    }
    .btn-action:hover {
      background: color-mix(in srgb, var(--bg) 78%, var(--white) 22%);
      border-color: color-mix(in srgb, var(--primary) 30%, var(--border) 70%);
      color: var(--primary);
      transform: translateY(-1px);
    }
    .btn-action:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
    }
    @media (max-width: 1024px) {
      .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .btn-action { flex: 1 1 auto; }
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
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editTarget = signal<Profesional | null>(null);
  readonly isEditMode = signal(false);

  readonly formEditValue = (): ProfesionalFormEditValue | null => {
    const p = this.editTarget();
    if (!p) return null;
    return {
      nombre: p.nombre,
      apellido: p.apellido,
      nroDocumento: p.nroDocumento,
      email: p.email,
      matricula: p.matricula,
      telefono: p.telefono,
      domicilio: p.domicilio,
      especialidades: p.especialidades,
      activo: p.activo,
      fechaBaja: p.fechaBaja,
      motivoBaja: p.motivoBaja,
    };
  };

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

  openCreate(): void {
    this.editTarget.set(null);
    this.isEditMode.set(false);
    this.showForm.set(true);
  }

  openEdit(p: Profesional): void {
    this.editTarget.set(p);
    this.isEditMode.set(true);
    this.showForm.set(true);
  }

  onSubmit(result: ProfesionalFormResult): void {
    const target = this.editTarget();
    this.saving.set(true);

    const req: ProfesionalRequest = {
      nombre: result.nombre,
      apellido: result.apellido,
      nroDocumento: result.nroDocumento,
      email: result.email,
      matricula: result.matricula,
      especialidad: result.especialidades[0],
      especialidades: result.especialidades.join('|'),
      telefono: result.telefono,
      domicilio: result.domicilio,
    };

    const save$ = target
      ? this.svc.update(this.consultorioId, target.id, req)
      : this.svc.create(this.consultorioId, req);

    save$.subscribe({
      next: (saved) => {
        const estado: ProfesionalEstadoRequest = {
          activo: result.activo,
          fechaDeBaja: result.fechaDeBaja,
          motivoDeBaja: result.motivoDeBaja,
        };
        this.svc.changeEstado(this.consultorioId, saved.id, estado).subscribe({
          next: () => {
            this.saving.set(false);
            if (target) {
              this.toast.success('Profesional actualizado.');
            } else {
              const msg = result.activo
                ? 'Profesional agregado. Recibirá un email para crear su cuenta.'
                : 'Profesional agregado. Podés habilitarle el acceso desde su perfil.';
              this.toast.success(msg);
            }
            this.closeForm();
            this.load();
          },
          error: (err) => {
            this.saving.set(false);
            this.toast.error(this.errMap.toMessage(err));
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editTarget.set(null);
    this.isEditMode.set(false);
    this.saving.set(false);
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
