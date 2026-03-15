import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Feriado } from '../../../turnos/models/turno.models';
import { Box, Consultorio, Profesional } from '../../models/consultorio.models';
import { ConsultorioDuracion, ConsultorioHorario } from '../../models/agenda.models';
import { BoxService } from '../../services/box.service';
import { ConsultorioCompletenessRefreshService } from '../../services/consultorio-completeness-refresh.service';
import { ConsultorioService } from '../../services/consultorio.service';
import { DuracionService } from '../../services/duracion.service';
import { FeriadoService } from '../../services/feriado.service';
import { HorarioService } from '../../services/horario.service';
import { ProfesionalService } from '../../services/profesional.service';
import { evaluateConsultorioCompletenessSnapshot } from '../../utils/consultorio-completeness';
import { resolveConsultorioId } from '../../utils/route-utils';

interface ResumenKpi {
  label: string;
  value: string;
  helper: string;
  route: string;
  tone: 'success' | 'warning';
}

interface ConfigAlert {
  title: string;
  detail: string;
  route: string;
}

interface ResumenData {
  consultorio: Consultorio;
  boxes: Box[];
  profesionales: Profesional[];
  horarios: ConsultorioHorario[];
  duraciones: ConsultorioDuracion[];
  feriados: Feriado[];
}

const EMPTY_CONSULTORIO: Consultorio = {
  id: '',
  name: '',
  address: '',
  phone: '',
  email: '',
  status: 'INACTIVE',
  createdAt: '',
  updatedAt: '',
};

