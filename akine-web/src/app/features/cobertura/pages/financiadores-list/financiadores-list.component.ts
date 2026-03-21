import {
  ChangeDetectionStrategy,
  computed,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CoberturaService } from '../../services/cobertura.service';
import { FinanciadorSalud, TipoFinanciador, PlanFinanciador, TipoPlan } from '../../models/cobertura.models';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-financiadores-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageSectionHeaderComponent, ConfirmDialog],
  template: `
    <div class="page">
      <app-page-section-header
        title="Financiadores de Salud"
        description="Administración de Obras Sociales, Prepagas y Mutuales."
        titleLevel="h2"
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
        <button header-actions class="btn-primary" type="button" (click)="openCreate()">
          + Nuevo Financiador
        </button>
      </app-page-section-header>

      @if (filtersExpanded()) {
        <form [formGroup]="filtersForm" class="filters" (ngSubmit)="applyFilters()">
          <input formControlName="q" type="text" placeholder="Buscar por nombre o acrónimo" />
          <select formControlName="tipo">
            <option value="">Todos los tipos</option>
            @for (t of tipos; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
          <select formControlName="estado">
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
          <button class="btn-filter" type="submit">Aplicar filtros</button>
          <button class="btn-filter" type="button" (click)="clearFilters()">Limpiar</button>
        </form>
      }

      @if (isLoading()) {
        <p class="empty">Cargando financiadores...</p>
      } @else if (loadError()) {
        <p class="empty error-msg">No se pudieron cargar los financiadores. <button class="link-btn" type="button" (click)="load()">Reintentar</button></p>
      } @else {
        <table class="table app-data-table">
          <thead>
            <tr>
              <th class="col-text">Nombre</th>
              <th class="col-text-short">Tipo</th>
              <th class="col-numeric">Planes</th>
              <th class="col-status">Estado</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (f of filteredFinanciadores(); track f.id) {
              <tr [class.row-expanded]="expandedFinanciadorId() === f.id">
                <td class="col-text">
                  <span class="nombre">{{ f.nombre }}</span>
                  @if (f.nombreCorto) {
                    <span class="sub">{{ f.nombreCorto }}</span>
                  }
                </td>
                <td class="col-text-short">{{ tipoLabel(f.tipoFinanciador) }}</td>
                <td class="col-numeric">
                  <button
                    class="badge badge-plan badge-toggle"
                    type="button"
                    [attr.aria-expanded]="expandedFinanciadorId() === f.id"
                    [attr.aria-label]="'Ver planes de ' + f.nombre"
                    (click)="togglePlanes(f)"
                  >
                    {{ planesBadgeLabel(f.id) }}
                    <svg
                      class="chevron"
                      [class.chevron-open]="expandedFinanciadorId() === f.id"
                      viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </td>
                <td class="col-status">
                  <span class="badge" [class.badge-active]="f.activo" [class.badge-inactive]="!f.activo">
                    <strong>{{ f.activo ? 'Activo' : 'Inactivo' }}</strong>
                  </span>
                </td>
                <td class="col-actions">
                  <button class="table-row-action" type="button" (click)="openEdit(f)">Editar</button>
                  <button class="table-row-action table-row-action--primary" type="button" (click)="openCreatePlan(f)">+ Plan</button>
                </td>
              </tr>

              @if (expandedFinanciadorId() === f.id) {
                <tr class="plans-expansion-row">
                  <td colspan="5" class="plans-expansion-cell">
                    <div class="plans-panel">
                      <div class="plans-panel-header">
                        <span class="plans-panel-title">Planes — {{ f.nombre }}</span>
                        <button class="btn-primary btn-sm" type="button" (click)="openCreatePlan(f)">+ Agregar plan</button>
                      </div>

                      @if (loadingPlanesFor() === f.id) {
                        <p class="plans-empty">Cargando planes...</p>
                      } @else {
                        @let planes = planesByFin()[f.id!] ?? [];
                        @if (planes.length === 0) {
                          <p class="plans-empty">No hay planes configurados para este financiador.</p>
                        } @else {
                          <table class="plans-table">
                            <thead>
                              <tr>
                                <th class="col-text">Plan</th>
                                <th class="col-text-short">Tipo</th>
                                <th class="col-text">Vigencia</th>
                                <th class="col-status">Estado</th>
                                <th class="col-actions"></th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (p of planes; track p.id) {
                                <tr>
                                  <td class="col-text"><strong>{{ p.nombrePlan }}</strong></td>
                                  <td class="col-text-short">{{ tipoPlanLabel(p.tipoPlan) }}</td>
                                  <td class="col-text">{{ formatVigencia(p.vigenciaDesde, p.vigenciaHasta) }}</td>
                                  <td class="col-status">
                                    <span class="badge" [class.badge-active]="p.activo" [class.badge-inactive]="!p.activo">
                                      <strong>{{ p.activo ? 'Activo' : 'Inactivo' }}</strong>
                                    </span>
                                  </td>
                                  <td class="col-actions">
                                    <button class="table-row-action" type="button" (click)="openEditPlan(p)">Editar</button>
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      }
                    </div>
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="5" class="empty">
                  @if (financiadores().length === 0) {
                    No hay financiadores configurados.
                    <button class="link-btn" type="button" (click)="cargarListadoBase()" [disabled]="isSeeding()">
                      {{ isSeeding() ? 'Cargando listado...' : 'Cargar listado base de obras sociales' }}
                    </button>
                  } @else {
                    No hay resultados para los filtros seleccionados.
                    <button class="link-btn" type="button" (click)="clearFilters()">Limpiar filtros</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <!-- Modal: Financiador -->
    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h4>{{ editTarget() ? 'Editar Financiador' : 'Nuevo Financiador' }}</h4>
              <p>Complete los datos básicos del financiador de salud.</p>
            </div>
            <button class="icon-btn" type="button" aria-label="Cerrar" (click)="closeModal()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">
              <div class="field full-width">
                <label for="fin-nombre">Nombre Completo *</label>
                <input
                  id="fin-nombre"
                  type="text"
                  formControlName="nombre"
                  placeholder="Ej: Obra Social del Personal de Dirección"
                  autofocus
                  (input)="nombreError.set(null)"
                />
                @if (form.get('nombre')?.touched && form.get('nombre')?.hasError('required')) {
                  <small class="field-error">El nombre es obligatorio.</small>
                }
                @if (nombreError()) {
                  <small class="field-error">{{ nombreError() }}</small>
                }
              </div>

              <div class="field">
                <label for="fin-nombreCorto">Nombre Corto / Acrónimo</label>
                <input id="fin-nombreCorto" type="text" formControlName="nombreCorto" placeholder="Ej: OSDE" />
              </div>

              <div class="field">
                <label for="fin-tipo">Tipo de Financiador *</label>
                <select id="fin-tipo" formControlName="tipoFinanciador">
                  @for (t of tipos; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label for="fin-codigo">Código Externo / SSS</label>
                <input id="fin-codigo" type="text" formControlName="codigoExterno" placeholder="Ej: 1-0000-1" />
              </div>

              <div class="field">
                <label for="fin-ambito">Ámbito de Cobertura</label>
                <input id="fin-ambito" type="text" formControlName="ambitoCobertura" placeholder="Ej: Nacional, Provincial" />
              </div>

              <div class="field full-width">
                <label class="switch-row">
                  <input type="checkbox" formControlName="activo" class="switch-input" />
                  <span class="switch-track" aria-hidden="true"></span>
                  <span class="switch-label">Financiador Activo</span>
                </label>
              </div>
            </div>

            @if (saveError()) {
              <p class="save-error">{{ saveError() }}</p>
            }
            <div class="modal-actions">
              <button class="btn-secondary" type="button" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" type="submit" [disabled]="form.invalid || isSaving()">
                {{ isSaving() ? 'Guardando...' : 'Guardar Financiador' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal: Plan -->
    @if (showPlanModal()) {
      <div class="overlay" (click)="closePlanModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h4>{{ editPlanTarget() ? 'Editar Plan' : 'Nuevo Plan' }}</h4>
              <p>{{ planModalFinanciadorNombre() }}</p>
            </div>
            <button class="icon-btn" type="button" aria-label="Cerrar" (click)="closePlanModal()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <form [formGroup]="planForm" (ngSubmit)="savePlan()">
            <div class="form-grid">
              <div class="field full-width">
                <label for="pla-nombre">Nombre del Plan *</label>
                <input
                  id="pla-nombre"
                  type="text"
                  formControlName="nombrePlan"
                  placeholder="Ej: Plan 210"
                  autofocus
                  (input)="planNombreError.set(null)"
                />
                @if (planForm.get('nombrePlan')?.touched && planForm.get('nombrePlan')?.hasError('required')) {
                  <small class="field-error">El nombre del plan es obligatorio.</small>
                }
                @if (planNombreError()) {
                  <small class="field-error">{{ planNombreError() }}</small>
                }
              </div>

              <div class="field full-width">
                <label for="pla-tipo">Tipo de Plan *</label>
                <select id="pla-tipo" formControlName="tipoPlan">
                  @for (t of tiposPlan; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label for="pla-desde">Vigencia Desde</label>
                <input id="pla-desde" type="date" formControlName="vigenciaDesde" />
              </div>

              <div class="field">
                <label for="pla-hasta">Vigencia Hasta</label>
                <input id="pla-hasta" type="date" formControlName="vigenciaHasta" />
              </div>

              <div class="field full-width toggles">
                <label class="switch-row">
                  <input type="checkbox" formControlName="requiereAutorizacionDefault" class="switch-input" />
                  <span class="switch-track" aria-hidden="true"></span>
                  <span class="switch-label">Requiere autorización por defecto</span>
                </label>
                <label class="switch-row">
                  <input type="checkbox" formControlName="activo" class="switch-input" />
                  <span class="switch-track" aria-hidden="true"></span>
                  <span class="switch-label">Plan Activo</span>
                </label>
              </div>
            </div>

            @if (savePlanError()) {
              <p class="save-error">{{ savePlanError() }}</p>
            }
            <div class="modal-actions">
              <button class="btn-secondary" type="button" (click)="closePlanModal()">Cancelar</button>
              <button class="btn-primary" type="submit" [disabled]="planForm.invalid || isSavingPlan()">
                {{ isSavingPlan() ? 'Guardando...' : 'Guardar Plan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (discardTarget()) {
      <app-confirm-dialog
        title="¿Descartar cambios?"
        message="Hay datos cargados que todavía no fueron guardados."
        confirmLabel="Descartar"
        (confirmed)="forceClose()"
        (cancelled)="discardTarget.set(false)"
      />
    }

    @if (discardPlanTarget()) {
      <app-confirm-dialog
        title="¿Descartar cambios?"
        message="Hay datos cargados que todavía no fueron guardados."
        confirmLabel="Descartar"
        (confirmed)="forcePlanClose()"
        (cancelled)="discardPlanTarget.set(false)"
      />
    }
  `,
  styles: [`
    .page { display: grid; gap: 1rem; }
    .btn-icon {
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
      cursor: pointer;
      transition: border-color .18s ease, background-color .18s ease, color .18s ease;
    }
    .btn-icon[aria-expanded='true'] {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, white);
      color: var(--primary);
    }
    .filters {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr auto auto;
      gap: .5rem;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg, 16px) - 2px);
      background: color-mix(in srgb, var(--white) 92%, var(--bg));
      align-items: end;
    }
    .filters input, .filters select {
      min-height: 2.5rem;
      padding: .5rem .65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: .85rem;
      background: var(--white);
    }
    .btn-filter {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      color: var(--text);
      cursor: pointer;
      font-size: .85rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface, var(--white));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .table th,
    .table td { padding: .65rem .75rem; border-bottom: 1px solid var(--border); font-size: .86rem; }
    .table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
    .table tr:last-child td { border-bottom: 0; }
    .col-text { text-align: left; }
    .col-text-short { text-align: left; width: 130px; }
    .col-numeric { text-align: center; width: 110px; }
    .col-status { text-align: left; width: 100px; }
    .col-actions { text-align: right; width: 140px; white-space: nowrap; }

    .row-expanded > td { background: color-mix(in srgb, var(--primary, #1A6B5E) 4%, var(--white, #fff)); }

    .nombre { display: block; font-weight: 600; }
    .sub { display: block; font-size: .78rem; color: var(--text-muted); margin-top: .1rem; }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: .2rem .55rem;
      border-radius: 999px;
      font-size: .75rem;
    }
    .badge-plan {
      background: var(--surface-alt, #f1f5f9);
      color: var(--text-muted);
    }
    .badge-toggle {
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      transition: background .15s, color .15s;
    }
    .badge-toggle:hover,
    .badge-toggle[aria-expanded='true'] {
      background: color-mix(in srgb, var(--primary, #1A6B5E) 15%, var(--surface-alt, #f1f5f9));
      color: var(--primary, #1A6B5E);
    }
    .chevron {
      flex-shrink: 0;
      transition: transform .2s;
    }
    .chevron-open { transform: rotate(180deg); }

    .badge-active { background: var(--success-bg); color: var(--success); }
    .badge-inactive { background: var(--error-bg, #fef2f2); color: var(--error, #dc2626); }

    /* Plans expansion row */
    .plans-expansion-row > .plans-expansion-cell {
      padding: 0;
      border-bottom: 1px solid var(--border);
    }
    .plans-panel {
      padding: .75rem 1rem .75rem 2rem;
      background: color-mix(in srgb, var(--primary, #1A6B5E) 3%, var(--neutral-50, #F8FAFC));
      border-top: 1px solid color-mix(in srgb, var(--primary, #1A6B5E) 18%, var(--border));
    }
    .plans-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: .6rem;
    }
    .plans-panel-title {
      font-size: .8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .plans-empty {
      color: var(--text-muted);
      font-size: .84rem;
      padding: .5rem 0;
      margin: 0;
    }
    .plans-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      font-size: .84rem;
    }
    .plans-table th,
    .plans-table td { padding: .5rem .65rem; border-bottom: 1px solid var(--border); }
    .plans-table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
    .plans-table tr:last-child td { border-bottom: 0; }

    .btn-primary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-size: .85rem;
      font-weight: 600;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .btn-primary.btn-sm {
      min-height: 2rem;
      padding: 0 .75rem;
      font-size: .8rem;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      cursor: pointer;
      font-size: .85rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
    }
    .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }

    .table-row-action {
      background: none;
      border: none;
      padding: .2rem .4rem;
      color: var(--primary);
      cursor: pointer;
      font-size: .82rem;
      font-weight: 500;
      border-radius: 4px;
      transition: background .15s;
    }
    .table-row-action:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); }
    .table-row-action--primary { font-weight: 600; }

    .empty { color: var(--text-muted); text-align: center; padding: 1.5rem; font-size: .86rem; }

    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 35%);
      display: grid; place-items: center;
      z-index: 900;
    }
    .modal {
      width: min(560px, 92vw);
      background: var(--white);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }
    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem;
    }
    .modal h4 { margin: 0 0 .2rem; font-size: 1rem; font-weight: 700; }
    .modal p { margin: 0; color: var(--text-muted); font-size: .82rem; }
    .icon-btn {
      width: 34px; height: 34px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--white);
      display: inline-grid; place-items: center;
      cursor: pointer; color: var(--text-muted); font-size: 1.2rem; flex-shrink: 0;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .75rem;
    }
    .full-width { grid-column: 1 / -1; }
    .field { display: grid; gap: .3rem; }
    .field label { font-size: .82rem; font-weight: 600; color: var(--text-muted); }
    .field input,
    .field select {
      height: 38px;
      padding: 0 .65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: .86rem;
      background: var(--white);
    }
    .field input[type="date"] { height: 38px; }
    .field input:focus,
    .field select:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
    }
    .field-error { color: var(--error, #dc2626); font-size: .78rem; }
    .toggles { display: flex; flex-direction: column; gap: .5rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: .5rem; }
    .save-error { color: var(--error, #dc2626); font-size: .82rem; margin: 0 0 .25rem; }
    .error-msg { color: var(--error, #dc2626); }
    .link-btn { background: none; border: none; padding: 0; color: var(--primary); cursor: pointer; font-size: inherit; text-decoration: underline; }

    /* Toggle switch — CSS only, sin Material */
    .switch-row { position: relative; display: inline-flex; align-items: center; gap: .6rem; cursor: pointer; user-select: none; }
    .switch-input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
    .switch-track {
      position: relative; display: inline-block;
      width: 36px; height: 20px;
      background: var(--border, #d1d5db);
      border-radius: 999px;
      transition: background .2s;
      flex-shrink: 0;
    }
    .switch-track::after {
      content: ''; position: absolute;
      top: 2px; left: 2px;
      width: 16px; height: 16px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgb(0 0 0 / .2);
      transition: transform .2s;
    }
    .switch-input:checked + .switch-track { background: var(--primary); }
    .switch-input:checked + .switch-track::after { transform: translateX(16px); }
    .switch-input:focus-visible + .switch-track { outline: 2px solid var(--primary); outline-offset: 2px; }
    .switch-label { font-size: .86rem; font-weight: 600; color: var(--text); }

    @media (max-width: 640px) {
      .filters { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: 1; }
      .col-text-short { display: none; }
      .plans-panel { padding-left: .75rem; }
    }
  `],
})
export class FinanciadoresListComponent implements OnInit {
  private svc = inject(CoberturaService);
  private fb = inject(FormBuilder);
  private ctx = inject(ConsultorioContextService);

