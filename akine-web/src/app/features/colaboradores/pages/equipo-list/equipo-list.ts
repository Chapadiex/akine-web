import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { EspecialidadService } from '../../../consultorios/services/especialidad.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  CargoEmpleadoCatalogo,
  ColaboradorEmpleado,
  ColaboradorEstado,
  ColaboradorProfesional,
  CuentaStatus,
  EmpleadoColaboradorRequest,
  EquipoMiembro,
  ProfesionalColaboradorRequest,
} from '../../models/colaboradores.models';
import { ColaboradoresService } from '../../services/colaboradores.service';

type TipoMiembro = 'PROFESIONAL' | 'ADMINISTRATIVO';
type AccesoOpcion = 'invitar' | 'sin_acceso';

interface ConfirmCtx {
  miembro: EquipoMiembro;
  nextActive: boolean;
}

@Component({
  selector: 'app-equipo-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog, PageSectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-section-header
        title="Equipo del consultorio"
        [description]="headerDescription()"
      >
        @if (canWrite()) {
          <button header-actions class="btn-primary" type="button" (click)="openCreate()">+ Agregar miembro</button>
        }
      </app-page-section-header>

      <div [formGroup]="filtersForm">
        <div class="search-bar">
          <input formControlName="q" placeholder="Buscar por nombre, apellido, email, matrícula o cargo..." />
          <button type="button" class="btn-buscar">Buscar</button>
          <button
            type="button"
            class="btn-filtros"
            [class.btn-filtros-active]="filtersExpanded()"
            (click)="filtersExpanded.set(!filtersExpanded())"
            [attr.aria-expanded]="filtersExpanded()"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M2 5h16M5 10h10M8 15h4"/>
            </svg>
            Filtros
          </button>
        </div>
        @if (filtersExpanded()) {
          <div class="filters-panel">
            <select formControlName="tipo">
              <option value="ALL">Todos los tipos</option>
              <option value="PROFESIONAL">Profesionales</option>
              <option value="ADMINISTRATIVO">Administrativos</option>
            </select>
            <select formControlName="estado">
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        }
      </div>

      @if (partialError()) {
        <div class="partial-warn">
          ⚠ No se pudo cargar uno de los grupos. Mostrando datos parciales.
        </div>
      }

      @if (loading()) {
        <p class="muted">Cargando equipo...</p>
      } @else if (filteredRows().length === 0) {
        <div class="empty-list">
          <p>No hay miembros que coincidan con los filtros.</p>
          @if (canWrite()) {
            <button class="btn-primary" type="button" (click)="openCreate()">Agregar miembro</button>
          }
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>DNI</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Mat. / Cargo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (m of filteredRows(); track m.id) {
                <tr>
                  <td><span class="dni-text">{{ getDni(m) || '—' }}</span></td>
                  <td>{{ m.apellido }}</td>
                  <td>{{ m.nombre }}</td>
                  <td>
                    <span class="badge" [class.badge-info]="m.tipo === 'PROFESIONAL'" [class.badge-muted]="m.tipo === 'ADMINISTRATIVO'">
                      {{ m.tipo === 'PROFESIONAL' ? 'Profesional' : 'Administrativo' }}
                    </span>
                  </td>
                  <td>{{ m.telefono || '—' }}</td>
                  <td>{{ m.email || '—' }}</td>
                  <td>{{ datoEspecifico(m) }}</td>
                  <td>
                    <span class="badge"
                      [class.ok]="m.estadoColaborador === 'ACTIVO'"
                      [class.badge-info]="m.estadoColaborador === 'INVITADO'"
                      [class.badge-warning]="m.estadoColaborador === 'RECHAZADO'"
                      [class.badge-muted]="m.estadoColaborador === 'INACTIVO'">
                      <strong>{{ labelEstado(m.estadoColaborador) }}</strong>
                    </span>
                    @if (m.cuentaStatus === 'PENDING') {
                      <span class="badge badge-info" style="margin-left:.3rem">Pend. activación</span>
                    }
                  </td>
                  <td class="actions-cell">
                    @if (canWrite()) {
                      <button type="button" class="btn-link" (click)="openEdit(m)">Editar</button>
                    }
                    @if (canWrite() || m.tipo === 'PROFESIONAL') {
                      <div class="menu-wrap" (click)="$event.stopPropagation()">
                        <button type="button" class="btn-menu-trigger" (click)="toggleMenu(m.id)" [attr.aria-expanded]="openMenuId() === m.id" aria-label="Más acciones">•••</button>
                        @if (openMenuId() === m.id) {
                          <div class="menu-dropdown" role="menu">
                            @if (canWrite()) {
                              @if (m.estadoColaborador === 'ACTIVO') {
                                <button type="button" class="menu-item danger" role="menuitem" (click)="askToggle(m, false); closeMenu()">Inactivar</button>
                              }
                              @if (m.estadoColaborador === 'INACTIVO') {
                                <button type="button" class="menu-item" role="menuitem" (click)="askToggle(m, true); closeMenu()">Activar</button>
                              }
                              @if (m.estadoColaborador === 'INVITADO' || m.estadoColaborador === 'RECHAZADO') {
                                <button type="button" class="menu-item" role="menuitem" (click)="reenviarActivacion(m); closeMenu()">Reenviar invitación</button>
                              }
                              @if (m.tipo === 'PROFESIONAL' && !m.userId) {
                                <button type="button" class="menu-item" role="menuitem" (click)="crearCuenta(m); closeMenu()">Crear cuenta</button>
                              }
                            }
                            @if (m.tipo === 'PROFESIONAL') {
                              <a class="menu-item" role="menuitem" [routerLink]="['/app/consultorios', consultorioId(), 'profesionales', m.id, 'disponibilidad']" (click)="closeMenu()">Disponibilidad</a>
                            }
                          </div>
                        }
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- ══════════════════ MODAL ══════════════════ -->
    @if (showForm()) {
      <div class="modal-backdrop" (click)="closeForm()">
        <section class="modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="modal-title-row">
              <h2>{{ isEditMode() ? 'Editar miembro' : 'Agregar miembro al equipo' }}</h2>
              @if (isEditMode()) {
                <span class="badge" [class.badge-profesional]="editTarget()?.tipo === 'PROFESIONAL'" [class.badge-admin]="editTarget()?.tipo === 'ADMINISTRATIVO'">
                  {{ editTarget()?.tipo === 'PROFESIONAL' ? 'Profesional' : 'Administrativo' }}
                </span>
              }
            </div>
            <button class="icon-close" type="button" (click)="closeForm()">×</button>
          </header>

          <form [formGroup]="form" (ngSubmit)="submit()">
            @if (formSubmitted() && form.invalid) {
              <div class="form-alert">Hay campos incompletos. Revisá los marcados en rojo.</div>
            }
            @if (formSubmitted() && tipoSelected() === 'PROFESIONAL' && especialidades().length === 0) {
              <div class="form-alert">Seleccioná al menos una especialidad.</div>
            }

            <!-- Tipo selector (solo en alta) -->
            @if (!isEditMode()) {
              <div class="tipo-tabs">
                <button type="button" class="tipo-tab" [class.tipo-tab-active]="tipoSelected() === 'PROFESIONAL'" (click)="setTipo('PROFESIONAL')">Profesional</button>
                <button type="button" class="tipo-tab" [class.tipo-tab-active]="tipoSelected() === 'ADMINISTRATIVO'" (click)="setTipo('ADMINISTRATIVO')">Administrativo</button>
              </div>
            }

            <!-- ─── Datos comunes (siempre visibles, mismo orden para ambos tipos) ─── -->
            <div class="form-grid">
              <label class="field">
                <span>Nombre <em class="req">*</em></span>
                <input formControlName="nombre" placeholder="Nombre" [class.input-invalid]="isInvalid('nombre')" />
                @if (isInvalid('nombre')) { <small class="field-error">El nombre es obligatorio.</small> }
              </label>
              <label class="field">
                <span>Apellido <em class="req">*</em></span>
                <input formControlName="apellido" placeholder="Apellido" [class.input-invalid]="isInvalid('apellido')" />
                @if (isInvalid('apellido')) { <small class="field-error">El apellido es obligatorio.</small> }
              </label>
              <label class="field">
                <span>DNI <em class="req">*</em></span>
                <input formControlName="dni" placeholder="30111222" inputmode="numeric" [class.input-invalid]="isInvalid('dni')" />
                @if (isInvalid('dni') && form.controls.dni.hasError('required')) { <small class="field-error">El DNI es obligatorio.</small> }
                @if (isInvalid('dni') && form.controls.dni.hasError('pattern')) { <small class="field-error">DNI debe tener entre 7 y 10 dígitos.</small> }
              </label>
              <label class="field">
                <span>Email
                  @if (!isEditMode() && acceso() === 'invitar') { <em class="req">*</em> }
                  @else { <em class="optional">(opcional)</em> }
                </span>
                <input formControlName="email" type="email" placeholder="mail@ejemplo.com" inputmode="email" [class.input-invalid]="isInvalid('email')" />
                @if (isInvalid('email') && form.controls.email.hasError('required')) { <small class="field-error">El email es obligatorio para enviar la invitación.</small> }
                @if (isInvalid('email') && form.controls.email.hasError('email')) { <small class="field-error">Email inválido.</small> }
              </label>
              <label class="field">
                <span>Teléfono <em class="optional">(opcional)</em></span>
                <input formControlName="telefono" type="tel" placeholder="1155554444" inputmode="tel" />
              </label>
              <label class="field">
                <span>Dirección <em class="optional">(opcional)</em></span>
                <input formControlName="direccion" placeholder="Calle, número, localidad" />
              </label>
            </div>

            <!-- ─── Datos específicos del rol (solo este bloque cambia al cambiar tab) ─── -->
            @if (tipoSelected() === 'PROFESIONAL') {
              <div class="form-grid">
                <label class="field">
                  <span>Matrícula <em class="req">*</em></span>
                  <input formControlName="matricula" placeholder="Ej: MP-1234" [class.input-invalid]="isInvalid('matricula')" />
                  @if (isInvalid('matricula')) { <small class="field-error">La matrícula es obligatoria.</small> }
                </label>
                <div class="field field-full">
                  <span>Especialidades <em class="req">*</em></span>
                  <div class="chips-row">
                    @for (e of especialidades(); track e) {
                      <span class="chip">
                        {{ e }}
                        <button type="button" class="chip-remove" (click)="removeEsp(e)" [attr.aria-label]="'Remover ' + e">×</button>
                      </span>
                    }
                  </div>
                  <div class="combobox" (click)="$event.stopPropagation()">
                    <input
                      class="combobox-input"
                      [value]="espInput()"
                      (input)="espInput.set($any($event.target).value); espDropdown.set(true)"
                      (focus)="espDropdown.set(true)"
                      (keydown.enter)="$event.preventDefault(); selectFirstEsp()"
                      (keydown.escape)="espDropdown.set(false)"
                      placeholder="Buscar o escribir especialidad..."
                    />
                    @if (espDropdown() && filteredEsp().length > 0) {
                      <ul class="dropdown" role="listbox">
                        @for (opt of filteredEsp(); track opt.id) {
                          <li role="option" (mousedown)="$event.preventDefault(); addEsp(opt.nombre)">{{ opt.nombre }}</li>
                        }
                      </ul>
                    }
                    @if (espDropdown() && filteredEsp().length === 0 && espInput().trim()) {
                      <div class="dropdown dropdown-hint">
                        <span>Presioná Enter para agregar "{{ espInput().trim() }}"</span>
                      </div>
                    }
                  </div>
                  @if (formSubmitted() && especialidades().length === 0) {
                    <small class="field-error">Seleccioná al menos una especialidad.</small>
                  }
                </div>
              </div>
            }

            @if (tipoSelected() === 'ADMINISTRATIVO') {
              <div class="form-grid">
                <label class="field">
                  <span>Cargo <em class="req">*</em></span>
                  <select formControlName="cargo" [class.input-invalid]="isInvalid('cargo')">
                    <option value="">Seleccionar cargo</option>
                    @for (c of cargoOptions(); track c.slug) {
                      <option [value]="c.nombre">{{ c.nombre }}</option>
                    }
                  </select>
                  @if (isInvalid('cargo')) { <small class="field-error">El cargo es obligatorio.</small> }
                </label>
                <label class="field">
                  <span>Fecha de nacimiento <em class="optional">(opcional)</em></span>
                  <input formControlName="fechaNacimiento" type="date" />
                </label>
                <label class="field field-full">
                  <span>Notas internas <em class="optional">(opcional)</em></span>
                  <textarea formControlName="notasInternas" rows="2" placeholder="Notas internas del miembro"></textarea>
                </label>
              </div>
            }

            <!-- ─── Acceso al sistema (ambos tipos, solo en alta) ─── -->
            @if (!isEditMode()) {
              <div class="acceso-row">
                <span class="acceso-label">Acceso</span>
                <label class="acceso-radio">
                  <input type="radio" name="acc_eq" [checked]="acceso() === 'invitar'" (change)="acceso.set('invitar')" />
                  Invitar al sistema
                </label>
                <span class="acceso-sep">|</span>
                <label class="acceso-radio">
                  <input type="radio" name="acc_eq" [checked]="acceso() === 'sin_acceso'" (change)="acceso.set('sin_acceso')" />
                  Sin acceso
                </label>
                @if (acceso() === 'invitar') {
                  <span class="acceso-hint">Recibirá un email para crear su cuenta</span>
                } @else {
                  <span class="acceso-hint">Podés habilitarlo más tarde desde su perfil</span>
                }
              </div>
            }

            <!-- ─── Estado (solo edición) ─── -->
            @if (isEditMode()) {
              <div class="toggle-field">
                <span class="toggle-label">Miembro activo</span>
                <label class="toggle-switch">
                  <input type="checkbox" formControlName="activo" />
                  <span class="toggle-track"></span>
                </label>
              </div>
              @if (!form.controls.activo.value) {
                <div class="form-grid" style="margin-top:.6rem">
                  <label class="field">
                    <span>Fecha de baja <em class="req">*</em></span>
                    <input formControlName="fechaBaja" type="date" [class.input-invalid]="formSubmitted() && !form.controls.fechaBaja.value" />
                    @if (formSubmitted() && !form.controls.fechaBaja.value) {
                      <small class="field-error">La fecha de baja es obligatoria.</small>
                    }
                  </label>
                  <label class="field">
                    <span>Motivo de baja <em class="req">*</em></span>
                    <input formControlName="motivoBaja" placeholder="Motivo" [class.input-invalid]="formSubmitted() && !form.controls.motivoBaja.value.trim()" />
                    @if (formSubmitted() && !form.controls.motivoBaja.value.trim()) {
                      <small class="field-error">El motivo de baja es obligatorio.</small>
                    }
                  </label>
                </div>
              }
            }

            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeForm()">Cancelar</button>
              <button type="submit" class="btn-save" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : ctaLabel() }}
              </button>
            </div>
          </form>
        </section>
      </div>
    }

    @if (confirmCtx()) {
      <app-confirm-dialog
        [title]="confirmCtx()!.nextActive ? 'Reactivar miembro' : 'Inactivar miembro'"
        [message]="confirmCtx()!.nextActive
          ? 'Vas a reactivar a ' + confirmCtx()!.miembro.nombre + ' ' + confirmCtx()!.miembro.apellido + '.'
          : 'Vas a inactivar a ' + confirmCtx()!.miembro.nombre + ' ' + confirmCtx()!.miembro.apellido + '.'"
        (confirmed)="confirmToggle()"
        (cancelled)="confirmCtx.set(null)"
      />
    }
  `,
  styles: [`
    .page { padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

    .btn-primary {
      min-height: 2.5rem; display: inline-flex; align-items: center; justify-content: center;
      padding: 0 .95rem; white-space: nowrap; border: none; background: var(--primary); color: #fff;
      border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: .88rem;
    }
    /* Search bar — Pacientes style */
    .search-bar { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
    .search-bar input {
      flex: 1 1 220px; padding: .55rem .75rem; border: 1px solid var(--border);
      border-radius: var(--radius); outline: none; font: inherit;
    }
    .search-bar input:focus { border-color: var(--primary); }
    .btn-buscar {
      padding: .55rem 1rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; font-weight: 600; cursor: pointer; font: inherit;
    }
    .btn-buscar:hover { opacity: .9; }
    .btn-filtros {
      padding: .55rem .9rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white); color: var(--text-muted); font-size: .85rem; cursor: pointer;
      display: inline-flex; align-items: center; gap: .35rem; font: inherit;
    }
    .btn-filtros:hover { background: var(--bg); color: var(--text); }
    .btn-filtros-active {
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      background: color-mix(in srgb, var(--primary) 8%, white); color: var(--primary);
    }
    .filters-panel {
      display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .5rem;
      padding: .65rem .75rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: color-mix(in srgb, var(--bg) 60%, var(--white));
    }
    .filters-panel select {
      min-height: 2.3rem; padding: .4rem .6rem; border: 1px solid var(--border);
      border-radius: var(--radius); font-size: .84rem; background: var(--white); font: inherit;
    }

    /* Warnings */
    .partial-warn {
      padding: .55rem .75rem; border: 1px solid color-mix(in srgb, #d97706 30%, var(--border));
      background: color-mix(in srgb, #d97706 8%, white); color: #92400e;
      border-radius: var(--radius); font-size: .82rem; font-weight: 600;
    }

    /* Table — Pacientes style */
    .muted { color: var(--text-muted); text-align: center; margin-top: 2rem; }
    .empty-list {
      min-height: 180px; border: 1px dashed var(--border); border-radius: var(--radius);
      display: grid; place-items: center; text-align: center; gap: .5rem; padding: 1.2rem;
    }
    .empty-list p { margin: 0; color: var(--text-muted); }
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%; border-collapse: collapse; background: var(--white);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden;
    }
    th {
      background: var(--bg); padding: .7rem .8rem; text-align: left;
      font-size: .78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;
    }
    td { padding: .7rem .8rem; border-top: 1px solid var(--border); font-size: .9rem; }
    .dni-text { font-weight: 700; }

    .actions-cell { display: flex; gap: .5rem; align-items: center; }
    .btn-link {
      border: none; background: transparent; color: var(--primary);
      cursor: pointer; font-weight: 600; font: inherit; padding: 0;
    }
    .btn-link:hover { text-decoration: underline; }

    /* "..." dropdown menu */
    .menu-wrap { position: relative; }
    .btn-menu-trigger {
      background: none; border: 1px solid var(--border); border-radius: var(--radius);
      padding: .2rem .45rem; color: var(--text-muted); font-size: .85rem; cursor: pointer;
      line-height: 1; letter-spacing: .05em;
    }
    .btn-menu-trigger:hover { background: var(--bg); color: var(--text); }
    .btn-menu-trigger[aria-expanded='true'] { background: var(--bg); }
    .menu-dropdown {
      position: absolute; right: 0; top: calc(100% + 4px); z-index: 200;
      background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
      box-shadow: var(--shadow-lg); min-width: 160px; padding: .25rem 0;
    }
    .menu-item {
      display: block; width: 100%; text-align: left; background: none; border: none;
      padding: .5rem .85rem; font: inherit; font-size: .85rem; color: var(--text);
      cursor: pointer; text-decoration: none; white-space: nowrap;
    }
    .menu-item:hover { background: var(--bg); }
    .menu-item.danger { color: var(--error); }

    /* Badges — Pacientes style */
    .badge {
      font-size: .76rem; background: var(--bg); color: var(--text-muted);
      padding: .2rem .5rem; border-radius: 999px;
    }
    .badge.ok { background: var(--success-bg); color: var(--success); }
    .badge-info { background: color-mix(in srgb, var(--primary) 10%, var(--white)); color: var(--primary); }
    .badge-warning { background: color-mix(in srgb, var(--warning, #d97706) 12%, var(--white)); color: color-mix(in srgb, var(--warning, #d97706) 82%, var(--text)); }
    .badge-muted { background: color-mix(in srgb, var(--border) 55%, var(--white)); color: var(--text-muted); }
    /* Modal-only badge variants */
    .badge-profesional { background: color-mix(in srgb, var(--primary) 14%, white); color: color-mix(in srgb, var(--primary) 80%, #0a1628); }
    .badge-admin { background: color-mix(in srgb, #7c3aed 12%, white); color: #5b21b6; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: color-mix(in srgb, #0c172a 55%, transparent);
      display: grid; place-items: center; z-index: 900; padding: 1rem;
    }
    .modal {
      width: min(760px, 100%); max-height: calc(100dvh - 2rem); overflow: auto;
      background: var(--white); border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg) + 2px); box-shadow: var(--shadow-lg);
      padding: 1.25rem 1.25rem 1rem; display: flex; flex-direction: column;
      gap: .85rem; animation: modal-enter .2s ease;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; gap: .8rem; }
    .modal-title-row { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
    .modal-header h2 { margin: 0; font-size: 1.15rem; font-weight: 700; }
    .icon-close {
      flex-shrink: 0; width: 2rem; height: 2rem; border-radius: 999px;
      border: 1px solid var(--border); background: var(--white);
      color: var(--text); cursor: pointer; font-size: 1.1rem; line-height: 1;
    }
    .icon-close:hover { background: var(--bg); }
    .form-alert {
      border: 1px solid color-mix(in srgb, var(--error) 40%, var(--border));
      background: color-mix(in srgb, var(--error) 8%, white); color: var(--error);
      border-radius: var(--radius); padding: .55rem .7rem; font-size: .82rem; font-weight: 600;
    }

    /* Tipo tabs (pill selector) */
    .tipo-tabs {
      display: inline-flex; border: 1px solid var(--border); border-radius: 999px;
      background: var(--bg); padding: .2rem; gap: .15rem;
    }
    .tipo-tab {
      padding: .3rem .9rem; border: none; border-radius: 999px; background: transparent;
      color: var(--text-muted); font-size: .85rem; font-weight: 500; cursor: pointer;
      transition: background .15s, color .15s;
    }
    .tipo-tab:hover { background: color-mix(in srgb, var(--primary) 8%, var(--bg)); color: var(--text); }
    .tipo-tab-active { background: var(--white); color: var(--primary); font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.08); }

    /* Form */
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
    .field { display: flex; flex-direction: column; gap: .28rem; font-size: .87rem; }
    .field > span:first-child { font-weight: 600; font-size: .82rem; color: var(--text); }
    .field-full { grid-column: 1 / -1; }
    .req { color: var(--error); font-style: normal; }
    .optional { font-weight: 400; color: var(--text-muted); font-size: .78rem; font-style: normal; }
    .field-error { font-size: .74rem; color: var(--error); }
    .field input, .field select, .field textarea {
      border: 1px solid var(--border); border-radius: var(--radius);
      padding: .56rem .65rem; font: inherit; background: var(--white);
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .input-invalid { border-color: #e53e3e !important; background: color-mix(in srgb, #e53e3e 4%, var(--white)) !important; }
    .input-invalid:focus { box-shadow: 0 0 0 3px color-mix(in srgb, #e53e3e 18%, transparent) !important; }

    /* Chips / combobox */
    .chips-row { display: flex; flex-wrap: wrap; gap: .35rem; min-height: 1.4rem; }
    .chip {
      display: inline-flex; align-items: center; gap: .35rem; padding: .22rem .5rem;
      border-radius: 999px; background: color-mix(in srgb, var(--primary) 10%, var(--white));
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      color: var(--primary); font-size: .8rem; font-weight: 600;
    }
    .chip-remove { border: none; background: transparent; color: inherit; cursor: pointer; font-size: .85rem; line-height: 1; opacity: .7; padding: 0; }
    .chip-remove:hover { opacity: 1; }
    .combobox { position: relative; }
    .combobox-input {
      width: 100%; padding: .56rem .65rem; border: 1px solid var(--border);
      border-radius: var(--radius); font: inherit; box-sizing: border-box;
    }
    .combobox-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
    .dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
      box-shadow: var(--shadow-lg); z-index: 100; list-style: none; margin: 0; padding: .25rem 0;
      max-height: 200px; overflow-y: auto;
    }
    .dropdown li { padding: .5rem .75rem; cursor: pointer; font-size: .9rem; }
    .dropdown li:hover { background: var(--bg); }
    .dropdown-hint { padding: .5rem .75rem; font-size: .82rem; color: var(--text-muted); }

    /* Acceso inline */
    .acceso-row {
      display: flex; align-items: center; gap: .55rem; flex-wrap: wrap;
      padding: .45rem .65rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: color-mix(in srgb, var(--bg) 60%, var(--white)); font-size: .84rem;
    }
    .acceso-label { font-weight: 600; color: var(--text); white-space: nowrap; }
    .acceso-radio { display: inline-flex; align-items: center; gap: .3rem; cursor: pointer; }
    .acceso-radio input[type=radio] { margin: 0; }
    .acceso-sep { color: var(--border); font-size: .9rem; user-select: none; }
    .acceso-hint { color: var(--text-muted); font-size: .79rem; }

    /* Estado toggle */
    .toggle-field { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .2rem 0; }
    .toggle-label { font-size: .87rem; font-weight: 600; color: var(--text); }
    .toggle-switch { position: relative; display: inline-block; width: 2.4rem; height: 1.35rem; flex-shrink: 0; cursor: pointer; }
    .toggle-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
    .toggle-track {
      position: absolute; inset: 0; border-radius: 999px;
      background: var(--border); transition: background .2s; cursor: pointer;
    }
    .toggle-track::after {
      content: ''; position: absolute; width: 1.05rem; height: 1.05rem; border-radius: 50%;
      background: #fff; top: .15rem; left: .15rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.2); transition: transform .2s;
    }
    .toggle-switch input:checked + .toggle-track { background: var(--primary); }
    .toggle-switch input:checked + .toggle-track::after { transform: translateX(1.05rem); }
    .toggle-switch input:focus-visible + .toggle-track { outline: 2px solid var(--primary); outline-offset: 2px; }

    /* Modal actions */
    .modal-actions {
      display: flex; justify-content: flex-end; gap: .75rem;
      border-top: 1px solid var(--border); padding-top: .85rem; margin-top: .2rem;
    }
    .btn-cancel {
      padding: .5rem 1.1rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white); cursor: pointer; font-size: .88rem;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-save {
      padding: .5rem 1.2rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; font-weight: 600; cursor: pointer; font-size: .88rem;
    }
    .btn-save:hover:not(:disabled) { opacity: .9; }
    .btn-save:disabled { opacity: .6; cursor: default; }

    @keyframes modal-enter { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    @media (max-width: 700px) {
      .page { padding: .8rem; }
      .search-bar { flex-wrap: wrap; }
      .search-bar input { min-width: 0; flex: 1 1 160px; }
      .filters-panel { flex-direction: column; }
      .filters-panel select { width: 100%; }
      .form-grid { grid-template-columns: 1fr; }
      .field-full { grid-column: auto; }
      .acceso-row { flex-direction: column; align-items: flex-start; gap: .35rem; }
      .acceso-sep { display: none; }
      .menu-dropdown { right: auto; left: 0; }
    }
  `],
  host: { '(document:click)': 'onDocumentClick()' },
})
export class EquipoListPage {
  private readonly svc = inject(ColaboradoresService);
  private readonly ctx = inject(ConsultorioContextService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly auth = inject(AuthService);
  private readonly espSvc = inject(EspecialidadService);

  // ── data ──────────────────────────────────────────────────────────
  readonly rows = signal<EquipoMiembro[]>([]);
  readonly loading = signal(false);
  readonly partialError = signal(false);
  readonly saving = signal(false);

  // ── UI state ──────────────────────────────────────────────────────
  readonly filtersExpanded = signal(false);
  readonly showForm = signal(false);
  readonly editTarget = signal<EquipoMiembro | null>(null);
  readonly tipoSelected = signal<TipoMiembro>('PROFESIONAL');
  readonly acceso = signal<AccesoOpcion>('invitar');
  readonly formSubmitted = signal(false);
  readonly confirmCtx = signal<ConfirmCtx | null>(null);
  readonly openMenuId = signal<string | null>(null);

  // ── especialidades combobox ────────────────────────────────────────
  readonly especialidades = signal<string[]>([]);
  readonly espInput = signal('');
  readonly espDropdown = signal(false);
  readonly espCatalog = signal<{ id: string; nombre: string; activo: boolean }[]>([]);
  readonly filteredEsp = computed(() => {
    const q = this.espInput().toLowerCase();
    const selected = new Set(this.especialidades().map((e) => e.toLowerCase()));
    return this.espCatalog()
      .filter((e) => e.activo && !selected.has(e.nombre.toLowerCase()))
      .filter((e) => !q || e.nombre.toLowerCase().includes(q));
  });

  // ── cargo catalog ──────────────────────────────────────────────────
  readonly cargoOptions = signal<CargoEmpleadoCatalogo[]>([]);

  // ── auth ───────────────────────────────────────────────────────────
  readonly consultorioId = this.ctx.selectedConsultorioId;
  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));
  readonly isEditMode = computed(() => this.editTarget() !== null);

  // ── filters ────────────────────────────────────────────────────────
  readonly filtersForm = this.fb.nonNullable.group({
    q: [''],
    tipo: ['ALL'],
    estado: ['ALL'],
    invitacion: ['ALL'],
  });

  private readonly filterValues = toSignal(this.filtersForm.valueChanges, {
    initialValue: this.filtersForm.getRawValue(),
  });

  readonly filteredRows = computed(() => {
    const f = this.filterValues();
    const q = (f['q'] ?? '').toLowerCase().trim();
    const tipo = f['tipo'] ?? 'ALL';
    const estado = f['estado'] ?? 'ALL';
    const inv = f['invitacion'] ?? 'ALL';

    return this.rows().filter((m) => {
      if (tipo !== 'ALL' && m.tipo !== tipo) return false;
      if (estado !== 'ALL' && m.estadoColaborador !== estado) return false;
      if (inv !== 'ALL' && m.cuentaStatus !== inv) return false;
      if (q) {
        const datoEsp = m.tipo === 'PROFESIONAL'
          ? (m as ColaboradorProfesional & { tipo: 'PROFESIONAL' }).matricula ?? ''
          : (m as { cargo: string }).cargo ?? '';
        const searchable = `${m.nombre} ${m.apellido} ${m.email ?? ''} ${datoEsp}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  });

  readonly headerDescription = computed(() => {
    const total = this.rows().length;
    const shown = this.filteredRows().length;
    return total === shown
      ? `${total} ${total === 1 ? 'miembro' : 'miembros'} en el equipo`
      : `Mostrando ${shown} de ${total} miembros`;
  });

  readonly ctaLabel = computed(() => {
    if (this.isEditMode()) return 'Guardar cambios';
    if (this.tipoSelected() === 'PROFESIONAL') {
      return this.acceso() === 'invitar' ? 'Invitar profesional' : 'Agregar profesional';
    }
    return 'Agregar administrativo';
  });

  // ── form ───────────────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.maxLength(30)]],
    matricula: ['', [Validators.maxLength(50)]],
    dni: ['', [Validators.pattern(/^[0-9]{7,10}$/)]],
    fechaNacimiento: [''],
    cargo: [''],
    direccion: ['', [Validators.maxLength(255)]],
    notasInternas: ['', [Validators.maxLength(500)]],
    activo: [true],
    fechaBaja: [''],
    motivoBaja: [''],
  });

  constructor() {
    // reload on consultorio change
    effect(() => {
      const cid = this.consultorioId();
      if (cid) {
        this.load();
        this.loadCargos();
        this.loadEspecialidades();
      }
    });
    // re-validate email whenever acceso option changes
    effect(() => {
      this.acceso();
      this.updateEmailValidator();
    });
  }

  // ── document click handler ─────────────────────────────────────────
  onDocumentClick(): void {
    this.espDropdown.set(false);
    this.openMenuId.set(null);
  }

  // ── menu helpers ───────────────────────────────────────────────────
  toggleMenu(id: string): void {
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── helpers ────────────────────────────────────────────────────────
  labelEstado(estado: ColaboradorEstado): string {
    const labels: Record<ColaboradorEstado, string> = {
      ACTIVO: 'Activo', INACTIVO: 'Inactivo', INVITADO: 'Invitado', RECHAZADO: 'Rechazado',
    };
    return labels[estado] ?? estado;
  }

  labelCuenta(status: CuentaStatus): string {
    const labels: Record<CuentaStatus, string> = {
      NONE: 'Sin cuenta', PENDING: 'Pendiente', ACTIVE: 'Cuenta activa', REJECTED: 'Rechazada',
    };
    return labels[status] ?? status;
  }

  datoEspecifico(m: EquipoMiembro): string {
    if (m.tipo === 'PROFESIONAL') {
      return (m as ColaboradorProfesional & { tipo: 'PROFESIONAL' }).matricula || '-';
    }
    return (m as { cargo: string }).cargo || '-';
  }

  getDni(m: EquipoMiembro): string | null {
    if (m.tipo === 'PROFESIONAL') {
      return (m as ColaboradorProfesional & { tipo: 'PROFESIONAL' }).nroDocumento ?? null;
    }
    return (m as ColaboradorEmpleado & { tipo: 'ADMINISTRATIVO' }).dni ?? null;
  }

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[name];
    return ctrl.invalid && (ctrl.touched || this.formSubmitted());
  }

  // ── data loading ───────────────────────────────────────────────────
  load(): void {
    const cid = this.consultorioId();
    if (!cid) return;
    this.loading.set(true);
    this.partialError.set(false);

    let profFailed = false;
    let empFailed = false;

    forkJoin({
      profesionales: this.svc.listProfesionales(cid).pipe(
        catchError(() => { profFailed = true; return of([]); }),
      ),
      empleados: this.svc.listEmpleados(cid).pipe(
        catchError(() => { empFailed = true; return of([]); }),
      ),
    }).subscribe({
      next: ({ profesionales, empleados }) => {
        if (profFailed || empFailed) this.partialError.set(true);
        const merged: EquipoMiembro[] = [
          ...profesionales.map((p) => ({ ...p, tipo: 'PROFESIONAL' as const })),
          ...empleados.map((e) => ({ ...e, tipo: 'ADMINISTRATIVO' as const })),
        ];
        merged.sort((a, b) =>
          `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`, 'es'),
        );
        this.rows.set(merged);
        this.loading.set(false);
      },
    });
  }

  private loadCargos(): void {
    const cid = this.consultorioId();
    if (!cid) return;
    this.svc.listCargosEmpleado(cid).subscribe({
      next: (rows) => this.cargoOptions.set(rows),
      error: () => this.cargoOptions.set([]),
    });
  }

  private loadEspecialidades(): void {
    const cid = this.consultorioId();
    if (!cid) return;
    this.espSvc.list(cid, { includeInactive: false }).subscribe({
      next: (rows) => this.espCatalog.set(rows),
      error: () => this.espCatalog.set([]),
    });
  }

  // ── form open/close ────────────────────────────────────────────────
  openCreate(): void {
    this.editTarget.set(null);
    this.tipoSelected.set('PROFESIONAL');
    this.acceso.set('invitar');
    this.especialidades.set([]);
    this.espInput.set('');
    this.formSubmitted.set(false);
    this.form.reset({
      nombre: '', apellido: '', email: '', telefono: '', matricula: '',
      dni: '', fechaNacimiento: '', cargo: '', direccion: '', notasInternas: '',
      activo: true, fechaBaja: '', motivoBaja: '',
    });
    this.applyValidators('PROFESIONAL', false);
    this.showForm.set(true);
  }

  openEdit(m: EquipoMiembro): void {
    this.editTarget.set(m);
    this.tipoSelected.set(m.tipo);
    this.formSubmitted.set(false);
    this.espInput.set('');

    if (m.tipo === 'PROFESIONAL') {
      const p = m as ColaboradorProfesional & { tipo: 'PROFESIONAL' };
      this.especialidades.set(p.especialidades ?? []);
      this.form.reset({
        nombre: p.nombre ?? '', apellido: p.apellido ?? '',
        email: p.email ?? '', telefono: p.telefono ?? '',
        matricula: p.matricula ?? '',
        dni: p.nroDocumento ?? '',
        fechaNacimiento: '', cargo: '',
        direccion: p.domicilio ?? '',
        notasInternas: '',
        activo: p.activo, fechaBaja: p.fechaBaja ?? '', motivoBaja: p.motivoBaja ?? '',
      });
    } else {
      const e = m as ColaboradorEmpleado & { tipo: 'ADMINISTRATIVO' };
      this.especialidades.set([]);
      this.form.reset({
        nombre: e.nombre ?? '', apellido: e.apellido ?? '',
        email: e.email ?? '', telefono: e.telefono ?? '',
        matricula: '', dni: e.dni ?? '', fechaNacimiento: e.fechaNacimiento ?? '',
        cargo: e.cargo ?? '', direccion: e.direccion ?? '', notasInternas: e.notasInternas ?? '',
        activo: e.activo, fechaBaja: e.fechaBaja ?? '', motivoBaja: e.motivoBaja ?? '',
      });
    }
    this.applyValidators(m.tipo, true);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editTarget.set(null);
    this.saving.set(false);
  }

  setTipo(tipo: TipoMiembro): void {
    this.tipoSelected.set(tipo);
    this.formSubmitted.set(false);
    this.especialidades.set([]);
    this.form.reset({
      nombre: this.form.controls.nombre.value,
      apellido: this.form.controls.apellido.value,
      email: this.form.controls.email.value,
      telefono: this.form.controls.telefono.value,
      matricula: '', dni: '', fechaNacimiento: '', cargo: '',
      direccion: '', notasInternas: '', activo: true, fechaBaja: '', motivoBaja: '',
    });
    this.applyValidators(tipo, false);
  }

  // ── especialidades helpers ─────────────────────────────────────────
  addEsp(nombre: string): void {
    const exists = this.especialidades().some((x) => x.toLowerCase() === nombre.toLowerCase());
    if (!exists) this.especialidades.update((v) => [...v, nombre]);
    this.espInput.set('');
    this.espDropdown.set(false);
  }

  removeEsp(value: string): void {
    this.especialidades.update((v) => v.filter((x) => x !== value));
  }

  selectFirstEsp(): void {
    const opts = this.filteredEsp();
    if (opts.length > 0) {
      this.addEsp(opts[0].nombre);
    } else {
      const val = this.espInput().trim();
      if (val) this.addEsp(val);
    }
  }

  // ── submit ─────────────────────────────────────────────────────────
  submit(): void {
    this.formSubmitted.set(true);
    const tipo = this.tipoSelected();

    const espInvalid = tipo === 'PROFESIONAL' && this.especialidades().length === 0;
    if (this.form.invalid || espInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const isEdit = this.isEditMode();
    if (isEdit && !v.activo && (!v.fechaBaja || !v.motivoBaja.trim())) return;

    const cid = this.consultorioId();
    if (!cid) return;

    this.saving.set(true);
    const target = this.editTarget();

    if (tipo === 'PROFESIONAL') {
      const req: ProfesionalColaboradorRequest = {
        nombre: v.nombre,
        apellido: v.apellido,
        nroDocumento: v.dni || undefined,
        email: v.email || undefined,
        telefono: v.telefono || undefined,
        matricula: v.matricula || undefined,
        especialidades: this.especialidades(),
        domicilio: v.direccion || undefined,
        modoAlta: !isEdit ? (this.acceso() === 'invitar' ? 'INVITACION' : 'DIRECTA') : undefined,
      };
      const request$ = target
        ? this.svc.updateProfesional(cid, target.id, req)
        : this.svc.createProfesional(cid, req);

      request$.subscribe({
        next: (saved) => {
          if (isEdit) {
            this.svc.changeProfesionalEstado(cid, saved.id, {
              activo: v.activo,
              fechaDeBaja: v.fechaBaja || undefined,
              motivoDeBaja: v.motivoBaja || undefined,
            }).subscribe({
              next: () => this.afterSave(isEdit),
              error: (err: unknown) => { this.saving.set(false); this.toast.error(this.errMap.toMessage(err)); },
            });
          } else {
            this.afterSave(isEdit);
          }
        },
        error: (err: unknown) => { this.saving.set(false); this.toast.error(this.errMap.toMessage(err)); },
      });
    } else {
      const cargoCatalog = this.cargoOptions().find((c) => c.nombre === v.cargo);
      const req: EmpleadoColaboradorRequest = {
        nombre: v.nombre,
        apellido: v.apellido,
        email: v.email,
        telefono: v.telefono || undefined,
        cargo: cargoCatalog?.slug ?? v.cargo,
        dni: v.dni,
        fechaNacimiento: v.fechaNacimiento || undefined,
        direccion: v.direccion || undefined,
        notasInternas: v.notasInternas || undefined,
      };
      const request$ = target
        ? this.svc.updateEmpleado(cid, target.id, req)
        : this.svc.createEmpleado(cid, req);

      request$.subscribe({
        next: (saved) => {
          if (isEdit) {
            this.svc.changeEmpleadoEstado(cid, saved.id, {
              activo: v.activo,
              fechaDeBaja: v.fechaBaja || undefined,
              motivoDeBaja: v.motivoBaja || undefined,
            }).subscribe({
              next: () => this.afterSave(isEdit),
              error: (err: unknown) => { this.saving.set(false); this.toast.error(this.errMap.toMessage(err)); },
            });
          } else {
            this.afterSave(isEdit);
          }
        },
        error: (err: unknown) => { this.saving.set(false); this.toast.error(this.errMap.toMessage(err)); },
      });
    }
  }

  private afterSave(isEdit: boolean): void {
    this.saving.set(false);
    this.toast.success(isEdit ? 'Miembro actualizado.' : 'Miembro agregado.');
    this.closeForm();
    this.load();
  }

  // ── estado toggle ──────────────────────────────────────────────────
  askToggle(m: EquipoMiembro, nextActive: boolean): void {
    this.confirmCtx.set({ miembro: m, nextActive });
  }

  confirmToggle(): void {
    const ctx = this.confirmCtx();
    const cid = this.consultorioId();
    if (!ctx || !cid) return;

    const { miembro, nextActive } = ctx;
    const estadoReq = {
      activo: nextActive,
      fechaDeBaja: nextActive ? undefined : new Date().toISOString().slice(0, 10),
      motivoDeBaja: nextActive ? undefined : 'Baja desde panel de equipo',
    };

    const onSuccess = () => {
      this.toast.success(nextActive ? 'Miembro reactivado.' : 'Miembro inactivado.');
      this.confirmCtx.set(null);
      this.load();
    };
    const onError = (err: unknown) => {
      this.toast.error(this.errMap.toMessage(err));
      this.confirmCtx.set(null);
    };

    if (miembro.tipo === 'PROFESIONAL') {
      this.svc.changeProfesionalEstado(cid, miembro.id, estadoReq).subscribe({ next: onSuccess, error: onError });
    } else {
      this.svc.changeEmpleadoEstado(cid, miembro.id, estadoReq).subscribe({ next: onSuccess, error: onError });
    }
  }

  reenviarActivacion(m: EquipoMiembro): void {
    const cid = this.consultorioId();
    if (!cid) return;
    const onError = (err: unknown) => this.toast.error(this.errMap.toMessage(err));
    if (m.tipo === 'PROFESIONAL') {
      this.svc.reenviarActivacionProfesional(cid, m.id).subscribe({
        next: () => { this.toast.success('Activación reenviada.'); this.load(); },
        error: onError,
      });
    } else {
      this.svc.reenviarActivacionEmpleado(cid, m.id).subscribe({
        next: () => { this.toast.success('Activación reenviada.'); this.load(); },
        error: onError,
      });
    }
  }

  crearCuenta(m: EquipoMiembro): void {
    const cid = this.consultorioId();
    if (!cid || m.tipo !== 'PROFESIONAL') return;
    const p = m as ColaboradorProfesional & { tipo: 'PROFESIONAL' };
    this.svc.crearCuentaProfesional(cid, p.id, p.email ?? undefined).subscribe({
      next: () => { this.toast.success('Cuenta creada y activación enviada.'); this.load(); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  // ── validators ─────────────────────────────────────────────────────
  private updateEmailValidator(): void {
    const c = this.form.controls;
    if (this.acceso() === 'invitar' && !this.isEditMode()) {
      c.email.setValidators([Validators.required, Validators.email, Validators.maxLength(255)]);
    } else {
      c.email.setValidators([Validators.email, Validators.maxLength(255)]);
    }
    c.email.updateValueAndValidity({ emitEvent: false });
  }

  private applyValidators(tipo: TipoMiembro, isEdit: boolean): void {
    const c = this.form.controls;

    // Common: DNI required for both tipos
    c.dni.setValidators([Validators.required, Validators.pattern(/^[0-9]{7,10}$/)]);
    c.telefono.setValidators([Validators.maxLength(30)]);
    c.fechaNacimiento.setValidators([]);
    c.direccion.setValidators([Validators.maxLength(255)]);

    // Role-specific
    if (tipo === 'PROFESIONAL') {
      c.matricula.setValidators([Validators.required, Validators.maxLength(50)]);
      c.cargo.setValidators([]);
    } else {
      c.matricula.setValidators([Validators.maxLength(50)]);
      c.cargo.setValidators([Validators.required]);
    }

    // Email: required only if inviting (handled reactively by effect)
    this.updateEmailValidator();

    Object.values(c).forEach((ctrl) => ctrl.updateValueAndValidity({ emitEvent: false }));

    if (!isEdit) {
      c.activo.clearValidators();
      c.fechaBaja.clearValidators();
      c.motivoBaja.clearValidators();
      c.activo.updateValueAndValidity({ emitEvent: false });
      c.fechaBaja.updateValueAndValidity({ emitEvent: false });
      c.motivoBaja.updateValueAndValidity({ emitEvent: false });
    }
  }
}
