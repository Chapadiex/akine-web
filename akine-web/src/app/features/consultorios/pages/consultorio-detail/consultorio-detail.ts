import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioForm } from '../../components/consultorio-form/consultorio-form';
import { Consultorio, ConsultorioRequest } from '../../models/consultorio.models';
import { ConsultorioService } from '../../services/consultorio.service';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
}

@Component({
  selector: 'app-consultorio-detail',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConsultorioForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page" (click)="closeMapPopover()">
      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (consultorio(); as current) {
        <section class="shell-card">
          <div class="top-block">
            <div class="top-row">
              <div>
                <a routerLink="/app/consultorios" class="back-link"><- Consultorios</a>
                <div class="clinic-row">
                  <div class="clinic-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                      <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" stroke-width="1.8" />
                      <path d="M10 7h4M10 11h4M10 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      <path d="M4 21h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </div>
                  <div class="clinic-copy">
                    <div class="title-row">
                      <h1 class="title">{{ current.name }}</h1>
                      <span class="status-chip" [class.status-chip-active]="current.status === 'ACTIVE'">
                        {{ current.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              @if (canEdit()) {
                <button class="btn-edit" (click)="showForm.set(true)">Editar</button>
              }
            </div>

            <section class="info-panel" [class.info-panel-open]="infoExpanded()">
              <button
                class="info-toggle"
                type="button"
                [attr.aria-expanded]="infoExpanded()"
                aria-controls="consultorio-info-panel"
                (click)="toggleInfoPanel()"
              >
                <div class="info-toggle-copy">
                  <span class="info-toggle-kicker">Datos del consultorio</span>
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
                <div id="consultorio-info-panel" class="info-strip">
                  <article class="info-item info-item-phone">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                        <path d="M5.5 4.5h3l1.6 4.3-1.9 1.9a15 15 0 0 0 5.6 5.6l1.9-1.9 4.3 1.6v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 6.5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Telefono</span>
                      <strong class="info-value">{{ current.phone || '-' }}</strong>
                    </div>
                  </article>

                  <article class="info-item info-item-email">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
                        <path d="m4.5 7 7.5 5 7.5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">Email</span>
                      <strong class="info-value">{{ current.email || '-' }}</strong>
                    </div>
                  </article>

                  <article class="info-item info-item-cuit">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                        <rect x="3.8" y="6" width="16.4" height="12" rx="2" stroke="currentColor" stroke-width="1.8" />
                        <path d="M7 10h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </div>
                    <div>
                      <span class="info-label">CUIT</span>
                      <strong class="info-value">{{ current.cuit || '-' }}</strong>
                    </div>
                  </article>

                  <article class="info-item info-item-address">
                    <div class="info-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                        <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z" stroke="currentColor" stroke-width="1.8" />
                        <circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8" />
                      </svg>
                    </div>
                    <div class="address-content">
                      <span class="info-label">Direccion</span>
                      <div class="address-row">
                        <strong class="info-value">{{ current.address || '-' }}</strong>
                        <button
                          class="btn-map"
                          type="button"
                          title="Ver mapa"
                          aria-label="Ver mapa del consultorio"
                          (click)="onMapButtonClick($event)"
                        >
                          <span class="btn-map-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                              <path d="M12 20s6-4.6 6-9.7a6 6 0 1 0-12 0C6 15.4 12 20 12 20Z" stroke="currentColor" stroke-width="1.8" />
                              <circle cx="12" cy="10.2" r="2.1" stroke="currentColor" stroke-width="1.8" />
                            </svg>
                          </span>
                          <span>{{ hasCoordinates() ? 'Ver mapa' : 'Buscar mapa' }}</span>
                        </button>
                      </div>

                      @if (showMapPopover()) {
                        <div class="map-popover" role="dialog" aria-label="Vista previa del mapa" (click)="$event.stopPropagation()">
                          <div class="map-popover-head">
                            <strong>Mapa del local</strong>
                            <button type="button" class="map-close" (click)="closeMapPopover()">Cerrar</button>
                          </div>

                          @if (mapEmbedUrl()) {
                            <iframe
                              class="map-frame"
                              [src]="mapEmbedUrl()"
                              loading="lazy"
                              referrerpolicy="no-referrer-when-downgrade"
                              title="Mapa del consultorio"
                            ></iframe>
                          } @else {
                            <p class="map-empty">No hay coordenadas cargadas para mostrar la vista previa.</p>
                          }

                          <div class="map-actions">
                            <button type="button" class="btn-map-open" (click)="openGoogleMaps($event)">
                              Abrir en Google Maps
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  </article>
                </div>
              }
            </section>
          </div>

          <div class="card-divider"></div>

          <div class="body-block">
            @if (current.status !== 'ACTIVE') {
              <div class="inactive-alert">
                <p>Este consultorio esta inactivo. No se puede operar ni editar hasta reactivarlo.</p>
                @if (isAdmin()) {
                  <button class="btn-reactivate" (click)="reactivate()">Reactivar consultorio</button>
                }
              </div>
            } @else {
              <nav class="tabs" aria-label="Navegacion principal del consultorio">
                @for (tab of mainTabs; track tab.path) {
                  <a
                    [routerLink]="[tab.path]"
                    routerLinkActive="tab-active"
                    [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
                    class="tab"
                  >
                    {{ tab.label }}
                  </a>
                }
              </nav>

              @if (isAgendaSection()) {
                <nav class="sub-tabs" aria-label="Secciones de agenda">
                  @for (tab of agendaTabs; track tab.path) {
                    <a class="sub-tab" [routerLink]="[tab.path]" routerLinkActive="sub-tab-active">{{ tab.label }}</a>
                  }
                </nav>
              }

              @if (isConfigurationSection()) {
                <nav class="sub-tabs" aria-label="Secciones de configuracion">
                  @for (tab of configurationTabs; track tab.path) {
                    <a class="sub-tab" [routerLink]="[tab.path]" routerLinkActive="sub-tab-active">{{ tab.label }}</a>
                  }
                </nav>
              }

              <section class="content-shell">
                <router-outlet />
              </section>
            }
          </div>
        </section>
      }
    </div>

    @if (showForm() && consultorio()) {
      <app-consultorio-form
        [editItem]="consultorio()"
        (saved)="onSaved($event)"
        (cancelled)="showForm.set(false)"
      />
    }
  `,
  styles: [`
    .page {
      width: 100%;
      padding: 0;
      margin: 0;
    }

    .loading-msg {
      color: var(--text-muted);
      text-align: center;
      margin-top: 3rem;
    }

    .shell-card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: color-mix(in srgb, var(--white) 94%, var(--bg) 6%);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      width: 100%;
    }

    .top-block {
      padding: .9rem 1.2rem .8rem;
    }

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

    .clinic-row {
      display: flex;
      align-items: flex-start;
      gap: .65rem;
    }

    .clinic-icon {
      color: var(--primary);
      display: inline-grid;
      place-items: center;
      padding-top: .18rem;
    }

    .clinic-copy { display: grid; gap: .3rem; min-width: 0; }

    .title-row {
      display: flex;
      align-items: center;
      gap: .75rem;
      flex-wrap: wrap;
    }

    .title {
      margin: 0;
      font-size: clamp(1.4rem, 2.35vw, 2rem);
      line-height: 1;
      letter-spacing: .01em;
      text-transform: uppercase;
      color: var(--text);
      font-weight: 800;
    }

    .status-chip {
      display: inline-flex;
      width: fit-content;
      padding: .15rem .55rem;
      border-radius: 999px;
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

    .btn-edit {
      padding: .48rem .85rem;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--white);
      color: var(--text);
      cursor: pointer;
      font-size: .95rem;
      font-weight: 600;
      flex-shrink: 0;
      box-shadow: var(--shadow-sm);
    }

    .btn-edit:hover {
      background: color-mix(in srgb, var(--border) 22%, var(--white) 78%);
    }

    .info-panel {
      border: 1px solid var(--border);
      border-radius: 16px;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--primary) 4%, var(--white)), var(--white));
      overflow: visible;
    }

    .info-panel-open {
      box-shadow: var(--shadow-sm);
    }

    .info-toggle {
      width: 100%;
      border: 0;
      background: transparent;
      padding: .9rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
      text-align: left;
      color: inherit;
    }

    .info-toggle:hover .info-toggle-chevron {
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
    }

    .info-toggle:focus-visible,
    .btn-map:focus-visible,
    .map-close:focus-visible,
    .btn-map-open:focus-visible,
    .btn-edit:focus-visible,
    .btn-reactivate:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--primary) 44%, transparent);
      outline-offset: 2px;
    }

    .info-toggle-copy {
      display: grid;
      min-width: 0;
    }

    .info-toggle-kicker {
      font-size: .72rem;
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
    }

    .info-toggle-state {
      font-size: .82rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .info-toggle-chevron {
      display: inline-grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      background: var(--white);
      color: var(--primary);
      transition: transform .18s ease;
    }

    .info-toggle-chevron-open {
      transform: rotate(180deg);
    }

    .info-strip {
      display: grid;
      grid-template-columns: minmax(180px, .9fr) minmax(220px, 1fr) minmax(360px, 2fr);
      grid-template-areas:
        "phone email address"
        "cuit . address";
      column-gap: 1.1rem;
      row-gap: .95rem;
      padding: 0 1rem 1rem;
      align-items: start;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: .65rem;
      min-width: 0;
    }

    .info-item-phone {
      grid-area: phone;
    }

    .info-item-email {
      grid-area: email;
    }

    .info-item-cuit {
      grid-area: cuit;
    }

    .info-item-address {
      grid-area: address;
      position: relative;
    }

    .address-content {
      min-width: 0;
      width: 100%;
    }

    .address-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: flex-start;
      gap: 1rem;
      min-width: 0;
    }

    .info-icon {
      color: var(--text-muted);
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
    }

    .info-label {
      display: block;
      font-size: .77rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .02em;
      margin-bottom: .08rem;
    }

    .info-value {
      display: block;
      font-size: .9rem;
      color: var(--text);
      font-weight: 600;
      overflow-wrap: break-word;
      word-break: normal;
    }

    .btn-map {
      border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
      color: color-mix(in srgb, var(--primary) 88%, var(--text) 12%);
      border-radius: 999px;
      font-size: .83rem;
      font-weight: 700;
      padding: .42rem .8rem;
      cursor: pointer;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: .38rem;
      white-space: nowrap;
      box-shadow: 0 10px 22px -18px color-mix(in srgb, var(--primary) 45%, transparent);
    }

    .btn-map:hover {
      background: color-mix(in srgb, var(--primary) 16%, var(--white));
      border-color: color-mix(in srgb, var(--primary) 48%, var(--border));
    }

    .btn-map-icon {
      display: inline-grid;
      place-items: center;
    }

    .map-popover {
      position: absolute;
      z-index: 20;
      left: 0;
      top: calc(100% + .55rem);
      width: min(380px, 90vw);
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--white);
      box-shadow: var(--shadow-lg);
      padding: .65rem;
    }

    .map-popover-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: .45rem;
      gap: .5rem;
    }

    .map-popover-head strong {
      font-size: .9rem;
      color: var(--text);
    }

    .map-close {
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text-muted);
      border-radius: 8px;
      font-size: .75rem;
      font-weight: 700;
      padding: .2rem .45rem;
      cursor: pointer;
    }

    .map-close:hover {
      background: var(--bg);
      color: var(--text);
    }

    .map-frame {
      width: 100%;
      height: 210px;
      border: 0;
      border-radius: 10px;
      display: block;
    }

    .map-empty {
      margin: 0;
      color: var(--text-muted);
      font-size: .85rem;
      padding: .35rem 0 .15rem;
    }

    .map-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: .55rem;
    }

    .btn-map-open {
      border: 1px solid var(--primary);
      background: var(--white);
      color: var(--primary);
      border-radius: 9px;
      font-size: .8rem;
      font-weight: 700;
      padding: .3rem .65rem;
      cursor: pointer;
    }

    .btn-map-open:hover {
      background: var(--bg);
    }

    .card-divider {
      border-top: 1px solid var(--border);
    }

    .body-block {
      padding: .75rem 1.2rem .95rem;
    }

    .tabs {
      display: flex;
      gap: .15rem;
      flex-wrap: wrap;
      background: color-mix(in srgb, var(--border) 54%, var(--white) 46%);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: .18rem;
      margin-bottom: .3rem;
    }

    .tab {
      padding: .36rem .64rem;
      text-decoration: none;
      color: var(--text);
      font-weight: 700;
      font-size: .86rem;
      border-radius: 10px;
      border: 1px solid transparent;
      white-space: nowrap;
      position: relative;
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

    .sub-tabs {
      display: flex;
      gap: .35rem;
      padding: .1rem 0 .5rem;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .sub-tab {
      white-space: nowrap;
      text-decoration: none;
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--text-muted);
      background: var(--white);
      padding: .28rem .58rem;
      font-size: .75rem;
      font-weight: 700;
      transition: background .15s ease, border-color .15s ease, color .15s ease;
    }

    .sub-tab:hover {
      color: var(--text);
      background: color-mix(in srgb, var(--border) 20%, var(--white));
    }

    .sub-tab-active {
      color: var(--primary);
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      background: color-mix(in srgb, var(--primary) 12%, var(--white));
    }

    .content-shell {
      padding-top: .1rem;
    }

    .inactive-alert {
      border: 1px solid var(--border);
      background: var(--bg);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .inactive-alert p { margin: 0; color: var(--text); }

    .btn-reactivate {
      padding: .5rem .9rem;
      border: 1px solid var(--primary);
      background: var(--white);
      color: var(--primary);
      border-radius: var(--radius);
      cursor: pointer;
      white-space: nowrap;
      font-weight: 700;
    }

    .btn-reactivate:hover { background: var(--bg); }

    @media (max-width: 1180px) {
      .info-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-areas:
          "phone email"
          "cuit cuit"
          "address address";
      }
    }

    @media (max-width: 760px) {
      .top-block,
      .body-block { padding: .8rem; }

      .top-row {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-edit {
        width: fit-content;
        align-self: flex-end;
      }

      .clinic-icon {
        padding-top: .08rem;
      }

      .title-row { gap: .55rem; }
      .title { font-size: 1.32rem; }
      .status-chip { font-size: .76rem; }

      .info-toggle {
        align-items: flex-start;
        flex-direction: column;
      }

      .info-toggle-trailing {
        width: 100%;
        justify-content: space-between;
      }

      .info-strip {
        grid-template-columns: 1fr;
        grid-template-areas:
          "phone"
          "email"
          "cuit"
          "address";
      }
      .address-row {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-map {
        width: fit-content;
      }

      .map-popover { width: min(100%, 95vw); }
      .tabs { border-radius: 14px; }
      .tab { font-size: .82rem; }
      .tab-active::after { bottom: -.14rem; }
    }
  `],
})
export class ConsultorioDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(ConsultorioService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly consultorio = signal<Consultorio | null>(null);
  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly infoExpanded = signal(false);
  readonly showMapPopover = signal(false);

  readonly mainTabs: NavItem[] = [
    { label: 'Resumen', path: 'resumen', exact: true },
    { label: 'Boxes', path: 'boxes', exact: true },
    { label: 'Profesionales', path: 'profesionales', exact: true },
    { label: 'Agenda', path: 'agenda', exact: false },
    { label: 'Configuracion', path: 'configuracion', exact: false },
  ];

  readonly agendaTabs: NavItem[] = [
    { label: 'Horarios de atencion', path: 'agenda/horarios-atencion' },
    { label: 'Cobertura profesional', path: 'agenda/cobertura-profesionales' },
    { label: 'Intervalo de turnos', path: 'agenda/intervalo-turnos' },
    { label: 'Feriados y cierres', path: 'agenda/feriados-cierres' },
  ];

  readonly configurationTabs: NavItem[] = [
    { label: 'Especialidades', path: 'configuracion/especialidades' },
    { label: 'Cargos del personal', path: 'configuracion/cargos-personal' },
    { label: 'Plantillas de antecedentes', path: 'configuracion/plantillas-antecedentes' },
    { label: 'Diagnosticos medicos', path: 'configuracion/diagnosticos-medicos' },
    { label: 'Tratamientos', path: 'configuracion/tratamientos' },
  ];

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly canEdit = computed(() =>
    !!this.consultorio() &&
    this.consultorio()!.status === 'ACTIVE' &&
    this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'),
  );
  readonly hasCoordinates = computed(
    () => this.consultorio()?.mapLatitude != null && this.consultorio()?.mapLongitude != null,
  );

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isAgendaSection = computed(() => this.currentUrl().includes('/agenda'));
  readonly isConfigurationSection = computed(() => this.currentUrl().includes('/configuracion'));

  readonly mapEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const current = this.consultorio();
    if (!current || current.mapLatitude == null || current.mapLongitude == null) return null;
    const src = `https://www.google.com/maps?q=${current.mapLatitude},${current.mapLongitude}&z=16&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getById(id).subscribe({
      next: (c) => {
        this.consultorio.set(c);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 409 && !this.auth.hasRole('ADMIN')) {
          this.toast.error('El consultorio esta inactivo y no puede usarse.');
          void this.router.navigate(['/app/consultorios']);
          return;
        }
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  onSaved(req: ConsultorioRequest): void {
    const current = this.consultorio();
    if (!current || current.status !== 'ACTIVE') {
      this.toast.error('No se puede editar un consultorio inactivo.');
      return;
    }

    this.svc.update(current.id, req).subscribe({
      next: (updated) => {
        this.consultorio.set(updated);
        this.showMapPopover.set(false);
        this.showForm.set(false);
        this.toast.success('Consultorio actualizado');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  onMapButtonClick(event: Event): void {
    event.stopPropagation();
    if (!this.hasCoordinates()) {
      this.openGoogleMaps(event);
      return;
    }
    this.infoExpanded.set(true);
    this.showMapPopover.update((open) => !open);
  }

  toggleInfoPanel(): void {
    this.infoExpanded.update((open) => {
      const next = !open;
      if (!next) this.showMapPopover.set(false);
      return next;
    });
  }

  closeMapPopover(): void {
    if (!this.showMapPopover()) return;
    this.showMapPopover.set(false);
  }

  openGoogleMaps(event?: Event): void {
    event?.stopPropagation();
    const url = this.resolveGoogleMapsUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  reactivate(): void {
    const current = this.consultorio();
    if (!current || !this.auth.hasRole('ADMIN')) return;

    this.svc.activate(current.id).subscribe({
      next: (updated) => {
        this.consultorio.set(updated);
        this.toast.success('Consultorio reactivado');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private resolveGoogleMapsUrl(): string {
    const current = this.consultorio();
    if (!current) return 'https://www.google.com/maps';

    const explicitUrl = current.googleMapsUrl?.trim();
    if (explicitUrl) return explicitUrl;

    if (current.mapLatitude != null && current.mapLongitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${current.mapLatitude},${current.mapLongitude}`;
    }

    const query = current.address?.trim() || current.name?.trim() || 'consultorio';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
}
