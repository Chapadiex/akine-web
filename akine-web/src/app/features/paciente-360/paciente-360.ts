import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../core/error/error-mapper.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PacienteForm } from '../pacientes/components/paciente-form/paciente-form';
import { PacienteRequest } from '../pacientes/models/paciente.models';
import { PacienteService } from '../pacientes/services/paciente.service';
import { Patient360Header } from './models/paciente-360.models';
import { Paciente360Service } from './services/paciente-360.service';

interface TabDef {
  label: string;
  path: string;
  roles: string[];
}

@Component({
  selector: 'app-paciente-360',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PacienteForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (!consultorioId()) {
        <div class="state-block">
          <strong>No hay consultorio activo seleccionado.</strong>
          <p>Selecciona un consultorio desde la cabecera para cargar la vista 360 del paciente.</p>
        </div>
      } @else if (loading()) {
        <div class="state-block">
          <strong>Cargando paciente...</strong>
          <p>Estamos armando el contexto operativo del paciente.</p>
        </div>
      } @else if (error()) {
        <div class="state-block state-block-error">
          <strong>No se pudo cargar Paciente 360.</strong>
          <p>{{ error() }}</p>
          <button class="btn-secondary" type="button" (click)="reload()">Reintentar</button>
        </div>
      } @else if (header(); as current) {
        <section class="shell-card">
          <div class="top-block">
            <div class="top-row">
              <div>
                <a routerLink="/app/pacientes" class="back-link"><- Pacientes</a>
                <div class="patient-row">
                  <div class="patient-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.8" />
                      <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </div>
                  <div class="patient-copy">
                    <div class="headline-row">
                      <div class="headline-main">
                        <h1 class="title">{{ current.nombre }} {{ current.apellido }}</h1>

                        <div class="identity-strip">
                          <span class="identity-item identity-item-highlight">
                            <span class="identity-label">DNI</span>
                            <strong>{{ current.dni }}</strong>
                          </span>
                          @if (edad() !== null) {
                            <span class="identity-item">
                              <span class="identity-label">Edad</span>
                              <strong>{{ edad() }} anos</strong>
                            </span>
                          }
                        </div>
                      </div>

                      <div class="headline-chips">
                        <span class="coverage-chip" [class.coverage-chip-warning]="!current.coberturaVigente">
                          {{ coverageChipLabel() }}
                        </span>
                        <span class="status-chip" [class.status-chip-active]="current.activo">
                          {{ current.activo ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              <button class="btn-edit" type="button" (click)="onEdit()">Editar</button>
            </div>

            <section class="info-panel" [class.info-panel-open]="infoExpanded()">
              <button
                class="info-toggle"
                type="button"
                [attr.aria-expanded]="infoExpanded()"
                aria-controls="paciente-info-panel"
                (click)="toggleInfoPanel()"
              >
                <div class="info-toggle-copy">
                  <span class="info-toggle-kicker">Datos del paciente</span>
                </div>
                <div class="info-toggle-trailing">
                  <span class="info-toggle-state">{{ infoExpanded() ? 'Ocultar' : 'Ver datos' }}</span>
                  <span class="info-toggle-chevron" [class.info-toggle-chevron-open]="infoExpanded()" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                      <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                </div>
              </button>

              @if (infoExpanded()) {
                <div id="paciente-info-panel" class="info-strip">
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M5.5 4.5h3l1.6 4.3-1.9 1.9a15 15 0 0 0 5.6 5.6l1.9-1.9 4.3 1.6v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 6.5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Telefono</span>
                      <strong class="info-value">{{ current.telefono || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
                        <path d="m4.5 7 7.5 5 7.5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Email</span>
                      <strong class="info-value">{{ current.email || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
                        <path d="M8 3.5v3M16 3.5v3M7 10h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Nacimiento</span>
                      <strong class="info-value">{{ current.fechaNacimiento ? formatDate(current.fechaNacimiento) : '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.8" />
                        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Sexo</span>
                      <strong class="info-value">{{ current.sexo || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z" stroke="currentColor" stroke-width="1.8" />
                        <circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Domicilio</span>
                      <strong class="info-value">{{ current.domicilio || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.8" />
                        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Profesion</span>
                      <strong class="info-value">{{ current.profesion || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M3.5 12h17M12 3.5a15 15 0 0 1 0 17M12 3.5a15 15 0 0 0 0 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                        <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Nacionalidad</span>
                      <strong class="info-value">{{ current.nacionalidad || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M7 4.5h10a2 2 0 0 1 2 2v11l-4-2-3 2-3-2-4 2v-11a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Estado civil</span>
                      <strong class="info-value">{{ current.estadoCivil || '-' }}</strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path d="M12 21c4.4-2.7 7-6 7-10.2A4.8 4.8 0 0 0 14.2 6 5.4 5.4 0 0 0 12 6.6 5.4 5.4 0 0 0 9.8 6 4.8 4.8 0 0 0 5 10.8C5 15 7.6 18.3 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Obra social</span>
                      <strong class="info-value">
                        {{ current.obraSocialNombre || 'Sin cobertura' }}
                        @if (current.obraSocialPlan) {
                          <span> - {{ current.obraSocialPlan }}</span>
                        }
                      </strong>
                    </div>
                  </article>
                  <article class="info-item">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.8" />
                        <path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Afiliado</span>
                      <strong class="info-value">{{ current.obraSocialNroAfiliado || '-' }}</strong>
                    </div>
                  </article>
                </div>
              }
            </section>
          </div>

          <div class="card-divider"></div>

          <div class="body-block">
            @if (!current.activo) {
              <div class="inactive-alert">
                <p>La ficha del paciente esta inactiva. La consulta sigue disponible en modo lectura.</p>
              </div>
            }

            <nav class="tabs" aria-label="Navegacion principal del paciente">
              @for (tab of visibleTabs(); track tab.path) {
                <a
                  [routerLink]="[tab.path]"
                  routerLinkActive="tab-active"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="tab"
                >
                  {{ tab.label }}
                </a>
              }
            </nav>

            <section class="content-shell">
              <router-outlet />
            </section>
          </div>
        </section>

        @if (showEdit() && header(); as editable) {
          <div class="overlay" (click)="closeEdit()">
            <div class="panel" (click)="$event.stopPropagation()">
              <h3>Editar ficha del paciente</h3>
              <app-paciente-form
                [mode]="'edit'"
                [initialPaciente]="toEditableFormData(editable)"
                (saved)="saveEdit($event)"
                (cancelled)="closeEdit()"
              />
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { width: 100%; padding: 0; margin: 0; }
    .state-block {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--white);
      padding: 1rem 1.1rem;
      display: grid;
      gap: .35rem;
      box-shadow: var(--shadow-sm);
    }
    .state-block strong { color: var(--text); }
    .state-block p { margin: 0; color: var(--text-muted); }
    .state-block-error { border-color: color-mix(in srgb, var(--error) 24%, var(--border)); }
    .shell-card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: color-mix(in srgb, var(--white) 94%, var(--bg) 6%);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      width: 100%;
    }
    .top-block { padding: .9rem 1.2rem .8rem; }
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: .75rem;
    }
    .back-link {
      color: var(--text-muted);
      font-size: .8rem;
      text-decoration: none;
      display: inline-flex;
      margin-bottom: .4rem;
    }
    .back-link:hover { color: var(--primary); }
    .patient-row { display: flex; align-items: flex-start; gap: .65rem; }
    .patient-icon {
      color: var(--primary);
      display: inline-grid;
      place-items: center;
      padding-top: .18rem;
    }
    .patient-copy { display: grid; gap: .3rem; min-width: 0; }
    .headline-row {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      justify-content: space-between;
    }
    .headline-main {
      display: grid;
      gap: .45rem;
      min-width: 0;
      flex: 1 1 auto;
    }
    .title {
      margin: 0;
      font-size: clamp(1.4rem, 2.35vw, 2rem);
      line-height: 1;
      color: var(--text);
      letter-spacing: .01em;
      font-weight: 800;
    }
    .identity-strip {
      display: inline-flex;
      align-items: center;
      gap: 0;
      flex-wrap: wrap;
      min-width: 0;
      color: var(--text);
      margin-top: .04rem;
    }
    .identity-item {
      display: inline-flex;
      align-items: center;
      gap: .24rem;
      min-width: 0;
      padding: 0;
    }
    .identity-item::after {
      content: '|';
      margin: 0 .5rem;
      color: color-mix(in srgb, var(--text-muted) 55%, transparent);
    }
    .identity-item:last-child::after { content: ''; margin: 0; }
    .identity-item strong {
      color: color-mix(in srgb, var(--text) 86%, var(--primary) 14%);
      font-weight: 800;
      font-size: .76rem;
      line-height: 1;
    }
    .identity-label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .04em;
      font-size: .64rem;
      font-weight: 800;
      line-height: 1;
    }
    .headline-chips {
      display: inline-flex;
      align-items: center;
      gap: .55rem;
      flex-wrap: wrap;
      justify-content: flex-end;
      flex: 0 0 auto;
    }
    .status-chip {
      display: inline-flex;
      width: fit-content;
      border-radius: 999px;
      padding: .15rem .55rem;
      font-size: .82rem;
      font-weight: 700;
      background: color-mix(in srgb, var(--border) 55%, transparent);
      color: var(--text-muted);
      border: 1px solid var(--border);
      line-height: 1.2;
    }
    .status-chip-active {
      background: var(--success-bg);
      color: var(--success);
      border-color: var(--success-border);
    }
    .coverage-chip {
      display: inline-flex;
      border-radius: 999px;
      padding: .15rem .55rem;
      font-size: .82rem;
      font-weight: 700;
      border: 1px solid var(--border);
      color: var(--text-muted);
      background: color-mix(in srgb, var(--border) 55%, transparent);
      line-height: 1.2;
    }
    .coverage-chip-warning {
      color: color-mix(in srgb, var(--warning) 86%, var(--text));
      background: color-mix(in srgb, var(--warning) 10%, var(--white));
      border-color: color-mix(in srgb, var(--warning) 18%, var(--border));
    }
    .summary-line {
      display: flex;
      flex-wrap: wrap;
      gap: .55rem;
      color: var(--text-muted);
      font-size: .78rem;
      font-weight: 700;
    }
    .summary-line span::after {
      content: '|';
      margin-left: .55rem;
      color: color-mix(in srgb, var(--text-muted) 55%, transparent);
    }
    .summary-line span:last-child::after { content: ''; margin-left: 0; }
    .btn-edit, .btn-secondary {
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--white);
      color: var(--text);
      padding: .48rem .85rem;
      font-size: .95rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
    }
    .btn-edit:hover, .btn-secondary:hover {
      background: color-mix(in srgb, var(--border) 22%, var(--white) 78%);
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / .35);
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 7vh 1rem 1rem;
      z-index: 950;
    }
    .panel {
      width: min(920px, 96vw);
      background: var(--white);
      border-radius: 18px;
      box-shadow: var(--shadow-lg);
      padding: 1.1rem 1.15rem;
      border: 1px solid var(--border);
    }
    .panel h3 {
      margin: 0 0 1rem;
      font-size: 1.1rem;
      color: var(--text);
    }
    .info-panel {
      border: 1px solid var(--border);
      border-radius: 16px;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary) 4%, var(--white)), var(--white));
      overflow: visible;
    }
    .info-panel-open { box-shadow: var(--shadow-sm); }
    .info-toggle {
      width: 100%;
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: .58rem .82rem;
      cursor: pointer;
      text-align: left;
      color: inherit;
    }
    .info-toggle:hover .info-toggle-chevron {
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
    }
    .btn-edit:focus-visible,
    .btn-secondary:focus-visible,
    .info-toggle:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--primary) 44%, transparent);
      outline-offset: 2px;
    }
    .info-toggle-copy {
      display: grid;
      min-width: 0;
    }
    .info-toggle-kicker {
      font-size: .66rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--primary);
      font-weight: 800;
    }
    .info-toggle-trailing {
      display: inline-flex;
      align-items: center;
      gap: .55rem;
      flex: 0 0 auto;
      color: var(--text-muted);
      font-weight: 700;
      font-size: .74rem;
    }
    .info-toggle-chevron {
      display: inline-grid;
      place-items: center;
      width: 1.65rem;
      height: 1.65rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      background: var(--white);
      color: var(--primary);
      transition: transform .16s ease;
    }
    .info-toggle-chevron-open { transform: rotate(180deg); }
    .info-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      column-gap: .85rem;
      row-gap: .45rem;
      padding: 0 .82rem .75rem;
      align-items: start;
    }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: .55rem;
      min-width: 0;
    }
    .info-icon {
      color: var(--text-muted);
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
      padding-top: .08rem;
    }
    .info-label {
      display: block;
      color: var(--text-muted);
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .02em;
      text-transform: uppercase;
      margin-bottom: 0;
    }
    .info-value {
      display: block;
      color: var(--text);
      font-size: .8rem;
      font-weight: 600;
      overflow-wrap: break-word;
      word-break: normal;
      line-height: 1.3;
    }
    .card-divider { height: 1px; background: var(--border); }
    .body-block {
      padding: .75rem 1.2rem .95rem;
      display: grid;
      gap: .9rem;
    }
    .inactive-alert {
      border: 1px solid color-mix(in srgb, var(--warning) 18%, var(--border));
      background: color-mix(in srgb, var(--warning) 9%, var(--white));
      border-radius: 12px;
      padding: .7rem .8rem;
      color: var(--text);
    }
    .inactive-alert p { margin: 0; }
    .tabs {
      display: flex;
      gap: .15rem;
      flex-wrap: wrap;
      background: color-mix(in srgb, var(--border) 54%, var(--white) 46%);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: .18rem;
    }
    .tab {
      text-decoration: none;
      color: var(--text);
      font-weight: 700;
      font-size: .86rem;
      border-radius: 10px;
      border: 1px solid transparent;
      white-space: nowrap;
      position: relative;
      padding: .36rem .64rem;
    }
    .tab:hover {
      background: color-mix(in srgb, var(--border) 22%, var(--white) 78%);
      color: var(--text);
    }
    .tab-active {
      background: var(--white);
      border-color: var(--border);
      color: var(--text);
      box-shadow: var(--shadow-sm);
    }
    .tab-active::after {
      content: '';
      position: absolute;
      left: .46rem;
      right: .46rem;
      bottom: -.16rem;
      height: 2px;
      border-radius: 999px;
      background: var(--primary);
    }
    .content-shell {
      padding-top: .1rem;
    }
    @media (max-width: 900px) {
      .top-block, .body-block { padding-inline: .8rem; }
      .top-row { flex-direction: column; }
      .headline-row {
        align-items: flex-start;
        flex-direction: column;
      }
      .headline-chips { justify-content: flex-start; }
      .btn-edit { width: fit-content; align-self: flex-end; }
      .title { font-size: 1.32rem; }
      .status-chip,
      .coverage-chip { font-size: .76rem; }
      .panel { width: min(860px, 96vw); }
      .info-toggle { align-items: flex-start; flex-direction: column; }
      .info-toggle-trailing { width: 100%; justify-content: space-between; }
      .info-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .title { font-size: 1.18rem; }
      .headline-row { gap: .55rem; }
      .identity-strip { gap: 0; }
      .identity-item::after { margin: 0 .38rem; }
      .btn-edit { width: 100%; }
      .panel { width: min(100%, 96vw); padding: .95rem .9rem; }
      .summary-line { font-size: .76rem; }
      .info-strip {
        grid-template-columns: 1fr;
      }
      .info-toggle {
        padding: .54rem .72rem;
      }
      .tabs { border-radius: 14px; }
      .tab { font-size: .82rem; width: auto; text-align: left; }
      .tab-active::after { bottom: -.14rem; }
    }
    @media (max-width: 420px) {
      .shell-card { border-radius: 14px; }
      .top-block { padding: .7rem .75rem .65rem; }
      .body-block { padding: .65rem .75rem .8rem; gap: .7rem; }
      .top-row { gap: .7rem; margin-bottom: .55rem; }
      .back-link { font-size: .74rem; margin-bottom: .3rem; }
      .patient-row { gap: .5rem; }
      .patient-icon svg { width: 24px; height: 24px; }
      .patient-copy { gap: .2rem; }
      .title {
        font-size: 1.02rem;
        line-height: 1.08;
      }
      .headline-row { gap: .42rem; }
      .headline-main { gap: .3rem; }
      .headline-chips { gap: .4rem; }
      .identity-item strong { font-size: .72rem; }
      .identity-label { font-size: .58rem; }
      .status-chip,
      .coverage-chip {
        padding: .14rem .45rem;
        font-size: .7rem;
      }
      .btn-edit,
      .btn-secondary {
        padding: .42rem .68rem;
        font-size: .84rem;
        border-radius: 8px;
      }
      .info-panel { border-radius: 14px; }
      .info-toggle {
        gap: .55rem;
        padding: .48rem .6rem;
      }
      .info-toggle-kicker { font-size: .6rem; }
      .info-toggle-trailing { font-size: .68rem; }
      .info-toggle-chevron {
        width: 1.45rem;
        height: 1.45rem;
      }
      .info-strip {
        padding: 0 .6rem .65rem;
        row-gap: .38rem;
      }
      .info-item { gap: .42rem; }
      .info-icon svg { width: 16px; height: 16px; }
      .info-label { font-size: .62rem; }
      .info-value { font-size: .74rem; }
      .inactive-alert {
        border-radius: 10px;
        padding: .58rem .65rem;
        font-size: .84rem;
      }
      .tabs {
        gap: .12rem;
        padding: .14rem;
        border-radius: 12px;
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .tabs::-webkit-scrollbar { display: none; }
      .tab {
        flex: 0 0 auto;
        font-size: .76rem;
        padding: .32rem .56rem;
      }
      .content-shell { padding-top: 0; }
    }
    @media (max-width: 360px) {
      .top-block { padding-inline: .65rem; }
      .body-block { padding-inline: .65rem; }
      .title { font-size: .96rem; }
      .identity-item::after { margin: 0 .28rem; }
      .status-chip,
      .coverage-chip { font-size: .66rem; }
      .btn-edit { font-size: .8rem; }
      .tab {
        font-size: .72rem;
        padding-inline: .5rem;
      }
    }
  `],
})
export class Paciente360 {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly consultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly patientId = signal(this.route.snapshot.paramMap.get('patientId') ?? '');
  readonly header = signal<Patient360Header | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly infoExpanded = signal(false);
  readonly showEdit = signal(false);

  readonly tabs: TabDef[] = [
    { label: 'Resumen', path: 'resumen', roles: [] },
    { label: 'Historia Clinica', path: 'historia-clinica', roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
    { label: 'Diagnosticos', path: 'diagnosticos', roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
    { label: 'Atenciones', path: 'atenciones', roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
    { label: 'Turnos', path: 'turnos', roles: [] },
    { label: 'Obra Social', path: 'obra-social', roles: [] },
    { label: 'Pagos', path: 'pagos', roles: ['ADMIN'] },
  ];

  readonly visibleTabs = computed(() =>
    this.tabs.filter((tab) => tab.roles.length === 0 || this.auth.hasAnyRole(...tab.roles)),
  );

  readonly edad = computed(() => {
    const fecha = this.header()?.fechaNacimiento;
    if (!fecha) return null;
    const birth = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  });

  readonly coverageChipLabel = computed(() => {
    const current = this.header();
    if (!current) return 'Sin cobertura';
    return current.coberturaVigente ? 'Cobertura activa' : 'Sin cobertura';
  });

  constructor() {
    effect(() => {
      const consultorioId = this.consultorioId();
      const patientId = this.patientId();
      if (!consultorioId || !patientId) {
        this.loading.set(false);
        this.header.set(null);
        return;
      }
      this.loadHeader(consultorioId, patientId);
    });
  }

  toggleInfoPanel(): void {
    this.infoExpanded.update((value) => !value);
  }

  reload(): void {
    const consultorioId = this.consultorioId();
    const patientId = this.patientId();
    if (!consultorioId || !patientId) return;
    this.loadHeader(consultorioId, patientId);
  }

  onEdit(): void {
    this.showEdit.set(true);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  private loadHeader(consultorioId: string, patientId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getHeader(consultorioId, patientId).subscribe({
      next: (header) => {
        this.header.set(header);
        this.loading.set(false);
      },
      error: (err) => void this.handleHeaderLoadError(err, consultorioId, patientId),
    });
  }

  private async handleHeaderLoadError(err: unknown, consultorioId: string, patientId: string): Promise<void> {
    const recovered = await this.tryRecoverHeaderWithAnotherConsultorio(consultorioId, patientId);
    if (recovered) {
      this.header.set(recovered.header);
      this.loading.set(false);
      this.error.set(null);
      if (this.consultorioId() !== recovered.consultorioId) {
        this.consultorioCtx.setSelectedConsultorioId(recovered.consultorioId);
      }
      return;
    }

    this.error.set(this.errMap.toMessage(err));
    this.loading.set(false);
  }

  private async tryRecoverHeaderWithAnotherConsultorio(
    failedConsultorioId: string,
    patientId: string,
  ): Promise<{ consultorioId: string; header: Patient360Header } | null> {
    const candidates = this.consultorioCtx
      .consultorios()
      .map((consultorio) => consultorio.id)
      .filter((id) => !!id && id !== failedConsultorioId);

    for (const consultorioId of candidates) {
      try {
        const header = await firstValueFrom(this.svc.getHeader(consultorioId, patientId));
        return { consultorioId, header };
      } catch {
        // Si el paciente no pertenece a este consultorio, seguimos con el siguiente.
      }
    }

    return null;
  }

  closeEdit(): void {
    this.showEdit.set(false);
  }

  saveEdit(payload: PacienteRequest): void {
    const consultorioId = this.consultorioId();
    const patientId = this.patientId();
    if (!consultorioId || !patientId) {
      return;
    }

    this.pacienteSvc.updateAdmin(patientId, consultorioId, {
      nombre: payload.nombre,
      apellido: payload.apellido,
      telefono: payload.telefono,
      email: payload.email,
      fechaNacimiento: payload.fechaNacimiento,
      sexo: payload.sexo,
      domicilio: payload.domicilio,
      nacionalidad: payload.nacionalidad,
      estadoCivil: payload.estadoCivil,
      profesion: payload.profesion,
      obraSocialNombre: payload.obraSocialNombre,
      obraSocialPlan: payload.obraSocialPlan,
      obraSocialNroAfiliado: payload.obraSocialNroAfiliado,
    }).subscribe({
      next: () => {
        this.toast.success('Ficha del paciente actualizada');
        this.showEdit.set(false);
        this.loadHeader(consultorioId, patientId);
      },
      error: (err) => this.toast.error(this.getPatientUpdateErrorMessage(err)),
    });
  }

  toEditableFormData(current: Patient360Header): Partial<PacienteRequest> {
    return {
      dni: current.dni,
      nombre: current.nombre,
      apellido: current.apellido,
      telefono: current.telefono ?? '',
      email: current.email ?? '',
      fechaNacimiento: current.fechaNacimiento ?? '',
      sexo: current.sexo ?? '',
      domicilio: current.domicilio ?? '',
      nacionalidad: current.nacionalidad ?? '',
      estadoCivil: current.estadoCivil ?? '',
      profesion: current.profesion ?? '',
      obraSocialNombre: current.obraSocialNombre ?? '',
      obraSocialPlan: current.obraSocialPlan ?? '',
      obraSocialNroAfiliado: current.obraSocialNroAfiliado ?? '',
    };
  }

  private getPatientUpdateErrorMessage(err: unknown): string {
    const status = (err as { status?: number } | null)?.status;
    if (status === 404 || status === 405) {
      return 'El backend activo todavia no soporta editar pacientes. Reinicia o actualiza akine-api para habilitar el endpoint de guardado.';
    }
    return this.errMap.toMessage(err);
  }
}
