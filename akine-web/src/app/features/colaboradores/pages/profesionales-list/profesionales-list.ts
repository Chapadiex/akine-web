import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  ColaboradorEstado,
  ColaboradorProfesional,
  ModoAltaProfesional,
  ProfesionalColaboradorRequest,
} from '../../models/colaboradores.models';
import { ColaboradoresService } from '../../services/colaboradores.service';

type PanelMode = 'empty' | 'view' | 'create' | 'edit';

@Component({
  selector: 'app-profesionales-list-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Profesionales</h1>
          <p>Alta, baja y gestión de profesionales por consultorio.</p>
        </div>
        @if (canWrite()) {
          <button class="btn-primary" (click)="openCreate()">+ Agregar / Invitar</button>
        }
      </header>

      <form class="filters" [formGroup]="filtersForm" (ngSubmit)="load()">
        <input formControlName="q" placeholder="Buscar por nombre, email, matrícula" />
        <input formControlName="matricula" placeholder="Matrícula" />
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
            <p class="muted">Cargando profesionales...</p>
          } @else if (filteredRows().length === 0) {
            <p class="muted">No hay profesionales para los filtros seleccionados.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Matrícula</th>
                  <th>Especialidades</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.id) {
                  <tr [class.selected]="selected()?.id === row.id" (click)="openView(row)">
                    <td>
                      <strong>{{ row.apellido }}, {{ row.nombre }}</strong>
                      <small>{{ row.email || 'Sin email' }}</small>
                    </td>
                    <td>{{ row.matricula }}</td>
                    <td>
                      <div class="chips">
                        @for (esp of row.especialidades; track esp) {
                          <span class="chip">{{ esp }}</span>
                        }
                      </div>
                    </td>
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
              <p><b>Email:</b> {{ selected()!.email || '—' }}</p>
              <p><b>Matrícula:</b> {{ selected()!.matricula }}</p>
              <p><b>Teléfono:</b> {{ selected()!.telefono || '—' }}</p>
              <p><b>Estado:</b> {{ labelEstado(selected()!.estadoColaborador) }}</p>
              <p><b>Cuenta:</b> {{ selected()!.cuentaStatus }}</p>

              <div class="chips">
                @for (esp of selected()!.especialidades; track esp) {
                  <span class="chip">{{ esp }}</span>
                }
              </div>

              <div class="actions">
                <a
                  class="btn-link"
                  [routerLink]="['/app/consultorios', selectedConsultorioId(), 'profesionales', selected()!.id, 'disponibilidad']"
                >
                  Gestionar disponibilidad
                </a>
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
                  @if (!selected()!.userId) {
                    <button class="btn-link" (click)="crearCuenta(selected()!)">Crear cuenta</button>
                  }
                }
              </div>
            </div>
          }

          @if ((panelMode() === 'create' || panelMode() === 'edit') && canWrite()) {
            <form class="form" [formGroup]="form" (ngSubmit)="save()">
              <h2>{{ panelMode() === 'create' ? 'Nuevo profesional' : 'Editar profesional' }}</h2>

              @if (panelMode() === 'create') {
                <label>
                  Modo de alta
                  <select formControlName="modoAlta">
                    <option value="DIRECTA">Directa</option>
                    <option value="INVITACION">Invitación</option>
                  </select>
                </label>
              }

              <label>Nombre <input formControlName="nombre" /></label>
              <label>Apellido <input formControlName="apellido" /></label>
              <label>Matrícula <input formControlName="matricula" /></label>
              <label>DNI <input formControlName="nroDocumento" /></label>
              <label>Email <input formControlName="email" type="email" /></label>
              <label>Teléfono <input formControlName="telefono" /></label>
              <label>Domicilio <input formControlName="domicilio" /></label>
              <label>Especialidades (coma separada) <input formControlName="especialidadesCsv" /></label>

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
        [title]="confirmNextActive() ? 'Reactivar profesional' : 'Desactivar profesional'"
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
    td small { display: block; color: var(--text-muted); margin-top: .2rem; }
    .muted { color: var(--text-muted); }
    .empty-state { color: var(--text-muted); display: grid; place-items: center; min-height: 160px; }
    .detail h2 { margin: 0 0 .8rem; }
    .form { display: flex; flex-direction: column; gap: .55rem; }
    .form label { display: flex; flex-direction: column; gap: .25rem; font-size: .87rem; color: var(--text-muted); }
    .form input, .form select { border: 1px solid var(--border); border-radius: var(--radius); padding: .5rem .6rem; }
    .actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .6rem; }
    .btn-link {
      border: 1px solid var(--border); background: var(--white); color: var(--text);
      border-radius: var(--radius); padding: .35rem .65rem; text-decoration: none; cursor: pointer; font-size: .82rem;
    }
    .btn-link.danger { color: var(--error); border-color: var(--error); }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .chip { background: var(--bg); border-radius: 999px; padding: .15rem .5rem; font-size: .75rem; }
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
export class ProfesionalesListPage {
  private readonly svc = inject(ColaboradoresService);
  private readonly ctx = inject(ConsultorioContextService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<ColaboradorProfesional[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly selected = signal<ColaboradorProfesional | null>(null);
  readonly panelMode = signal<PanelMode>('empty');
  readonly confirmTarget = signal<ColaboradorProfesional | null>(null);
  readonly confirmNextActive = signal(false);

  readonly selectedConsultorioId = this.ctx.selectedConsultorioId;
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));

