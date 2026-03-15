import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioCompleteness } from '../../models/consultorio-completeness.models';
import { Consultorio } from '../../models/consultorio.models';
import { ConsultorioCompletenessRefreshService } from '../../services/consultorio-completeness-refresh.service';
import { ConsultorioCompletenessService } from '../../services/consultorio-completeness.service';
import { ConsultorioService } from '../../services/consultorio.service';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
}

interface HeaderFact {
  label: string;
  value: string;
}

interface HeaderStatusIcon {
  tone: 'success' | 'warning' | 'neutral';
  symbol: string;
  label: string;
}

@Component({
  selector: 'app-consultorio-detail',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (consultorio(); as current) {
        <section class="shell-card">
          <header class="header">
            <div class="header-main">
              <a routerLink="/app/consultorios" class="back-link"><- Consultorios</a>
              <div class="title-row">
                <h1>{{ current.name }}</h1>
                @if (headerStatusIcon(); as headerIcon) {
                  <span
                    class="header-status-icon"
                    [class.header-status-icon-success]="headerIcon.tone === 'success'"
                    [class.header-status-icon-warning]="headerIcon.tone === 'warning'"
                    [class.header-status-icon-neutral]="headerIcon.tone === 'neutral'"
                    [attr.aria-label]="headerIcon.label"
                    [attr.title]="headerIcon.label"
                  >
                    {{ headerIcon.symbol }}
                  </span>
                }
                <span class="status-chip" [class.status-chip-active]="current.status === 'ACTIVE'">
                  {{ current.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                </span>
                @if (completeness(); as summary) {
                  @for (layer of summary.layers; track layer.key) {
                    <span
                      class="layer-chip"
                      [class.layer-chip-done]="layer.isComplete"
                      [attr.title]="layer.isComplete ? layer.helperText : layer.missingItems.join(', ')"
                    >
                      {{ layer.label }}
                    </span>
                  }
                }
              </div>
            </div>

            @if (canEdit()) {
              <a class="btn-edit" [routerLink]="['/app/consultorios', current.id, 'editar']">Editar</a>
            }
          </header>

          @if (headerFacts().length > 0 || canOpenMap()) {
            <section class="header-summary">
              <div class="facts-row">
                @for (fact of headerFacts(); track fact.label) {
                  <article class="fact-chip">
                    <span>{{ fact.label }}</span>
                    <strong>{{ fact.value }}</strong>
                  </article>
                }
              </div>

              @if (canOpenMap()) {
                <button type="button" class="btn-map" (click)="openGoogleMaps()">Ver / Buscar en mapa</button>
              }
            </section>
          }

          <div class="card-divider"></div>

          <div class="body-block">
            @if (current.status !== 'ACTIVE') {
              <div class="inactive-alert">
                <p>Este consultorio esta inactivo. No se puede operar hasta reactivarlo.</p>
                @if (isAdmin()) {
                  <button class="btn-reactivate" type="button" (click)="reactivate()">Reactivar consultorio</button>
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
  `,
  styles: [`
    .page { width: 100%; }
    .loading-msg { text-align: center; color: var(--text-muted); margin-top: 3rem; }
    .shell-card {
      border: 1px solid var(--border);
      border-radius: 20px;
      background: color-mix(in srgb, var(--white) 95%, var(--bg) 5%);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.2rem .7rem;
    }
    .header-main { display: grid; gap: .35rem; }
    .header h1 { margin: 0; font-size: clamp(1.6rem, 2.5vw, 2.2rem); line-height: 1.1; }
    .back-link { color: var(--text-muted); text-decoration: none; font-size: .82rem; }
    .title-row,
    .facts-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .45rem;
    }
    .header-status-icon {
      width: 1.7rem;
      height: 1.7rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--white);
      color: var(--text-muted);
      font-size: .82rem;
      font-weight: 600;
      flex: 0 0 auto;
    }
    .header-status-icon-success {
      background: var(--success-bg);
      border-color: var(--success-border);
      color: var(--success);
    }
    .header-status-icon-warning {
      background: color-mix(in srgb, #f59e0b 16%, var(--white));
      border-color: color-mix(in srgb, #f59e0b 34%, var(--border));
      color: #b45309;
    }
    .header-status-icon-neutral {
      background: color-mix(in srgb, var(--bg) 72%, var(--white));
      border-color: var(--border);
      color: var(--text-muted);
    }
    .status-chip,
    .layer-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: .25rem .62rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      font-size: .74rem;
      font-weight: 500;
      letter-spacing: .01em;
      background: color-mix(in srgb, var(--white) 70%, var(--bg) 30%);
      color: var(--text-muted);
    }
    .status-chip-active,
    .layer-chip-done {
      background: var(--success-bg);
      border-color: var(--success-border);
      color: var(--success);
    }
    .btn-edit,
    .btn-map,
    .btn-reactivate {
      padding: .62rem .92rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      text-decoration: none;
      color: var(--text);
      font-weight: 700;
      cursor: pointer;
    }
    .header-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0 1.2rem .95rem;
    }
    .fact-chip {
      min-width: 0;
      display: grid;
      gap: .12rem;
      padding: .55rem .7rem;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--white);
    }
    .fact-chip span {
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .fact-chip strong {
      color: var(--text);
      font-size: .86rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .card-divider { border-top: 1px solid var(--border); }
    .body-block { padding: .85rem 1.2rem 1rem; }
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
    }
    .tab-active { background: var(--white); border-color: var(--border); box-shadow: var(--shadow-sm); }
    .sub-tabs { display: flex; gap: .35rem; padding: .1rem 0 .5rem; overflow-x: auto; }
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
    }
    .sub-tab-active {
      color: var(--primary);
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      background: color-mix(in srgb, var(--primary) 12%, var(--white));
    }
    .inactive-alert {
      border: 1px solid var(--border);
      background: var(--bg);
      border-radius: 16px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .inactive-alert p { margin: 0; color: var(--text); }
    @media (max-width: 900px) {
      .header-summary {
        flex-direction: column;
        align-items: stretch;
      }
    }
    @media (max-width: 760px) {
      .header,
      .body-block,
      .header-summary {
        padding-left: .9rem;
        padding-right: .9rem;
      }
      .header {
        flex-direction: column;
      }
      .title-row {
        align-items: flex-start;
      }
      .btn-edit,
      .btn-map {
        width: 100%;
        text-align: center;
      }
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly completenessSvc = inject(ConsultorioCompletenessService);
  private readonly completenessRefresh = inject(ConsultorioCompletenessRefreshService);

  readonly consultorio = signal<Consultorio | null>(null);
  readonly completeness = signal<ConsultorioCompleteness | null>(null);
  readonly loading = signal(true);

  readonly mainTabs: NavItem[] = [
    { label: 'Resumen', path: 'resumen', exact: true },
    { label: 'Ficha', path: 'ficha', exact: true },
    { label: 'Boxes', path: 'boxes', exact: true },
    { label: 'Profesionales', path: 'profesionales', exact: true },
    { label: 'Agenda', path: 'agenda', exact: false },
    { label: 'Configuracion', path: 'configuracion', exact: false },
  ];
  readonly agendaTabs: NavItem[] = [
    { label: 'Horarios de atencion', path: 'agenda/horarios-atencion' },
    { label: 'Intervalo de turnos', path: 'agenda/intervalo-turnos' },
    { label: 'Feriados y cierres', path: 'agenda/feriados-cierres' },
  ];
  readonly configurationTabs: NavItem[] = [
    { label: 'Especialidades', path: 'configuracion/especialidades' },
    { label: 'Cargos del personal', path: 'configuracion/cargos-personal' },
    { label: 'Antecedentes', path: 'configuracion/plantillas-antecedentes' },
    { label: 'Diagnosticos medicos', path: 'configuracion/diagnosticos-medicos' },
    { label: 'Tratamientos', path: 'configuracion/tratamientos' },
  ];

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly canEdit = computed(() => !!this.consultorio() && this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN'));
  readonly headerStatusIcon = computed<HeaderStatusIcon>(() => {
    const summary = this.completeness();
    if (!summary) {
      return {
        tone: 'neutral',
        symbol: '•',
        label: 'Estado general sin evaluar',
      };
    }

    if (summary.isComplete) {
      return {
        tone: 'success',
        symbol: '✓',
        label: 'Consultorio completo',
      };
    }

    return {
      tone: 'warning',
      symbol: '!',
      label: summary.hasCriticalMissing
        ? 'Consultorio incompleto con faltantes importantes'
        : 'Consultorio con informacion pendiente',
    };
  });
  readonly headerFacts = computed<HeaderFact[]>(() => {
    const current = this.consultorio();
    if (!current) return [];

    return [
      this.buildFact('Telefono', current.phone),
      this.buildFact('Email', current.email),
      this.buildFact('Direccion', current.address),
    ].filter((item): item is HeaderFact => item !== null);
  });
  readonly canOpenMap = computed(() => {
    const current = this.consultorio();
    return !!current && !!(current.address || (current.mapLatitude != null && current.mapLongitude != null));
  });

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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.completenessRefresh
      .onConsultorioChange(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadCompleteness());

    this.svc.getById(id).subscribe({
      next: (consultorio) => {
        this.consultorio.set(consultorio);
        this.loading.set(false);
        this.reloadCompleteness(consultorio);
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

  openGoogleMaps(): void {
    const current = this.consultorio();
    if (!current) return;
    const query = current.mapLatitude != null && current.mapLongitude != null
      ? `${current.mapLatitude},${current.mapLongitude}`
      : current.address || current.name;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  }

  reactivate(): void {
    const current = this.consultorio();
    if (!current || !this.auth.hasRole('ADMIN')) return;
    this.svc.activate(current.id).subscribe({
      next: (updated) => {
        this.consultorio.set(updated);
        this.reloadCompleteness(updated);
        this.completenessRefresh.notify(updated.id);
        this.toast.success('Consultorio reactivado');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private buildFact(label: string, value?: string): HeaderFact | null {
    const normalized = value?.trim();
    return normalized ? { label, value: normalized } : null;
  }

  private reloadCompleteness(current: Consultorio | null = this.consultorio()): void {
    const consultorioId = current?.id ?? this.route.snapshot.paramMap.get('id');
    if (!consultorioId) return;
    this.completenessSvc.loadCompleteness(consultorioId, current).subscribe({
      next: (result) => this.completeness.set(result),
      error: () => this.completeness.set(null),
    });
  }
}
