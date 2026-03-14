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
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  CargoEmpleadoCatalogo,
  ColaboradorEmpleado,
  ColaboradorEstado,
  CuentaStatus,
  EmpleadoColaboradorRequest,
} from '../../models/colaboradores.models';
import { ColaboradoresService } from '../../services/colaboradores.service';

type PanelMode = 'empty' | 'view' | 'create' | 'edit';

@Component({
  selector: 'app-empleados-list-page',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialog, PageSectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-section-header
        title="Empleados"
        description="Administra administrativos y estado de cuenta por consultorio"
      >
        <button
          header-actions
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
          <button header-actions class="btn-primary" type="button" (click)="openCreate()">+ Agregar empleado</button>
        }
      </app-page-section-header>

      @if (filtersExpanded()) {
        <form class="filters" [formGroup]="filtersForm" (ngSubmit)="load()">
          <input formControlName="q" placeholder="Buscar por nombre, email o cargo" />
          <select formControlName="cargo">
            <option value="ALL">Todos los cargos</option>
            @for (cargo of cargoOptions(); track cargo.slug) {
              <option [value]="cargo.nombre">{{ cargo.nombre }}</option>
            }
          </select>
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
            <p class="muted">Cargando empleados...</p>
          } @else if (filteredRows().length === 0) {
            <div class="empty-list">
              <h3>Sin resultados para estos filtros</h3>
              <p>Proba ajustando estado o cargo para ampliar la busqueda.</p>
              @if (canWrite()) {
                <button class="btn-primary" type="button" (click)="openCreate()">Crear empleado</button>
              }
            </div>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th>Nacimiento</th>
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
                    <td>{{ row.cargo }}</td>
                    <td>
                      <strong>{{ ageLabel(row.fechaNacimiento) }}</strong>
                      <small>{{ birthDateLabel(row.fechaNacimiento) }}</small>
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
              <h3>Selecciona un empleado</h3>
              <p>Vas a ver el detalle completo y sus acciones disponibles.</p>
            </div>
          }

          @if (panelMode() === 'view' && selected()) {
            <div class="detail">
              <h2>{{ selected()!.apellido }}, {{ selected()!.nombre }}</h2>
              <div class="detail-meta">
                <div class="meta-row"><b>Email</b><span>{{ selected()!.email || '-' }}</span></div>
                <div class="meta-row"><b>Cargo</b><span>{{ selected()!.cargo || '-' }}</span></div>
                <div class="meta-row"><b>DNI</b><span>{{ selected()!.dni || '-' }}</span></div>
                <div class="meta-row">
                  <b>Nacimiento</b>
                  <span class="birth-value">
                    <strong>{{ ageLabel(selected()!.fechaNacimiento) }}</strong>
                    <small>{{ birthDateLabel(selected()!.fechaNacimiento) }}</small>
                  </span>
                </div>
                <div class="meta-row"><b>Telefono</b><span>{{ selected()!.telefono || '-' }}</span></div>
                <div class="meta-row"><b>Direccion</b><span>{{ selected()!.direccion || '-' }}</span></div>
                <div class="meta-row"><b>Estado</b><span>{{ labelEstado(selected()!.estadoColaborador) }}</span></div>
                <div class="meta-row"><b>Cuenta</b><span>{{ labelCuentaStatus(selected()!.cuentaStatus) }}</span></div>
              </div>

              <div class="actions">
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
              <h2>{{ panelMode() === 'create' ? 'Nuevo empleado' : 'Editar empleado' }}</h2>
              @if (panelMode() === 'create') {
                <p>Al crear se enviara un mail de activacion a la cuenta administrativa.</p>
              }
            </div>
            <button class="icon-close" type="button" (click)="cancelForm()">×</button>
          </header>

          <form class="form" [formGroup]="form" (ngSubmit)="save()">
            @if (showValidationAlert()) {
              <div class="form-alert">
                Revisa los campos obligatorios marcados para poder guardar.
              </div>
            }

            <!-- Tabs -->
            <div class="etabs-shell">
              <div class="etabs" role="tablist" aria-label="Secciones del empleado">
                @for (tab of tabSections; track tab.id) {
                  <button
                    type="button"
                    class="etab"
                    [class.etab-active]="activeTab() === tab.id"
                    [attr.aria-selected]="activeTab() === tab.id"
                    (click)="setActiveTab(tab.id)"
                  >{{ tab.label }}</button>
                }
              </div>
            </div>

            <!-- Tab: Datos básicos -->
            @if (activeTab() === 'basicos') {
              <div class="etab-panel">
                <div class="etab-heading">
                  <strong>Datos básicos</strong>
                  <span>Identificacion y datos personales obligatorios.</span>
                </div>
                <div class="form-grid">
                  <label class="field">
                    <span>Nombre <em class="required-mark">*</em></span>
                    <input formControlName="nombre" placeholder="Nombre"
                      [class.input-invalid]="isControlInvalid('nombre')" />
                    @if (isControlInvalid('nombre') && form.controls.nombre.hasError('required')) {
                      <small class="field-error">Nombre es obligatorio.</small>
                    }
                    @if (isControlInvalid('nombre') && form.controls.nombre.hasError('maxlength')) {
                      <small class="field-error">Maximo 100 caracteres.</small>
                    }
                  </label>

                  <label class="field">
                    <span>Apellido <em class="required-mark">*</em></span>
                    <input formControlName="apellido" placeholder="Apellido"
                      [class.input-invalid]="isControlInvalid('apellido')" />
                    @if (isControlInvalid('apellido') && form.controls.apellido.hasError('required')) {
                      <small class="field-error">Apellido es obligatorio.</small>
                    }
                    @if (isControlInvalid('apellido') && form.controls.apellido.hasError('maxlength')) {
                      <small class="field-error">Maximo 100 caracteres.</small>
                    }
                  </label>

                  <label class="field">
                    <span>DNI <em class="required-mark">*</em></span>
                    <input formControlName="dni" placeholder="30111222"
                      inputmode="numeric"
                      [class.input-invalid]="isControlInvalid('dni')" />
                    @if (isControlInvalid('dni') && form.controls.dni.hasError('required')) {
                      <small class="field-error">El DNI es obligatorio.</small>
                    }
                    @if (isControlInvalid('dni') && form.controls.dni.hasError('pattern')) {
                      <small class="field-error">El DNI debe tener entre 7 y 10 digitos.</small>
                    }
                  </label>

                  <label class="field">
                    <span>Fecha de nacimiento <em class="required-mark">*</em></span>
                    <input formControlName="fechaNacimiento" type="date"
                      [class.input-invalid]="isControlInvalid('fechaNacimiento')" />
                    @if (isControlInvalid('fechaNacimiento')) {
                      <small class="field-error">La fecha de nacimiento es obligatoria.</small>
                    }
                  </label>
                </div>
              </div>
            }

            <!-- Tab: Contacto -->
            @if (activeTab() === 'contacto') {
              <div class="etab-panel">
                <div class="etab-heading">
                  <strong>Contacto</strong>
                  <span>Email, telefono y direccion del empleado.</span>
                </div>
                <div class="form-grid">
                  <label class="field">
                    <span>Email <em class="required-mark">*</em></span>
                    <input formControlName="email" type="email" placeholder="mail@ejemplo.com"
                      inputmode="email"
                      [class.input-invalid]="isControlInvalid('email')" />
                    @if (isControlInvalid('email')) {
                      <small class="field-error">{{ emailErrorMessage() }}</small>
                    }
                  </label>

                  <label class="field">
                    <span>Telefono <em class="required-mark">*</em></span>
                    <input formControlName="telefono" type="tel" placeholder="1155554444"
                      inputmode="tel"
                      [class.input-invalid]="isControlInvalid('telefono')" />
                    @if (isControlInvalid('telefono') && form.controls.telefono.hasError('required')) {
                      <small class="field-error">El telefono es obligatorio.</small>
                    }
                    @if (isControlInvalid('telefono') && form.controls.telefono.hasError('maxlength')) {
                      <small class="field-error">Maximo 30 caracteres.</small>
                    }
                  </label>

                  <label class="field field-full">
                    <span>Direccion <em class="required-mark">*</em></span>
                    <input formControlName="direccion" placeholder="Calle, numero, localidad"
                      [class.input-invalid]="isControlInvalid('direccion')" />
                    @if (isControlInvalid('direccion') && form.controls.direccion.hasError('required')) {
                      <small class="field-error">La direccion es obligatoria.</small>
                    }
                    @if (isControlInvalid('direccion') && form.controls.direccion.hasError('maxlength')) {
                      <small class="field-error">Maximo 255 caracteres.</small>
                    }
                  </label>
                </div>
              </div>
            }

            <!-- Tab: Cargo -->
            @if (activeTab() === 'cargo') {
              <div class="etab-panel">
                <div class="etab-heading">
                  <strong>Cargo</strong>
                  <span>Rol del empleado dentro del consultorio.</span>
                </div>
                <div class="form-grid">
                  <label class="field field-full">
                    <span>Cargo <em class="required-mark">*</em></span>
                    <select formControlName="cargo"
                      [class.input-invalid]="isControlInvalid('cargo')">
                      <option value="">Seleccionar cargo</option>
                      @for (cargo of cargoOptions(); track cargo.slug) {
                        <option [value]="cargo.nombre">{{ cargo.nombre }}</option>
                      }
                    </select>
                    @if (isControlInvalid('cargo')) {
                      <small class="field-error">El cargo es obligatorio.</small>
                    }
                  </label>

                  <label class="field field-full">
                    <span>Notas internas</span>
                    <textarea formControlName="notasInternas" rows="3"
                      placeholder="Notas internas del empleado (opcional)"
                      [class.input-invalid]="isControlInvalid('notasInternas')"></textarea>
                    @if (isControlInvalid('notasInternas') && form.controls.notasInternas.hasError('maxlength')) {
                      <small class="field-error">Maximo 500 caracteres.</small>
                    }
                  </label>
                </div>
              </div>
            }

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
        [title]="confirmNextActive() ? 'Reactivar empleado' : 'Desactivar empleado'"
        [message]="confirmMessage()"
        (confirmed)="confirmToggleEstado()"
        (cancelled)="confirmTarget.set(null)"
      />
    }
  `,
  styles: [`
    .page { padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .btn-primary {
      min-height: 2.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 .95rem;
      white-space: nowrap;
    }
    .btn-icon {
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      cursor: pointer;
      transition: border-color .18s ease, background-color .18s ease, color .18s ease;
    }
    .btn-icon:hover { background: var(--bg); }
    .btn-icon[aria-expanded='true'] {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, white);
      color: var(--primary);
    }
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
    .detail { font-size: .95rem; }
    .detail h2 { margin: 0 0 .8rem; font-size: 1.95rem; line-height: 1.1; }
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
    .meta-row b { color: var(--text); }
    .birth-value {
      display: inline-grid;
      gap: .08rem;
      line-height: 1.1;
    }
    .birth-value strong { font-size: .95rem; }
    .birth-value small { color: var(--text-muted); font-size: .74rem; }
    .form { display: flex; flex-direction: column; gap: .55rem; }
    .field { display: flex; flex-direction: column; gap: .28rem; font-size: .87rem; color: var(--text-muted); }
    .field span { font-weight: 600; font-size: .76rem; letter-spacing: .03em; text-transform: uppercase; }
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
    .form input, .form select, .form textarea {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: .56rem .65rem;
      font: inherit;
      background: var(--white);
    }
    .input-invalid {
      border-color: #e53e3e !important;
      background: color-mix(in srgb, #e53e3e 4%, var(--white)) !important;
    }
    .input-invalid:focus {
      border-color: #e53e3e !important;
      box-shadow: 0 0 0 3px color-mix(in srgb, #e53e3e 18%, transparent) !important;
    }
    /* Tabs */
    .etabs-shell { margin-bottom: .65rem; }
    .etabs {
      display: flex;
      flex-wrap: wrap;
      gap: .35rem;
      padding: .22rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: color-mix(in srgb, var(--border) 50%, var(--white) 50%);
    }
    .etab {
      border: 1px solid transparent;
      border-radius: 11px;
      background: transparent;
      color: var(--text);
      font-size: .86rem;
      font-weight: 700;
      padding: .48rem .78rem;
      cursor: pointer;
      transition: background .16s ease, border-color .16s ease, color .16s ease;
    }
    .etab:hover { background: color-mix(in srgb, var(--white) 80%, var(--border) 20%); }
    .etab-active {
      background: var(--white);
      border-color: var(--border);
      box-shadow: var(--shadow-sm);
      color: var(--primary);
    }
    .etab-panel {
      border: 1px solid color-mix(in srgb, var(--border) 92%, var(--primary) 8%);
      border-radius: 16px;
      background: color-mix(in srgb, var(--bg) 18%, var(--white));
      padding: .9rem .95rem .3rem;
      margin-bottom: .2rem;
    }
    .etab-heading {
      display: grid;
      gap: .15rem;
      margin-bottom: .85rem;
    }
    .etab-heading strong { color: var(--text); font-size: .98rem; }
    .etab-heading span { color: var(--text-muted); font-size: .8rem; }
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
      .form-grid { grid-template-columns: 1fr; }
      .field-full { grid-column: auto; }
    }
    @media (max-width: 700px) {
      .page { padding: .8rem; }
      .filters { grid-template-columns: 1fr; }
      .btn-primary { flex: 1 1 auto; text-align: center; }
      .btn-icon { flex: 0 0 auto; }
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
  readonly cargoOptions = signal<CargoEmpleadoCatalogo[]>([]);
  readonly loading = signal(false);
  readonly filtersExpanded = signal(false);
  readonly saving = signal(false);
  readonly submitAttempted = signal(false);
  readonly selected = signal<ColaboradorEmpleado | null>(null);
  readonly panelMode = signal<PanelMode>('empty');
  readonly confirmTarget = signal<ColaboradorEmpleado | null>(null);
  readonly confirmNextActive = signal(false);

  readonly selectedConsultorioId = this.ctx.selectedConsultorioId;
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));

  readonly filtersForm = this.fb.nonNullable.group({
    q: [''],
    cargo: ['ALL'],
    estado: ['ALL'],
  });

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    cargo: ['', [Validators.required]],
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{7,10}$/)]],
    fechaNacimiento: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.required, Validators.maxLength(30)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
    notasInternas: ['', [Validators.maxLength(500)]],
  });

  readonly activeTab = signal<'basicos' | 'contacto' | 'cargo'>('basicos');
  readonly tabSections = [
    { id: 'basicos' as const, label: 'Datos básicos' },
    { id: 'contacto' as const, label: 'Contacto' },
    { id: 'cargo' as const, label: 'Cargo' },
  ];

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
    effect(() => {
      const cid = this.resolveConsultorioId();
      if (cid) {
        this.panelMode.set('empty');
        this.selected.set(null);
        this.loadCargoOptions();
        this.load();
      }
    });
  }

  toggleFilters(): void {
    this.filtersExpanded.update((v) => !v);
  }

  private loadCargoOptions(): void {
    const consultorioId = this.resolveConsultorioId();
    if (!consultorioId) {
      this.cargoOptions.set([]);
      return;
    }
    this.svc.listCargosEmpleado(consultorioId).subscribe({
      next: (rows) => {
        this.cargoOptions.set(rows);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.cargoOptions.set([]);
      },
    });
  }

  private ensureCargoOption(cargo: string): void {
    const value = (cargo ?? '').trim();
    if (!value) return;
    if (this.cargoOptions().some((item) => item.nombre === value)) return;
    this.cargoOptions.set([
      ...this.cargoOptions(),
      {
        id: `legacy-${value.toLowerCase()}`,
        nombre: value,
        slug: value.toLowerCase().replace(/\s+/g, '-'),
        activo: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
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

  setActiveTab(tab: 'basicos' | 'contacto' | 'cargo'): void {
    this.activeTab.set(tab);
  }

  isControlInvalid(
    name: 'nombre' | 'apellido' | 'cargo' | 'dni' | 'fechaNacimiento' | 'email' | 'telefono' | 'direccion' | 'notasInternas',
  ): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitAttempted());
  }

  private moveToFirstInvalidTab(): void {
    const tabByControl: Record<string, 'basicos' | 'contacto' | 'cargo'> = {
      nombre: 'basicos',
      apellido: 'basicos',
      dni: 'basicos',
      fechaNacimiento: 'basicos',
      email: 'contacto',
      telefono: 'contacto',
      direccion: 'contacto',
      cargo: 'cargo',
      notasInternas: 'cargo',
    };
    for (const controlName of Object.keys(this.form.controls)) {
      if (this.form.controls[controlName as keyof typeof this.form.controls].invalid) {
        this.activeTab.set(tabByControl[controlName] ?? 'basicos');
        return;
      }
    }
  }

  emailErrorMessage(): string {
    const email = this.form.controls.email;
    if (email.hasError('required')) return 'Email es obligatorio.';
    if (email.hasError('email')) return 'Formato de email invalido.';
    if (email.hasError('duplicate')) return 'Ya existe un empleado con este email.';
    return 'Email invalido.';
  }

  confirmMessage(): string {
    const target = this.confirmTarget();
    if (!target) return '';
    return this.confirmNextActive()
      ? `Vas a reactivar a ${target.nombre} ${target.apellido}.`
      : `Vas a desactivar a ${target.nombre} ${target.apellido}.`;
  }

  load(): void {
    const consultorioId = this.resolveConsultorioId();
    if (!consultorioId) {
      this.rows.set([]);
      return;
    }
    this.loading.set(true);
    const v = this.filtersForm.getRawValue();
    this.svc.listEmpleados(consultorioId, {
      q: v.q || undefined,
      cargo: v.cargo && v.cargo !== 'ALL' ? v.cargo : undefined,
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
    const consultorioId = this.resolveConsultorioId();
    if (!consultorioId) {
      this.toast.error('Selecciona un consultorio para crear empleados.');
      return;
    }
    this.loadCargoOptions();
    this.form.reset({
      nombre: '',
      apellido: '',
      cargo: '',
      dni: '',
      fechaNacimiento: '',
      email: '',
      telefono: '',
      direccion: '',
      notasInternas: '',
    });
    this.submitAttempted.set(false);
    this.activeTab.set('basicos');
    this.selected.set(null);
    this.panelMode.set('create');
  }

  openEdit(row: ColaboradorEmpleado): void {
    this.loadCargoOptions();
    this.ensureCargoOption(row.cargo);
    this.selected.set(row);
    this.form.reset({
      nombre: row.nombre,
      apellido: row.apellido,
      cargo: row.cargo,
      dni: row.dni ?? '',
      fechaNacimiento: row.fechaNacimiento ?? '',
      email: row.email,
      telefono: row.telefono ?? '',
      direccion: row.direccion ?? '',
      notasInternas: row.notasInternas ?? '',
    });
    this.submitAttempted.set(false);
    this.activeTab.set('basicos');
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
      this.moveToFirstInvalidTab();
      this.toast.error('Faltan datos obligatorios para guardar.');
      return;
    }

    const consultorioId = this.resolveConsultorioId();
    if (!consultorioId) {
      this.toast.error('Selecciona un consultorio para guardar empleados.');
      return;
    }

    const v = this.form.getRawValue();
    const emailValue = v.email.trim();
    const target = this.selected();
    const normalizedEmail = emailValue.toLowerCase();

    const duplicateEmail = this.rows().some((row) =>
      (row.email ?? '').trim().toLowerCase() === normalizedEmail && row.id !== (target?.id ?? ''),
    );
    if (duplicateEmail) {
      this.form.controls.email.setErrors({ ...(this.form.controls.email.errors ?? {}), duplicate: true });
      this.form.controls.email.markAsTouched();
      this.toast.error('No se puede guardar: ya existe un empleado con ese email.');
      return;
    }

    if (this.form.controls.email.hasError('duplicate')) {
      const currentErrors = { ...(this.form.controls.email.errors ?? {}) };
      delete currentErrors['duplicate'];
      this.form.controls.email.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
    }

    const cargoValue = v.cargo.trim();
    const cargoCatalog = this.cargoOptions().find(
      (item) => item.slug === cargoValue || item.nombre === cargoValue,
    );

    const req: EmpleadoColaboradorRequest = {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      cargo: cargoCatalog?.slug ?? cargoValue,
      email: emailValue,
      dni: v.dni.trim(),
      fechaNacimiento: v.fechaNacimiento,
      telefono: v.telefono.trim(),
      direccion: v.direccion.trim(),
      notasInternas: v.notasInternas.trim() || undefined,
    };

    const request$ = this.panelMode() === 'edit' && target
      ? this.svc.updateEmpleado(consultorioId, target.id, req)
      : this.svc.createEmpleado(consultorioId, req);

    this.saving.set(true);
    request$.subscribe({
      next: (saved) => {
        this.toast.success(target ? 'Empleado actualizado' : 'Empleado creado');
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

  askToggleEstado(row: ColaboradorEmpleado, activo: boolean): void {
    this.confirmTarget.set(row);
    this.confirmNextActive.set(activo);
  }

  confirmToggleEstado(): void {
    const row = this.confirmTarget();
    const consultorioId = this.resolveConsultorioId();
    if (!row || !consultorioId) return;

    this.svc.changeEmpleadoEstado(consultorioId, row.id, {
      activo: this.confirmNextActive(),
      fechaDeBaja: this.confirmNextActive() ? undefined : new Date().toISOString().slice(0, 10),
      motivoDeBaja: this.confirmNextActive() ? undefined : 'Baja logica desde colaboradores',
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
    const consultorioId = this.resolveConsultorioId();
    if (!consultorioId) return;
    this.svc.reenviarActivacionEmpleado(consultorioId, row.id).subscribe({
      next: (updated) => {
        this.toast.success('Activacion reenviada');
        this.openView(updated);
        this.load();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private resolveConsultorioId(): string {
    const selected = this.selectedConsultorioId();
    if (selected) return selected;
    const fallback = this.ctx.consultorios()[0]?.id ?? '';
    if (fallback) {
      this.ctx.setSelectedConsultorioId(fallback);
    }
    return fallback;
  }

  private parseBirthDate(value?: string | null): Date | null {
    if (!value) return null;
    const raw = value.trim();
    if (!raw) return null;
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  ageLabel(value?: string | null): string {
    const birthDate = this.parseBirthDate(value);
    if (!birthDate) return '-';

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years -= 1;
    }
    if (years < 0) return '-';
    return years === 1 ? '1 año' : `${years} años`;
  }

  birthDateLabel(value?: string | null): string {
    const birthDate = this.parseBirthDate(value);
    if (!birthDate) return '-';
    return new Intl.DateTimeFormat('es-AR').format(birthDate);
  }
}