  readonly filtersForm = this.fb.nonNullable.group({
    q: [''],
    matricula: [''],
    estado: ['ALL'],
  });

  readonly form = this.fb.nonNullable.group({
    modoAlta: ['DIRECTA' as ModoAltaProfesional],
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    matricula: ['', [Validators.required]],
    nroDocumento: [''],
    email: [''],
    telefono: [''],
    domicilio: [''],
    especialidadesCsv: ['', [Validators.required]],
  });

  readonly filteredRows = computed(() => {
    const estado = this.filtersForm.controls.estado.value as 'ALL' | ColaboradorEstado;
    if (estado === 'ALL') return this.rows();
    return this.rows().filter((r) => r.estadoColaborador === estado);
  });

  constructor() {
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(),
    ).subscribe((params) => {
      const estado = this.parseEstadoParam(params.get('estado'));
      this.filtersForm.controls.estado.setValue(estado, { emitEvent: false });
      if (this.selectedConsultorioId()) {
        this.panelMode.set('empty');
        this.selected.set(null);
        this.load();
      }
    });

    effect(() => {
      const cid = this.selectedConsultorioId();
      if (cid) {
        this.panelMode.set('empty');
        this.selected.set(null);
        this.load();
      }
    });
  }

  private parseEstadoParam(value: string | null): 'ALL' | ColaboradorEstado {
    const normalized = value?.trim().toUpperCase();
    if (
      normalized === 'ACTIVO' ||
      normalized === 'INACTIVO' ||
      normalized === 'INVITADO' ||
      normalized === 'RECHAZADO'
    ) {
      return normalized;
    }
    return 'ALL';
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
    this.svc.listProfesionales(consultorioId, {
      q: v.q || undefined,
      matricula: v.matricula || undefined,
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

  openView(row: ColaboradorProfesional): void {
    this.selected.set(row);
    this.panelMode.set('view');
  }

  openCreate(): void {
    this.form.reset({
      modoAlta: 'DIRECTA',
      nombre: '',
      apellido: '',
      matricula: '',
      nroDocumento: '',
      email: '',
      telefono: '',
      domicilio: '',
      especialidadesCsv: '',
    });
    this.selected.set(null);
    this.panelMode.set('create');
  }

  openEdit(row: ColaboradorProfesional): void {
    this.selected.set(row);
    this.form.reset({
      modoAlta: 'DIRECTA',
      nombre: row.nombre,
      apellido: row.apellido,
      matricula: row.matricula,
      nroDocumento: row.nroDocumento ?? '',
      email: row.email ?? '',
      telefono: row.telefono ?? '',
      domicilio: row.domicilio ?? '',
      especialidadesCsv: row.especialidades.join(', '),
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
    const especialidades = v.especialidadesCsv
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    const req: ProfesionalColaboradorRequest = {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      matricula: v.matricula.trim(),
      nroDocumento: v.nroDocumento.trim() || undefined,
      email: v.email.trim() || undefined,
      telefono: v.telefono.trim() || undefined,
      domicilio: v.domicilio.trim() || undefined,
      especialidades,
      modoAlta: v.modoAlta,
    };

    if (this.panelMode() === 'create' && req.modoAlta === 'INVITACION' && !req.email) {
      this.toast.error('El email es obligatorio para alta por invitación.');
      return;
    }

    const target = this.selected();
    const request$ = this.panelMode() === 'edit' && target
      ? this.svc.updateProfesional(consultorioId, target.id, req)
      : this.svc.createProfesional(consultorioId, req);

    this.saving.set(true);
    request$.subscribe({
      next: (saved) => {
        this.toast.success(target ? 'Profesional actualizado' : 'Profesional creado');
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

  askToggleEstado(row: ColaboradorProfesional, activo: boolean): void {
    this.confirmTarget.set(row);
    this.confirmNextActive.set(activo);
  }

  confirmToggleEstado(): void {
    const row = this.confirmTarget();
    const consultorioId = this.selectedConsultorioId();
    if (!row || !consultorioId) return;

    this.svc.changeProfesionalEstado(consultorioId, row.id, {
      activo: this.confirmNextActive(),
      fechaDeBaja: this.confirmNextActive() ? undefined : new Date().toISOString().slice(0, 10),
      motivoDeBaja: this.confirmNextActive() ? undefined : 'Baja lógica desde colaboradores',
    }).subscribe({
      next: (updated) => {
        this.toast.success(this.confirmNextActive() ? 'Profesional reactivado' : 'Profesional desactivado');
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

  crearCuenta(row: ColaboradorProfesional): void {
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) return;
    this.svc.crearCuentaProfesional(consultorioId, row.id, row.email ?? undefined).subscribe({
      next: (updated) => {
        this.toast.success('Cuenta creada y activación enviada');
        this.openView(updated);
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  reenviarActivacion(row: ColaboradorProfesional): void {
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) return;
    this.svc.reenviarActivacionProfesional(consultorioId, row.id).subscribe({
      next: (updated) => {
        this.toast.success('Activación reenviada');
        this.openView(updated);
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