@Component({
  selector: 'app-consultorio-resumen',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="resumen-page">
      @if (loading()) {
        <p class="loading-msg">Cargando resumen operativo...</p>
      } @else {
        <div class="kpi-grid">
          @for (kpi of kpis(); track kpi.label) {
            <a
              class="kpi-card"
              [class.kpi-card-success]="kpi.tone === 'success'"
              [class.kpi-card-warning]="kpi.tone === 'warning'"
              [routerLink]="kpi.route"
            >
              <span class="kpi-label">{{ kpi.label }}</span>
              <strong class="kpi-value">{{ kpi.value }}</strong>
              <small class="kpi-helper">{{ kpi.helper }}</small>
            </a>
          }
        </div>

        <div class="panels-grid">
          <article class="panel">
            <header class="panel-head">
              <h3>Alertas de configuración</h3>
              <a [routerLink]="path('agenda/horarios-atencion')">Ir a configuración</a>
            </header>

            @if (alerts().length === 0) {
              <div class="state-ok">
                <strong>Configuración principal completa</strong>
                <p>No hay bloqueos operativos detectados en los datos y la operación principal del consultorio.</p>
              </div>
            } @else {
              <ul class="alerts-list">
                @for (alert of alerts(); track alert.title) {
                  <li class="pending-card">
                    <div>
                      <strong>{{ alert.title }}</strong>
                      <p>{{ alert.detail }}</p>
                    </div>
                    <a [routerLink]="alert.route">Resolver</a>
                  </li>
                }
              </ul>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <h3>Próximos feriados</h3>
              <a [routerLink]="path('agenda/feriados-cierres')">Gestionar</a>
            </header>

            @if (upcomingHolidays().length === 0) {
              <div class="state-empty">
                <p>No hay feriados próximos en los siguientes 30 días.</p>
              </div>
            } @else {
              <ul class="holiday-list">
                @for (feriado of upcomingHolidays(); track feriado.id) {
                  <li>
                    <strong>{{ formatDate(feriado.fecha) }}</strong>
                    <span>{{ feriado.descripcion || 'Feriado sin descripción' }}</span>
                  </li>
                }
              </ul>
            }
          </article>
        </div>
      }
    </section>
  `,
  styles: [`
    .resumen-page {
      display: grid;
      gap: .72rem;
    }

    .loading-msg {
      color: var(--text-muted);
      text-align: center;
      padding: 2rem 1rem;
    }

    .kpi-grid {
      display: grid;
      gap: .55rem;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    }

    .kpi-card {
      text-decoration: none;
      color: inherit;
      border: 1px solid var(--border);
      border-left-width: 3px;
      border-radius: 10px;
      padding: .62rem .7rem .62rem .8rem;
      background: var(--white);
      display: grid;
      gap: .14rem;
      transition: box-shadow .16s ease, border-color .16s ease;
    }

    .kpi-card:hover {
      box-shadow: var(--shadow-sm);
    }

    .kpi-card-success {
      border-left-color: var(--success);
    }

    .kpi-card-success .kpi-value {
      color: var(--success);
    }

    .kpi-card-warning {
      border-left-color: var(--warning, #d97706);
    }

    .kpi-card-warning .kpi-value {
      color: var(--warning, #d97706);
    }

    .kpi-label {
      color: var(--text-muted);
      font-size: .66rem;
      letter-spacing: .03em;
      text-transform: uppercase;
      font-weight: 700;
    }

    .kpi-value {
      color: var(--text);
      font-size: 1.08rem;
      line-height: 1.05;
      font-weight: 760;
    }

    .kpi-helper {
      color: var(--text-muted);
      font-size: .69rem;
      font-weight: 600;
    }

    .panels-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
      gap: .65rem;
      align-items: start;
    }

    .panel {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      padding: .72rem;
      display: grid;
      gap: .62rem;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
    }

    .panel-head h3 {
      margin: 0;
      font-size: .9rem;
      color: var(--text);
    }

    .panel-head a {
      color: var(--primary);
      text-decoration: none;
      font-size: .76rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .panel-head a:hover {
      text-decoration: underline;
    }

    .state-ok {
      border: 1px solid var(--success-border);
      background: var(--success-bg);
      border-radius: 10px;
      padding: .58rem .62rem;
    }

    .state-ok strong {
      color: var(--success);
      font-size: .81rem;
    }

    .state-ok p {
      margin: .25rem 0 0;
      color: var(--text);
      font-size: .76rem;
    }

    .state-empty {
      border: 1px dashed var(--border);
      border-radius: 10px;
      padding: .55rem .62rem;
      color: var(--text-muted);
      font-size: .78rem;
    }

    .state-empty p {
      margin: 0;
    }

    .alerts-list,
    .holiday-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: .45rem;
    }

    .alerts-list li,
    .holiday-list li {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--white) 88%, var(--bg) 12%);
      padding: .46rem .56rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: .6rem;
    }

    .alerts-list li.pending-card {
      border-left-width: 4px;
      border-left-color: var(--warning);
      background: var(--white);
    }

    .alerts-list strong,
    .holiday-list strong {
      color: var(--text);
      font-size: .79rem;
    }

    .alerts-list p,
    .holiday-list span {
      margin: .2rem 0 0;
      color: var(--text-muted);
      font-size: .74rem;
      line-height: 1.35;
    }

    .alerts-list a {
      flex-shrink: 0;
      color: var(--primary);
      text-decoration: none;
      font-size: .74rem;
      font-weight: 700;
    }

    .alerts-list a:hover {
      text-decoration: underline;
    }

    @media (max-width: 900px) {
      .panels-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 680px) {
      .kpi-grid {
        grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      }

      .panel-head {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class ConsultorioResumenPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consultorioSvc = inject(ConsultorioService);
  private readonly boxSvc = inject(BoxService);
  private readonly profesionalSvc = inject(ProfesionalService);
  private readonly horarioSvc = inject(HorarioService);
  private readonly duracionSvc = inject(DuracionService);
  private readonly feriadoSvc = inject(FeriadoService);
  private readonly completenessRefresh = inject(ConsultorioCompletenessRefreshService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly loading = signal(true);
  readonly kpis = signal<ResumenKpi[]>([]);
  readonly alerts = signal<ConfigAlert[]>([]);
  readonly upcomingHolidays = signal<Feriado[]>([]);

  private consultorioId = '';

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.loading.set(false);
      this.toast.error('No se pudo resolver el consultorio para el resumen.');
      return;
    }

    this.completenessRefresh
      .onConsultorioChange(this.consultorioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadResumen());

    this.loadResumen();
  }

  path(segment: string): string {
    return `/app/consultorios/${this.consultorioId}/${segment}`;
  }

  formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  }

  private loadResumen(): void {
    this.loading.set(true);
    let partialError = false;

    const safe = <T>(obs: Observable<T>, fallback: T): Observable<T> =>
      obs.pipe(
        catchError(() => {
          partialError = true;
          return of(fallback);
        }),
      );

    const year = new Date().getFullYear();

    forkJoin({
      consultorio: safe(this.consultorioSvc.getById(this.consultorioId), EMPTY_CONSULTORIO),
      boxes: safe(this.boxSvc.list(this.consultorioId), [] as Box[]),
      profesionales: safe(this.profesionalSvc.list(this.consultorioId), [] as Profesional[]),
      horarios: safe(this.horarioSvc.list(this.consultorioId), [] as ConsultorioHorario[]),
      duraciones: safe(this.duracionSvc.list(this.consultorioId), [] as ConsultorioDuracion[]),
      feriados: safe(this.feriadoSvc.list(this.consultorioId, year), [] as Feriado[]),
    }).subscribe({
      next: (data) => {
        this.buildViewModel(data);
        this.loading.set(false);

        if (partialError) {
          this.toast.warning('El resumen se cargó parcialmente. Algunas métricas pueden estar incompletas.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private buildViewModel(data: ResumenData): void {
    const completeness = evaluateConsultorioCompletenessSnapshot({
      consultorio: data.consultorio,
      boxes: data.boxes,
      profesionales: data.profesionales,
      horarios: data.horarios,
      duraciones: data.duraciones,
    });
    const activeBoxes = data.boxes.filter((item) => item.activo !== false).length;
    const activeProfessionals = data.profesionales.filter((item) => item.activo !== false).length;

    const sortedDurations = data.duraciones
      .map((item) => item.minutos)
      .sort((left, right) => left - right);

    const intervalSummary =
      sortedDurations.length > 0
        ? sortedDurations.map((minutes) => `${minutes} min`).join(' | ')
        : 'Sin definir';

    this.kpis.set([
      {
        label: 'Boxes',
        value: String(activeBoxes),
        helper: `${data.boxes.length} total`,
        route: this.path('boxes'),
        tone: this.resolveKpiTone(completeness, 'boxes'),
      },
      {
        label: 'Profesionales',
        value: String(activeProfessionals),
        helper: `${data.profesionales.length} total`,
        route: this.path('profesionales'),
        tone: this.resolveKpiTone(completeness, 'profesionales'),
      },
      {
        label: 'Horarios',
        value: String(data.horarios.filter((item) => item.activo !== false).length),
        helper: 'Tramos semanales activos',
        route: this.path('agenda/horarios-atencion'),
        tone: this.resolveKpiTone(completeness, 'horarios'),
      },
      {
        label: 'Intervalos',
        value: String(data.duraciones.length),
        helper: intervalSummary,
        route: this.path('agenda/intervalo-turnos'),
        tone: this.resolveKpiTone(completeness, 'intervalos'),
      },
    ]);

    this.upcomingHolidays.set(this.resolveUpcomingHolidays(data.feriados));
    this.alerts.set(
      completeness.sections
        .filter((section) => !section.isComplete)
        .map((section) => ({
          title: `${section.label} incompleta`,
          detail: section.missingItems.join(', '),
          route: this.path(section.route ?? 'resumen'),
        })),
    );
  }

  private resolveUpcomingHolidays(feriados: Feriado[]): Feriado[] {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    return feriados
      .filter((item) => {
        const date = new Date(`${item.fecha}T00:00:00`);
        return date >= today && date <= maxDate;
      })
      .sort((left, right) => left.fecha.localeCompare(right.fecha))
      .slice(0, 5);
  }

  private resolveKpiTone(
    completeness: ReturnType<typeof evaluateConsultorioCompletenessSnapshot>,
    sectionKey: string,
  ): 'success' | 'warning' {
    return completeness.sections.find((section) => section.key === sectionKey)?.isComplete
      ? 'success'
      : 'warning';
  }
}
