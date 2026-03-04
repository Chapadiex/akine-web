import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ColaboradorEmpleado, ColaboradorEstado, EmpleadoColaboradorRequest } from '../../models/colaboradores.models';
import { ColaboradoresService } from '../../services/colaboradores.service';

type PanelMode = 'empty' | 'view' | 'create' | 'edit';

@Component({
  selector: 'app-empleados-list-page',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Empleados</h1>
          <p>Gestión de administrativos y operación del consultorio.</p>
        </div>
        @if (canWrite()) {
          <button class="btn-primary" (click)="openCreate()">+ Agregar empleado</button>
        }
      </header>

      <form class="filters" [formGroup]="filtersForm" (ngSubmit)="load()">
        <input formControlName="q" placeholder="Buscar por nombre, email o cargo" />
        <input formControlName="cargo" placeholder="Cargo" />
        <select formControlName="estado">
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="INVITADO">Invitación pendiente</option>
          <option value="RECHAZADO">Rechazado</option>
        </select>
        <button class="btn-filter" type="submit">Filtrar</button>
      </form>

      <div class="layout">
        <section class="list-panel">
          @if (loading()) {
            <p class="muted">Cargando empleados...</p>
          } @else if (filteredRows().length === 0) {
            <p class="muted">No hay empleados para los filtros seleccionados.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th>Email</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.id) {
                  <tr [class.selected]="selected()?.id === row.id" (click)="openView(row)">
                    <td>{{ row.apellido }}, {{ row.nombre }}</td>
                    <td>{{ row.cargo }}</td>
                    <td>{{ row.email }}</td>
                    <td>
                      <span class="badge" [class]="'badge-' + row.estadoColaborador.toLowerCase()">
                        {{ labelEstado(row.estadoColaborador) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>

        <aside class="detail-panel">
          @if (panelMode() === 'empty') {
            <div class="empty-state">Seleccioná un registro</div>
          }

          @if (panelMode() === 'view' && selected()) {
            <div class="detail">
              <h2>{{ selected()!.apellido }}, {{ selected()!.nombre }}</h2>
              <p><b>Cargo:</b> {{ selected()!.cargo }}</p>
              <p><b>Email:</b> {{ selected()!.email }}</p>
              <p><b>Teléfono:</b> {{ selected()!.telefono || '—' }}</p>
              <p><b>Cuenta:</b> {{ selected()!.cuentaStatus }}</p>
              <p><b>Estado:</b> {{ labelEstado(selected()!.estadoColaborador) }}</p>

              <div class="actions">
                @if (canWrite()) {
                  <button class="btn-link" (click)="openEdit(selected()!)">Editar</button>
                  @if (selected()!.estadoColaborador === 'ACTIVO') {
                    <button class="btn-link danger" (click)="askToggleEstado(selected()!, false)">Desactivar</button>
                  }
                  @if (selected()!.estadoColaborador === 'INACTIVO') {
                    <button class="btn-link" (click)="askToggleEstado(selected()!, true)">Reactivar</button>
                  }
                  @if (selected()!.estadoColaborador === 'INVITADO' || selected()!.estadoColaborador === 'RECHAZADO') {
                    <button class="btn-link" (click)="reenviarActivacion(selected()!)">Reenviar activación</button>
                  }
                }
              </div>
            </div>
          }

          @if ((panelMode() === 'create' || panelMode() === 'edit') && canWrite()) {
            <form class="form" [formGroup]="form" (ngSubmit)="save()">
              <h2>{{ panelMode() === 'create' ? 'Nuevo empleado' : 'Editar empleado' }}</h2>
              @if (panelMode() === 'create') {
                <p class="muted">Al crear se enviará un mail de activación a la cuenta administrativa.</p>
              }

              <label>Nombre <input formControlName="nombre" /></label>
              <label>Apellido <input formControlName="apellido" /></label>
              <label>Cargo <input formControlName="cargo" /></label>
              <label>Email <input formControlName="email" type="email" /></label>
              <label>DNI <input formControlName="dni" /></label>
              <label>Nro/Legajo <input formControlName="nroLegajo" /></label>
              <label>Teléfono <input formControlName="telefono" /></label>
              <label>Notas internas <input formControlName="notasInternas" /></label>

              <div class="actions">
                <button class="btn-primary" type="submit" [disabled]="saving()">
                  {{ saving() ? 'Guardando...' : 'Guardar' }}
                </button>
                <button class="btn-secondary" type="button" (click)="cancelForm()">Cancelar</button>
              </div>
            </form>
          }
        </aside>
      </div>
    </div>

    @if (confirmTarget()) {
      <app-confirm-dialog
        [title]="confirmNextActive() ? 'Reactivar empleado' : 'Desactivar empleado'"
        [message]="confirmMessage()"
        (confirmed)="confirmToggleEstado()"
        (cancelled)="confirmTarget.set(null)"
      />
    }
  `,
  styles: [`
    .page { padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .page-header p { margin: .25rem 0 0; color: var(--text-muted); }
    .filters { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: .5rem; }
    .filters input, .filters select { border: 1px solid var(--border); border-radius: var(--radius); padding: .5rem .65rem; }
    .btn-primary, .btn-filter {
      border: none; background: var(--primary); color: #fff; border-radius: var(--radius); padding: .55rem .85rem; font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary {
      border: 1px solid var(--border); background: var(--white); color: var(--text);
      border-radius: var(--radius); padding: .55rem .85rem; cursor: pointer;
    }
    .layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 1rem; min-height: 520px; }
    .list-panel, .detail-panel {
      background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1rem;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .6rem .5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { font-size: .78rem; color: var(--text-muted); text-transform: uppercase; }
    tr { cursor: pointer; }
    tr.selected { background: var(--bg); }
    .muted { color: var(--text-muted); }
    .empty-state { color: var(--text-muted); display: grid; place-items: center; min-height: 160px; }
    .detail h2 { margin: 0 0 .8rem; }
    .form { display: flex; flex-direction: column; gap: .55rem; }
    .form label { display: flex; flex-direction: column; gap: .25rem; font-size: .87rem; color: var(--text-muted); }
    .form input { border: 1px solid var(--border); border-radius: var(--radius); padding: .5rem .6rem; }
    .actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .6rem; }
    .btn-link {
      border: 1px solid var(--border); background: var(--white); color: var(--text);
      border-radius: var(--radius); padding: .35rem .65rem; text-decoration: none; cursor: pointer; font-size: .82rem;
    }
    .btn-link.danger { color: var(--error); border-color: var(--error); }
    .badge { border-radius: 999px; font-size: .73rem; padding: .16rem .55rem; font-weight: 600; }
    .badge-activo { background: var(--success-bg); color: var(--success); }
    .badge-inactivo { background: var(--bg); color: var(--text-muted); }
    .badge-invitado { background: color-mix(in srgb, var(--info) 20%, white); color: var(--info); }
    .badge-rechazado { background: color-mix(in srgb, var(--error) 20%, white); color: var(--error); }
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .filters { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class EmpleadosListPage {
  private readonly svc = inject(ColaboradoresService);
  private readonly ctx = inject(ConsultorioContextService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<ColaboradorEmpleado[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly selected = signal<ColaboradorEmpleado | null>(null);
  readonly panelMode = signal<PanelMode>('empty');
  readonly confirmTarget = signal<ColaboradorEmpleado | null>(null);
  readonly confirmNextActive = signal(false);

  readonly selectedConsultorioId = this.ctx.selectedConsultorioId;
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));

  readonly filtersForm = this.fb.nonNullable.group({
    q: [''],
    cargo: [''],
    estado: ['ALL'],
  });

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    cargo: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    dni: [''],
    nroLegajo: [''],
    telefono: [''],
    notasInternas: [''],
  });

  readonly filteredRows = computed(() => {
    const estado = this.filtersForm.controls.estado.value as 'ALL' | ColaboradorEstado;
    if (estado === 'ALL') return this.rows();
    return this.rows().filter((r) => r.estadoColaborador === estado);
  });

  constructor() {
    effect(() => {
      const cid = this.selectedConsultorioId();
      if (cid) {
        this.panelMode.set('empty');
        this.selected.set(null);
        this.load();
      }
    });
  }

  labelEstado(estado: ColaboradorEstado): string {
    switch (estado) {
      case 'ACTIVO': return 'Activo';
      case 'INACTIVO': return 'Inactivo';
      case 'INVITADO': return 'Invitado';
      case 'RECHAZADO': return 'Rechazado';
    }
  }

  confirmMessage(): string {
    const target = this.confirmTarget();
    if (!target) return '';
    return this.confirmNextActive()
      ? `Vas a reactivar a ${target.nombre} ${target.apellido}.`
      : `Vas a desactivar a ${target.nombre} ${target.apellido}.`;
  }

  load(): void {
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) {
      this.rows.set([]);
      return;
    }
    this.loading.set(true);
    const v = this.filtersForm.getRawValue();
    this.svc.listEmpleados(consultorioId, {
      q: v.q || undefined,
      cargo: v.cargo || undefined,
    }).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }

  openView(row: ColaboradorEmpleado): void {
    this.selected.set(row);
    this.panelMode.set('view');
  }

  openCreate(): void {
    this.form.reset({
      nombre: '',
      apellido: '',
      cargo: '',
      email: '',
      dni: '',
      nroLegajo: '',
      telefono: '',
      notasInternas: '',
    });
    this.selected.set(null);
    this.panelMode.set('create');
  }

  openEdit(row: ColaboradorEmpleado): void {
    this.selected.set(row);
    this.form.reset({
      nombre: row.nombre,
      apellido: row.apellido,
      cargo: row.cargo,
      email: row.email,
      dni: row.dni ?? '',
      nroLegajo: row.nroLegajo ?? '',
      telefono: row.telefono ?? '',
      notasInternas: row.notasInternas ?? '',
    });
    this.panelMode.set('edit');
  }

  cancelForm(): void {
    if (this.selected()) {
      this.panelMode.set('view');
    } else {
      this.panelMode.set('empty');
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) return;

    const v = this.form.getRawValue();
    const req: EmpleadoColaboradorRequest = {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      cargo: v.cargo.trim(),
      email: v.email.trim(),
      dni: v.dni.trim() || undefined,
      nroLegajo: v.nroLegajo.trim() || undefined,
      telefono: v.telefono.trim() || undefined,
      notasInternas: v.notasInternas.trim() || undefined,
    };

    const target = this.selected();
    const request$ = this.panelMode() === 'edit' && target
      ? this.svc.updateEmpleado(consultorioId, target.id, req)
      : this.svc.createEmpleado(consultorioId, req);

    this.saving.set(true);
    request$.subscribe({
      next: (saved) => {
        this.toast.success(target ? 'Empleado actualizado' : 'Empleado creado');
        this.saving.set(false);
        this.load();
        this.openView(saved);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.saving.set(false);
      },
    });
  }

  askToggleEstado(row: ColaboradorEmpleado, activo: boolean): void {
    this.confirmTarget.set(row);
    this.confirmNextActive.set(activo);
  }

  confirmToggleEstado(): void {
    const row = this.confirmTarget();
    const consultorioId = this.selectedConsultorioId();
    if (!row || !consultorioId) return;
    this.svc.changeEmpleadoEstado(consultorioId, row.id, {
      activo: this.confirmNextActive(),
      fechaDeBaja: this.confirmNextActive() ? undefined : new Date().toISOString().slice(0, 10),
      motivoDeBaja: this.confirmNextActive() ? undefined : 'Baja lógica desde colaboradores',
    }).subscribe({
      next: (updated) => {
        this.toast.success(this.confirmNextActive() ? 'Empleado reactivado' : 'Empleado desactivado');
        this.confirmTarget.set(null);
        this.openView(updated);
        this.load();
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.confirmTarget.set(null);
      },
    });
  }

  reenviarActivacion(row: ColaboradorEmpleado): void {
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) return;
    this.svc.reenviarActivacionEmpleado(consultorioId, row.id).subscribe({
      next: (updated) => {
        this.toast.success('Activación reenviada');
        this.openView(updated);
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