  private get consultorioId(): string {
    return this.ctx.selectedConsultorioId();
  }

  // --- Financiadores state ---
  financiadores = signal<FinanciadorSalud[]>([]);
  isLoading = signal(true);
  loadError = signal(false);
  showModal = signal(false);
  editTarget = signal<FinanciadorSalud | null>(null);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  nombreError = signal<string | null>(null);
  discardTarget = signal(false);
  isSeeding = signal(false);
  planCountByFinanciadorId = signal<Record<string, number>>({});

  // --- Plans inline expansion ---
  expandedFinanciadorId = signal<string | null>(null);
  planesByFin = signal<Partial<Record<string, PlanFinanciador[]>>>({});
  loadingPlanesFor = signal<string | null>(null);

  // --- Plan modal ---
  showPlanModal = signal(false);
  planFinanciadorId = signal('');
  editPlanTarget = signal<PlanFinanciador | null>(null);
  isSavingPlan = signal(false);
  savePlanError = signal<string | null>(null);
  planNombreError = signal<string | null>(null);
  discardPlanTarget = signal(false);
  planForm: FormGroup = this.buildPlanForm(null, '');

  readonly planModalFinanciadorNombre = computed(() => {
    const fin = this.financiadores().find((f) => f.id === this.planFinanciadorId());
    return fin ? `Financiador: ${fin.nombre}` : '';
  });

