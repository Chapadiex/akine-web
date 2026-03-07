import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../core/error/error-mapper.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
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
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
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
                      <h1 class="title">{{ current.nombre }} {{ current.apellido }}</h1>

                      <div class="identity-strip">
                        <span class="identity-item">
                          <span class="identity-label">DNI</span>
                          <strong>{{ current.dni }}</strong>
                        </span>
                        @if (current.telefono) {
                          <span class="identity-item">
                            <strong>{{ current.telefono }}</strong>
                          </span>
                        }
                        @if (current.email) {
                          <span class="identity-item identity-item-email">
                            <strong>{{ current.email }}</strong>
                          </span>
                        }
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

                    <div class="summary-line">
                      @if (edad() !== null) {
                        <span>{{ edad() }} anos</span>
                      }
                      @if (current.fechaNacimiento) {
                        <span>Nacimiento {{ formatDate(current.fechaNacimiento) }}</span>
                      }
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
                    <span class="info-label">Telefono</span>
                    <strong class="info-value">{{ current.telefono || '-' }}</strong>
                  </article>
                  <article class="info-item">
                    <span class="info-label">Email</span>
                    <strong class="info-value">{{ current.email || '-' }}</strong>
                  </article>
                  <article class="info-item info-item-wide">
                    <span class="info-label">Domicilio</span>
                    <strong class="info-value">{{ current.domicilio || '-' }}</strong>
                  </article>
                  <article class="info-item">
                    <span class="info-label">Profesion</span>
                    <strong class="info-value">{{ current.profesion || '-' }}</strong>
                  </article>
                  <article class="info-item info-item-wide">
                    <span class="info-label">Obra social</span>
                    <strong class="info-value">
                      {{ current.obraSocialNombre || 'Sin cobertura' }}
                      @if (current.obraSocialPlan) {
                        <span> - {{ current.obraSocialPlan }}</span>
                      }
                    </strong>
                  </article>
                  <article class="info-item">
                    <span class="info-label">Afiliado</span>
                    <strong class="info-value">{{ current.obraSocialNroAfiliado || '-' }}</strong>
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
      align-items: center;
      gap: .75rem;
      flex-wrap: wrap;
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
      gap: .55rem;
      flex-wrap: wrap;
      min-width: 0;
      color: var(--text-muted);
      font-size: .82rem;
      font-weight: 700;
    }
    .identity-item {
      display: inline-flex;
      align-items: center;
      gap: .28rem;
      min-width: 0;
    }
    .identity-item::after {
      content: '|';
      margin-left: .28rem;
      color: color-mix(in srgb, var(--text-muted) 45%, transparent);
    }
    .identity-item:last-child::after { content: ''; margin-left: 0; }
    .identity-item strong {
      color: color-mix(in srgb, var(--text) 78%, var(--primary) 22%);
      font-weight: 800;
    }
    .identity-label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .04em;
      font-size: .72rem;
      font-weight: 800;
    }
    .identity-item-email {
      max-width: min(28rem, 100%);
    }
    .identity-item-email strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;
      max-width: 100%;
    }
    .headline-chips {
      display: inline-flex;
      align-items: center;
      gap: .55rem;
      flex-wrap: wrap;
      margin-left: auto;
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
      font-size: .82rem;
      font-weight: 600;
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
      grid-template-columns: repeat(4, minmax(140px, 1fr));
      grid-template-areas:
        "phone email domicilio domicilio"
        "profesion obra-social afiliado afiliado";
      column-gap: .85rem;
      row-gap: .45rem;
      padding: 0 .82rem .75rem;
      align-items: start;
    }
    .info-item {
      display: grid;
      gap: .08rem;
      min-width: 0;
    }
    .info-item:nth-child(1) { grid-area: phone; }
    .info-item:nth-child(2) { grid-area: email; }
    .info-item:nth-child(3) { grid-area: domicilio; }
    .info-item:nth-child(4) { grid-area: profesion; }
    .info-item:nth-child(5) { grid-area: obra-social; }
    .info-item:nth-child(6) { grid-area: afiliado; }
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
      .headline-row { align-items: flex-start; }
      .headline-chips { margin-left: 0; }
      .btn-edit { width: fit-content; align-self: flex-end; }
      .title { font-size: 1.32rem; }
      .status-chip,
      .coverage-chip { font-size: .76rem; }
      .info-toggle { align-items: flex-start; flex-direction: column; }
      .info-toggle-trailing { width: 100%; justify-content: space-between; }
      .info-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-areas:
          "phone email"
          "domicilio domicilio"
          "profesion obra-social"
          "afiliado afiliado";
      }
    }
    @media (max-width: 640px) {
      .title { font-size: 1.18rem; }
      .headline-row { gap: .55rem; }
      .identity-strip { gap: .4rem; font-size: .76rem; }
      .identity-item::after { margin-left: .2rem; }
      .btn-edit { width: 100%; }
      .summary-line { font-size: .76rem; }
      .info-strip {
        grid-template-columns: 1fr;
        grid-template-areas:
          "phone"
          "email"
          "domicilio"
          "profesion"
          "obra-social"
          "afiliado";
      }
      .info-toggle {
        padding: .54rem .72rem;
      }
      .tabs { border-radius: 14px; }
      .tab { font-size: .82rem; width: auto; text-align: left; }
      .tab-active::after { bottom: -.14rem; }
    }
  `],
})
export class Paciente360 {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly consultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly patientId = signal(this.route.snapshot.paramMap.get('patientId') ?? '');
  readonly header = signal<Patient360Header | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly infoExpanded = signal(false);

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
    this.toast.info('La edicion de ficha del paciente quedo pendiente para una siguiente iteracion.');
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
      error: (err) => {
        this.error.set(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }
}
