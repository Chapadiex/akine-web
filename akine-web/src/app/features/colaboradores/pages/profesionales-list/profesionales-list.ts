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
  CuentaStatus,
  ModoAltaProfesional,
  ProfesionalColaboradorRequest,
} from '../../models/colaboradores.models';
import { ColaboradoresService } from '../../services/colaboradores.service';
import { EspecialidadService } from '../../../consultorios/services/especialidad.service';

type PanelMode = 'empty' | 'view' | 'create' | 'edit';

@Component({
  selector: 'app-profesionales-list-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-copy header-inline">
          <h1>Profesionales</h1>
          <p>Administra altas, invitaciones y estado de cada profesional del consultorio</p>
        </div>

        <div class="header-actions">
          <button
            class="btn-icon"
            type="button"
            aria-label="Mostrar u ocultar filtros"
            [attr.aria-expanded]="filtersExpanded()"
            (click)="toggleFilters()"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          @if (canWrite()) {
            <button class="btn-primary" type="button" (click)="openCreate()">+ Agregar / Invitar</button>
          }
        </div>
      </header>

      @if (filtersExpanded()) {
        <form class="filters" [formGroup]="filtersForm" (ngSubmit)="load()">
          <input formControlName="q" placeholder="Buscar por nombre, email o matricula" />
          <input formControlName="matricula" placeholder="Matricula" />
          <select formControlName="estado">
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="INVITADO">Invitacion pendiente</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
          <button class="btn-filter" type="submit">Aplicar filtros</button>
        </form>
      }

      <section class="kpi-strip">
        <article class="kpi-card">
          <span>Total</span>
          <strong>{{ totalRows() }}</strong>
        </article>
        <article class="kpi-card">
          <span>Activos</span>
          <strong>{{ activeRows() }}</strong>
        </article>
        <article class="kpi-card">
          <span>Pendientes</span>
          <strong>{{ pendingRows() }}</strong>
        </article>
      </section>

      <div class="layout">
        <section class="list-panel">
          @if (loading()) {
            <p class="muted">Cargando profesionales...</p>
          } @else if (filteredRows().length === 0) {
            <div class="empty-list">
              <h3>Sin resultados para estos filtros</h3>
              <p>Proba ajustando estado o matricula para ampliar la busqueda.</p>
              @if (canWrite()) {
                <button class="btn-primary" type="button" (click)="openCreate()">Crear profesional</button>
              }
            </div>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Profesional</th>
                  <th>Matricula</th>
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
            <div class="empty-state">
              <h3>Selecciona un profesional</h3>
              <p>Vas a ver el detalle completo y sus acciones disponibles.</p>
            </div>
          }

          @if (panelMode() === 'view' && selected()) {
            <div class="detail">
              <h2>{{ selected()!.apellido }}, {{ selected()!.nombre }}</h2>
              <div class="detail-meta">
                <div class="meta-row"><b>Email</b><span>{{ selected()!.email || '-' }}</span></div>
                <div class="meta-row"><b>Matricula</b><span>{{ selected()!.matricula }}</span></div>
                <div class="meta-row"><b>Telefono</b><span>{{ selected()!.telefono || '-' }}</span></div>
                <div class="meta-row"><b>Estado</b><span>{{ labelEstado(selected()!.estadoColaborador) }}</span></div>
                <div class="meta-row"><b>Cuenta</b><span>{{ labelCuentaStatus(selected()!.cuentaStatus) }}</span></div>
                <div class="meta-row meta-row-especialidades">
                  <b>Especialidades</b>
                  <div class="chips">
                    @for (esp of selected()!.especialidades; track esp) {
                      <span class="chip">{{ esp }}</span>
                    }
                  </div>
                </div>
              </div>

              <div class="actions">
                <a
                  class="btn-link"
                  title="Gestión de disponibilidad"
                  [routerLink]="['/app/consultorios', selectedConsultorioId(), 'profesionales', selected()!.id, 'disponibilidad']"
                >
                  Disponibilidad
                </a>
                @if (canWrite()) {
                  <button class="btn-link btn-action" type="button" title="Editar ficha" (click)="openEdit(selected()!)">Editar</button>
                  @if (selected()!.estadoColaborador === 'ACTIVO') {
                    <button class="btn-link btn-action danger" type="button" (click)="askToggleEstado(selected()!, false)">Desactivar</button>
                  }
                  @if (selected()!.estadoColaborador === 'INACTIVO') {
                    <button class="btn-link btn-action" type="button" title="Reactivar cuenta" (click)="askToggleEstado(selected()!, true)">Reactivar</button>
                  }
                  @if (selected()!.estadoColaborador === 'INVITADO' || selected()!.estadoColaborador === 'RECHAZADO') {
                    <button class="btn-link btn-action" type="button" (click)="reenviarActivacion(selected()!)">Reenviar activacion</button>
                  }
                  @if (!selected()!.userId) {
                    <button class="btn-link btn-action" type="button" (click)="crearCuenta(selected()!)">Crear cuenta</button>
                  }
                }
              </div>
            </div>
          }
        </aside>
      </div>
    </div>

    @if (showModalForm() && canWrite()) {
      <div class="modal-backdrop" (click)="cancelForm()">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <h2>{{ panelMode() === 'create' ? 'Nuevo profesional' : 'Editar profesional' }}</h2>
            </div>
            <button class="icon-close" type="button" (click)="cancelForm()">×</button>
          </header>

          <form class="form" [formGroup]="form" (ngSubmit)="save()">
            @if (showValidationAlert()) {
              <div class="form-alert">
                Revisa los campos obligatorios marcados para poder guardar.
              </div>
            }

            @if (panelMode() === 'create') {
              <label class="field field-full">
                <span>Modo de alta</span>
                <select formControlName="modoAlta">
                  <option value="DIRECTA">Directa</option>
                  <option value="INVITACION">Invitacion</option>
                </select>
              </label>
            }

            <div class="modal-content-grid">
              <div class="modal-left">
                <div class="form-grid">
                  <label class="field">
                    <span>Nombre <em class="required-mark">*</em></span>
                    <input formControlName="nombre" />
                    @if (isControlInvalid('nombre')) {
                      <small class="field-error">Nombre es obligatorio.</small>
                    }
                  </label>
                  <label class="field">
                    <span>Apellido <em class="required-mark">*</em></span>
                    <input formControlName="apellido" />
                    @if (isControlInvalid('apellido')) {
                      <small class="field-error">Apellido es obligatorio.</small>
                    }
                  </label>
                  <label class="field">
                    <span>Matricula <em class="required-mark">*</em></span>
                    <input formControlName="matricula" />
                    @if (isControlInvalid('matricula')) {
                      <small class="field-error">Matricula es obligatoria.</small>
                    }
                  </label>
                  <label class="field">
                    <span>DNI <em class="required-mark">*</em></span>
                    <input formControlName="nroDocumento" />
                    @if (isControlInvalid('nroDocumento')) {
                      <small class="field-error">DNI es obligatorio.</small>
                    }
                  </label>
                  <label class="field">
                    <span>Email <em class="required-mark">*</em></span>
                    <input formControlName="email" type="email" />
                    @if (isControlInvalid('email')) {
                      <small class="field-error">{{ emailErrorMessage() }}</small>
                    }
                  </label>
                  <label class="field">
                    <span>Telefono <em class="required-mark">*</em></span>
                    <input formControlName="telefono" />
                    @if (isControlInvalid('telefono')) {
                      <small class="field-error">Telefono es obligatorio.</small>
                    }
                  </label>
                  <label class="field field-full">
                    <span>Domicilio</span>
                    <input formControlName="domicilio" />
                  </label>
                </div>
              </div>

              <aside class="modal-right">
                <span class="field-title">Especialidades del consultorio <em class="required-mark">*</em></span>
                @if (especialidadOptions().length === 0) {
                  <small class="field-help">No hay especialidades activas en este consultorio.</small>
                } @else {
                  <div class="checkbox-list">
                    @for (esp of especialidadOptions(); track esp) {
                      <label class="checkbox-item">
                        <input
                          type="checkbox"
                          [checked]="isEspecialidadSelected(esp)"
                          (change)="toggleEspecialidad(esp, $any($event.target).checked)"
                        />
                        <span>{{ esp }}</span>
                      </label>
                    }
                  </div>
                }
                @if (isControlInvalid('especialidades')) {
                  <small class="field-error">Selecciona al menos una especialidad.</small>
                }
                @if (selectedEspecialidades().length > 0) {
                  <div class="chips selected-chips">
                    @for (esp of selectedEspecialidades(); track esp) {
                      <span class="chip">{{ esp }}</span>
                    }
                  </div>
                }
              </aside>
            </div>

            <div class="actions modal-actions">
              <button class="btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button class="btn-secondary" type="button" (click)="cancelForm()">Cancelar</button>
            </div>
          </form>
        </section>
      </div>
    }

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
    .header-copy { max-width: 720px; }
    .header-inline {
      display: flex;
      align-items: baseline;
      gap: .7rem;
      flex-wrap: wrap;
    }
    .page-header h1 { margin: 0; font-size: 1.5rem; }
    .page-header p { margin: 0; color: var(--text-muted); line-height: 1.4; }
    .header-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
    .header-actions .btn-primary {
      height: 2.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 .95rem;
    }
    .btn-icon {
      width: 2.6rem;
      height: 2.4rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      cursor: pointer;
    }
    .btn-icon:hover { background: var(--bg); }
    .filters {
      display: grid;
      grid-template-columns: minmax(260px, 2fr) minmax(170px, 1fr) minmax(190px, 1fr) auto;
      gap: .55rem;
    }
    .filters input, .filters select {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: .58rem .7rem;
      background: var(--white);
    }
    .btn-primary, .btn-filter {
      border: none; background: var(--primary); color: #fff; border-radius: var(--radius); padding: .55rem .85rem; font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary {
      border: 1px solid var(--border); background: var(--white); color: var(--text);
      border-radius: var(--radius); padding: .55rem .85rem; cursor: pointer;
    }
    .kpi-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; }
    .kpi-card {
      background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, white), white);
      border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--border));
      border-radius: var(--radius-lg);
      padding: .8rem .9rem;
      display: grid;
      gap: .15rem;
    }
    .kpi-card span { font-size: .76rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
    .kpi-card strong { font-size: 1.45rem; line-height: 1; }
    .layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr); gap: 1rem; min-height: 520px; }
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
    .empty-state {
      color: var(--text-muted);
      display: grid;
      place-items: center;
      text-align: center;
      min-height: 200px;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      padding: 1rem;
    }
    .empty-state h3 { margin: 0 0 .35rem; color: var(--text); }
    .empty-state p { margin: 0; }
    .empty-list {
      min-height: 180px;
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      display: grid;
      place-items: center;
      text-align: center;
      gap: .45rem;
      padding: 1.2rem;
    }
    .empty-list h3 { margin: 0; }
    .empty-list p { margin: 0; color: var(--text-muted); }
    .detail h2 { margin: 0 0 .8rem; }
    .detail { font-size: .95rem; }
    .detail h2 { font-size: 1.95rem; line-height: 1.1; }
    .detail-meta {
      display: grid;
      gap: .45rem;
      margin-bottom: .65rem;
      padding: .65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--bg) 35%, white);
    }
    .meta-row {
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      align-items: center;
      gap: .45rem;
    }
    .meta-row-especialidades { align-items: start; }
    .meta-row-especialidades .chips { margin-top: .1rem; }
    .meta-row b { color: var(--text); }
    .form { display: flex; flex-direction: column; gap: .55rem; }
    .field { display: flex; flex-direction: column; gap: .28rem; font-size: .87rem; color: var(--text-muted); }
    .field span { font-weight: 600; font-size: .76rem; letter-spacing: .03em; text-transform: uppercase; }
    .field-title { font-weight: 600; font-size: .76rem; letter-spacing: .03em; text-transform: uppercase; color: var(--text-muted); }
    .required-mark { color: var(--error); font-style: normal; }
    .field-error { font-size: .74rem; color: var(--error); }
    .form-alert {
      border: 1px solid color-mix(in srgb, var(--error) 45%, var(--border));
      background: color-mix(in srgb, var(--error) 10%, white);
      color: var(--error);
      border-radius: var(--radius);
      padding: .55rem .65rem;
      font-size: .82rem;
      font-weight: 600;
    }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
    .field-full { grid-column: 1 / -1; }
    .form input, .form select { border: 1px solid var(--border); border-radius: var(--radius); padding: .56rem .65rem; }
    .modal-content-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
      gap: .9rem;
      align-items: start;
    }
    .modal-right {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--bg) 35%, white);
      padding: .7rem;
      display: grid;
      gap: .55rem;
      max-height: 360px;
      overflow: auto;
    }
    .checkbox-list { display: grid; gap: .4rem; }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: .45rem;
      font-size: .9rem;
      color: var(--text);
    }
    .checkbox-item input { width: 1rem; height: 1rem; }
    .field-help { font-size: .74rem; color: var(--text-muted); }
    .selected-chips { margin-top: .4rem; }
    .actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .6rem; }
    .btn-link {
      border: 1px solid var(--border); background: var(--white); color: var(--text);
      border-radius: var(--radius); padding: .35rem .65rem; text-decoration: none; cursor: pointer; font-size: .82rem;
    }
    .btn-action {
      background: color-mix(in srgb, var(--primary) 8%, white);
      border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
      color: var(--primary);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }
    .btn-action:hover { background: color-mix(in srgb, var(--primary) 14%, white); }
    .btn-link.danger { color: var(--error); border-color: var(--error); }
    .chips { display: flex; flex-wrap: wrap; gap: .35rem; }
    .chip { background: var(--bg); border-radius: 999px; padding: .15rem .5rem; font-size: .75rem; }
    .list-panel .chip {
      background: color-mix(in srgb, var(--primary) 12%, white);
      border: 1px solid color-mix(in srgb, var(--primary) 30%, var(--border));
      color: color-mix(in srgb, var(--primary) 78%, #112240);
    }
    .badge { border-radius: 999px; font-size: .73rem; padding: .16rem .55rem; font-weight: 600; }
    .badge-activo { background: var(--success-bg); color: var(--success); }
    .badge-inactivo { background: var(--bg); color: var(--text-muted); }
    .badge-invitado { background: color-mix(in srgb, var(--info) 20%, white); color: var(--info); }
    .badge-rechazado { background: color-mix(in srgb, var(--error) 20%, white); color: var(--error); }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, #0c172a 55%, transparent);
      display: grid;
      place-items: center;
      z-index: 50;
      padding: 1rem;
    }
    .modal {
      width: min(860px, 100%);
      max-height: calc(100dvh - 2rem);
      overflow: auto;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg) + 2px);
      box-shadow: var(--shadow-lg);
      padding: 1rem;
      display: grid;
      gap: .9rem;
      animation: modal-enter .2s ease;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: .8rem;
    }
    .modal-header h2 { margin: 0; }
    .modal-header p { margin: .2rem 0 0; color: var(--text-muted); }
    .icon-close {
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text);
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
    }
    .icon-close:hover { background: var(--bg); }
    .modal-actions {
      justify-content: flex-end;
      border-top: 1px solid var(--border);
      padding-top: .8rem;
      margin-top: .2rem;
    }
    @keyframes modal-enter {
      from { transform: translateY(6px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .kpi-strip { grid-template-columns: 1fr; }
      .filters { grid-template-columns: 1fr 1fr; }
      .modal-content-grid { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .field-full { grid-column: auto; }
    }
    @media (max-width: 700px) {
      .page { padding: .8rem; }
      .filters { grid-template-columns: 1fr; }
      .header-actions { width: 100%; }
      .header-actions .btn-primary, .header-actions .btn-secondary { flex: 1; text-align: center; }
      .header-actions .btn-icon { flex: 0 0 auto; }
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
  private readonly especialidadSvc = inject(EspecialidadService);

  readonly rows = signal<ColaboradorProfesional[]>([]);
  readonly especialidadOptions = signal<string[]>([]);
  readonly loading = signal(false);
  readonly filtersExpanded = signal(false);
  readonly saving = signal(false);
  readonly submitAttempted = signal(false);
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
    nroDocumento: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required]],
    domicilio: [''],
    especialidades: [([] as string[]), [Validators.required]],
  });
  readonly selectedEspecialidades = computed(() => this.form.controls.especialidades.value as string[]);

  readonly filteredRows = computed(() => {
    const estado = this.filtersForm.controls.estado.value as 'ALL' | ColaboradorEstado;
    if (estado === 'ALL') return this.rows();
    return this.rows().filter((r) => r.estadoColaborador === estado);
  });
  readonly totalRows = computed(() => this.rows().length);
  readonly activeRows = computed(() => this.rows().filter((r) => r.estadoColaborador === 'ACTIVO').length);
  readonly pendingRows = computed(() =>
    this.rows().filter((r) => r.estadoColaborador === 'INVITADO' || r.estadoColaborador === 'RECHAZADO').length,
  );
  readonly showModalForm = computed(() => this.panelMode() === 'create' || this.panelMode() === 'edit');
  readonly showValidationAlert = computed(() => this.submitAttempted() && this.form.invalid);

  constructor() {
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(),
    ).subscribe((params) => {
      const estado = this.parseEstadoParam(params.get('estado'));
      this.filtersForm.controls.estado.setValue(estado, { emitEvent: false });
      if (this.selectedConsultorioId()) {
        this.panelMode.set('empty');
        this.selected.set(null);
        this.loadEspecialidades();
        this.load();
      }
    });

    effect(() => {
      const cid = this.selectedConsultorioId();
      if (cid) {
        this.panelMode.set('empty');
        this.selected.set(null);
        this.loadEspecialidades();
        this.load();
      }
    });
  }

  private mergeEspecialidadOptions(values: string[]): void {
    if (values.length === 0) return;
    const merged = [...this.especialidadOptions()];
    for (const value of values) {
      if (!merged.includes(value)) {
        merged.push(value);
      }
    }
    this.especialidadOptions.set(merged.sort((a, b) => a.localeCompare(b)));
  }

  private normalizeEspecialidadesInput(values: string[]): string[] {
    return [...new Set(
      (values ?? [])
        .flatMap((value) => (value ?? '').split(/[|,]/))
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    )];
  }

  private loadEspecialidades(): void {
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) {
      this.especialidadOptions.set([]);
      return;
    }
    this.especialidadSvc.list(consultorioId, { includeInactive: false }).subscribe({
      next: (items) => {
        const nombres = items
          .filter((item) => item.activo)
          .map((item) => item.nombre.trim())
          .filter((name) => name.length > 0)
          .sort((a, b) => a.localeCompare(b));
        this.especialidadOptions.set([...new Set(nombres)]);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.especialidadOptions.set([]);
      },
    });
  }

  isEspecialidadSelected(especialidad: string): boolean {
    return this.selectedEspecialidades().includes(especialidad);
  }

  isControlInvalid(name: 'nombre' | 'apellido' | 'matricula' | 'nroDocumento' | 'email' | 'telefono' | 'especialidades'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  emailErrorMessage(): string {
    const email = this.form.controls.email;
    if (email.hasError('required')) return 'Email es obligatorio.';
    if (email.hasError('email')) return 'Formato de email invalido.';
    if (email.hasError('duplicate')) return 'Ya existe un profesional con este email.';
    return 'Email invalido.';
  }

  toggleEspecialidad(especialidad: string, checked: boolean): void {
    const current = [...this.selectedEspecialidades()];
    if (checked) {
      if (!current.includes(especialidad)) {
        current.push(especialidad);
      }
    } else {
      const index = current.indexOf(especialidad);
      if (index >= 0) {
        current.splice(index, 1);
      }
    }
    this.form.controls.especialidades.setValue(current);
    this.form.controls.especialidades.markAsTouched();
    this.form.controls.especialidades.markAsDirty();
    this.form.controls.especialidades.updateValueAndValidity();
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

  toggleFilters(): void {
    this.filtersExpanded.update((v) => !v);
  }

  labelEstado(estado: ColaboradorEstado): string {
    switch (estado) {
      case 'ACTIVO': return 'Activo';
      case 'INACTIVO': return 'Inactivo';
      case 'INVITADO': return 'Invitado';
      case 'RECHAZADO': return 'Rechazado';
    }
  }

  labelCuentaStatus(status: CuentaStatus): string {
    switch (status) {
      case 'NONE': return 'Sin cuenta';
      case 'PENDING': return 'Pendiente activacion';
      case 'ACTIVE': return 'Activa';
      case 'REJECTED': return 'Rechazada';
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
      especialidades: [],
    });
    this.submitAttempted.set(false);
    this.selected.set(null);
    this.panelMode.set('create');
  }

  openEdit(row: ColaboradorProfesional): void {
    const existingEspecialidades = this.normalizeEspecialidadesInput(row.especialidades ?? []);

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
      especialidades: existingEspecialidades,
    });
    this.form.controls.especialidades.setValue(existingEspecialidades);
    this.submitAttempted.set(false);
    this.mergeEspecialidadOptions(existingEspecialidades);
    this.panelMode.set('edit');
  }

  cancelForm(): void {
    this.submitAttempted.set(false);
    if (this.selected()) {
      this.panelMode.set('view');
    } else {
      this.panelMode.set('empty');
    }
  }

  save(): void {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Faltan datos obligatorios para guardar.');
      return;
    }
    const consultorioId = this.selectedConsultorioId();
    if (!consultorioId) return;

    const v = this.form.getRawValue();
    const especialidades = this.normalizeEspecialidadesInput(v.especialidades as string[]);
    const emailValue = v.email.trim();

    const req: ProfesionalColaboradorRequest = {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      matricula: v.matricula.trim(),
      nroDocumento: v.nroDocumento.trim(),
      email: emailValue,
      telefono: v.telefono.trim(),
      domicilio: v.domicilio.trim() || undefined,
      especialidades,
      modoAlta: v.modoAlta,
    };

    const normalizedEmail = emailValue.toLowerCase();
    const target = this.selected();
    const duplicateEmail = this.rows().some((row) =>
      (row.email ?? '').trim().toLowerCase() === normalizedEmail && row.id !== (target?.id ?? ''),
    );
    if (duplicateEmail) {
      this.form.controls.email.setErrors({ ...(this.form.controls.email.errors ?? {}), duplicate: true });
      this.form.controls.email.markAsTouched();
      this.toast.error('No se puede guardar: ya existe un profesional con ese email.');
      return;
    }
    if (this.form.controls.email.hasError('duplicate')) {
      const currentErrors = { ...(this.form.controls.email.errors ?? {}) };
      delete currentErrors['duplicate'];
      this.form.controls.email.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
    }
    const request$ = this.panelMode() === 'edit' && target
      ? this.svc.updateProfesional(consultorioId, target.id, req)
      : this.svc.createProfesional(consultorioId, req);

    this.saving.set(true);
    request$.subscribe({
      next: (saved) => {
        this.toast.success(target ? 'Profesional actualizado' : 'Profesional creado');
        this.saving.set(false);
        this.submitAttempted.set(false);
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
      motivoDeBaja: this.confirmNextActive() ? undefined : 'Baja logica desde colaboradores',
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
        this.toast.success('Cuenta creada y activacion enviada');
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
        this.toast.success('Activacion reenviada');
        this.openView(updated);
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