  tipos = Object.values(TipoFinanciador).map((v) => ({ value: v, label: this.formatTipo(v) }));
  tiposPlan = Object.values(TipoPlan).map((v) => ({ value: v, label: this.formatTipoPlan(v) }));
  form: FormGroup = this.buildForm(null);

  // --- Filters ---
  filtersExpanded = signal(false);
  filtersForm: FormGroup = this.fb.group({ q: [''], tipo: [''], estado: [''] });
  activeFilters = signal<{ q: string; tipo: string; estado: string }>({ q: '', tipo: '', estado: '' });

  readonly filteredFinanciadores = computed(() => {
    const { q, tipo, estado } = this.activeFilters();
    return this.financiadores().filter((f) => {
      const matchQ = !q || f.nombre.toLowerCase().includes(q.toLowerCase()) || (f.nombreCorto ?? '').toLowerCase().includes(q.toLowerCase());
      const matchTipo = !tipo || f.tipoFinanciador === tipo;
      const matchEstado = !estado || (estado === 'ACTIVO' ? f.activo : !f.activo);
      return matchQ && matchTipo && matchEstado;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.consultorioId) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.loadError.set(false);
    this.svc.getFinanciadores(this.consultorioId).subscribe({
      next: (data) => {
        this.financiadores.set(data);
        this.loadPlanesCountByFinanciador(data);
        this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.loadError.set(true); },
    });
  }

  cargarListadoBase(): void {
    if (!this.consultorioId || this.isSeeding()) return;
    this.isSeeding.set(true);
    this.svc.seedFinanciadores(this.consultorioId).subscribe({
      next: () => { this.isSeeding.set(false); this.load(); },
      error: () => { this.isSeeding.set(false); this.loadError.set(true); },
    });
  }

  toggleFilters(): void { this.filtersExpanded.update(v => !v); }

  applyFilters(): void {
    const { q, tipo, estado } = this.filtersForm.value;
    this.activeFilters.set({ q: q ?? '', tipo: tipo ?? '', estado: estado ?? '' });
  }

  clearFilters(): void {
    this.filtersForm.reset({ q: '', tipo: '', estado: '' });
    this.activeFilters.set({ q: '', tipo: '', estado: '' });
  }

  // --- Plans expansion ---
  togglePlanes(f: FinanciadorSalud): void {
    const id = f.id!;
    if (this.expandedFinanciadorId() === id) {
      this.expandedFinanciadorId.set(null);
      return;
    }
    this.expandedFinanciadorId.set(id);
    if (this.planesByFin()[id] !== undefined) return; // already loaded
    this.loadingPlanesFor.set(id);
    this.svc.getPlanesByFinanciador(id).subscribe({
      next: (data) => {
        this.planesByFin.update(m => ({ ...m, [id]: data }));
        this.loadingPlanesFor.set(null);
      },
      error: () => {
        this.planesByFin.update(m => ({ ...m, [id]: [] }));
        this.loadingPlanesFor.set(null);
      },
    });
  }

  // --- Financiador modal ---
  openCreate(): void {
    this.editTarget.set(null);
    this.form = this.buildForm(null);
    this.showModal.set(true);
  }

  openEdit(f: FinanciadorSalud): void {
    this.editTarget.set(f);
    this.form = this.buildForm(f);
    this.showModal.set(true);
  }

  closeModal(): void {
    if (this.form.dirty) {
      this.discardTarget.set(true);
      return;
    }
    this.forceClose();
  }

  forceClose(): void {
    this.showModal.set(false);
    this.discardTarget.set(false);
    this.editTarget.set(null);
    this.isSaving.set(false);
    this.saveError.set(null);
    this.nombreError.set(null);
  }

  save(): void {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    this.saveError.set(null);
    this.nombreError.set(null);
    const target = this.editTarget();
    const payload = { ...this.form.value, consultorioId: this.consultorioId };
    const op$ = target
      ? this.svc.updateFinanciador(target.id!, payload)
      : this.svc.createFinanciador(payload);
    op$.subscribe({
      next: () => { this.forceClose(); this.load(); },
      error: (err) => {
        this.isSaving.set(false);
        const detail: string = err?.error?.detail ?? 'No se pudo guardar. Verificá los datos e intentá de nuevo.';
        if (err?.status === 409 && detail.toLowerCase().includes('nombre')) {
          this.nombreError.set(detail);
        } else {
          this.saveError.set(detail);
        }
      },
    });
  }

  // --- Plan modal ---
  openCreatePlan(f: FinanciadorSalud): void {
    this.planFinanciadorId.set(f.id!);
    this.editPlanTarget.set(null);
    this.planForm = this.buildPlanForm(null, f.id!);
    this.showPlanModal.set(true);
  }

  openEditPlan(p: PlanFinanciador): void {
    this.planFinanciadorId.set(p.financiadorId);
    this.editPlanTarget.set(p);
    this.planForm = this.buildPlanForm(p, p.financiadorId);
    this.showPlanModal.set(true);
  }

  closePlanModal(): void {
    if (this.planForm.dirty) {
      this.discardPlanTarget.set(true);
      return;
    }
    this.forcePlanClose();
  }

  forcePlanClose(): void {
    this.showPlanModal.set(false);
    this.discardPlanTarget.set(false);
    this.editPlanTarget.set(null);
    this.isSavingPlan.set(false);
    this.savePlanError.set(null);
    this.planNombreError.set(null);
  }

  savePlan(): void {
    if (this.planForm.invalid) return;
    this.isSavingPlan.set(true);
    this.savePlanError.set(null);
    this.planNombreError.set(null);
    const target = this.editPlanTarget();
    const op$ = target
      ? this.svc.updatePlan(target.id!, this.planForm.value)
      : this.svc.createPlan(this.planForm.value);
    op$.subscribe({
      next: () => {
        const finId = this.planFinanciadorId();
        this.forcePlanClose();
        this.svc.getPlanesByFinanciador(finId).subscribe({
          next: (data) => {
            this.planesByFin.update(m => ({ ...m, [finId]: data }));
            this.planCountByFinanciadorId.update(m => ({ ...m, [finId]: data.length }));
          },
        });
      },
      error: (err) => {
        this.isSavingPlan.set(false);
        const detail: string = err?.error?.detail ?? 'No se pudo guardar. Verificá los datos e intentá de nuevo.';
        this.savePlanError.set(detail);
      },
    });
  }

  // --- Helpers ---
  tipoLabel(tipo: TipoFinanciador): string {
    return this.formatTipo(tipo);
  }

  tipoPlanLabel(tipo: TipoPlan): string {
    return this.formatTipoPlan(tipo);
  }

  planesBadgeLabel(financiadorId?: string): string {
    const total = financiadorId ? (this.planCountByFinanciadorId()[financiadorId] ?? 0) : 0;
    return `${total} ${total === 1 ? 'plan' : 'planes'}`;
  }

  formatVigencia(desde?: string, hasta?: string): string {
    const fDesde = desde ? this.formatDate(desde) : '—';
    const fHasta = hasta ? this.formatDate(hasta) : 'Actualidad';
    return `${fDesde} → ${fHasta}`;
  }

  private formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  private buildForm(f: FinanciadorSalud | null): FormGroup {
    return this.fb.group({
      id: [f?.id ?? null],
      nombre: [f?.nombre ?? '', Validators.required],
      nombreCorto: [f?.nombreCorto ?? ''],
      tipoFinanciador: [f?.tipoFinanciador ?? TipoFinanciador.OBRA_SOCIAL, Validators.required],
      codigoExterno: [f?.codigoExterno ?? ''],
      ambitoCobertura: [f?.ambitoCobertura ?? ''],
      activo: [f?.activo ?? true],
    });
  }

  private buildPlanForm(p: PlanFinanciador | null, financiadorId: string): FormGroup {
    return this.fb.group({
      id: [p?.id ?? null],
      financiadorId: [p?.financiadorId ?? financiadorId],
      nombrePlan: [p?.nombrePlan ?? '', Validators.required],
      tipoPlan: [p?.tipoPlan ?? TipoPlan.PMO, Validators.required],
      vigenciaDesde: [p?.vigenciaDesde ?? ''],
      vigenciaHasta: [p?.vigenciaHasta ?? ''],
      requiereAutorizacionDefault: [p?.requiereAutorizacionDefault ?? false],
      activo: [p?.activo ?? true],
    });
  }

  private formatTipo(v: string): string {
    const map: Record<string, string> = {
      OBRA_SOCIAL: 'Obra Social',
      PREPAGA: 'Prepaga',
      PAMI: 'PAMI',
      ART: 'ART',
      PARTICULAR: 'Particular',
      OTRO: 'Otro',
    };
    return map[v] ?? v;
  }

  private formatTipoPlan(v: string): string {
    const map: Record<string, string> = {
      PMO: 'PMO',
      COMERCIAL: 'Comercial',
      SUPERADOR: 'Superador',
      BASICO: 'Básico',
      OTRO: 'Otro',
    };
    return map[v] ?? v;
  }

  private loadPlanesCountByFinanciador(financiadores: FinanciadorSalud[]): void {
    const ids = financiadores.map((f) => f.id).filter((id): id is string => !!id);
    if (!ids.length) {
      this.planCountByFinanciadorId.set({});
      return;
    }

    const requests = ids.map((id) =>
      this.svc.getPlanesByFinanciador(id).pipe(
        map((planes) => ({ id, count: planes.length })),
        catchError(() => of({ id, count: 0 })),
      ),
    );

    forkJoin(requests).subscribe((results) => {
      const counts = results.reduce<Record<string, number>>((acc, item) => {
        acc[item.id] = item.count;
        return acc;
      }, {});
      this.planCountByFinanciadorId.set(counts);
    });
  }
}
