import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Feriado } from '../../../turnos/models/turno.models';
import { AntecedenteCatalog, AntecedenteCatalogCategory } from '../../models/antecedente-catalog.models';
import { Box, Profesional } from '../../models/consultorio.models';
import {
  ConsultorioDuracion,
  ConsultorioHorario,
  ProfesionalAsignado,
} from '../../models/agenda.models';
import { Especialidad } from '../../models/especialidad.models';
import { AntecedenteCatalogService } from '../../services/antecedente-catalog.service';
import { AsignacionService } from '../../services/asignacion.service';
import { BoxService } from '../../services/box.service';
import { DuracionService } from '../../services/duracion.service';
import { EspecialidadService } from '../../services/especialidad.service';
import { FeriadoService } from '../../services/feriado.service';
import { HorarioService } from '../../services/horario.service';
import { ProfesionalService } from '../../services/profesional.service';
import { resolveConsultorioId } from '../../utils/route-utils';

interface ResumenKpi {
  label: string;
  value: string;
  helper: string;
  route: string;
}

interface ConfigAlert {
  title: string;
  detail: string;
  route: string;
}

interface ResumenData {
  boxes: Box[];
  profesionales: Profesional[];
  horarios: ConsultorioHorario[];
  duraciones: ConsultorioDuracion[];
  asignaciones: ProfesionalAsignado[];
  feriados: Feriado[];
  especialidades: Especialidad[];
  antecedentes: AntecedenteCatalog | null;
}

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
            <a class="kpi-card" [routerLink]="kpi.route">
              <span class="kpi-label">{{ kpi.label }}</span>
              <strong class="kpi-value">{{ kpi.value }}</strong>
              <small class="kpi-helper">{{ kpi.helper }}</small>
            </a>
          }
        </div>

        <div class="panels-grid">
          <article class="panel">
            <header class="panel-head">
              <h3>Alertas de configuracion</h3>
              <a [routerLink]="path('configuracion/especialidades')">Ir a configuracion</a>
            </header>

            @if (alerts().length === 0) {
              <div class="state-ok">
                <strong>Configuracion principal completa</strong>
                <p>No hay bloqueos operativos detectados para agenda y catalogos.</p>
              </div>
            } @else {
              <ul class="alerts-list">
                @for (alert of alerts(); track alert.title) {
                  <li>
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
              <h3>Proximos feriados</h3>
              <a [routerLink]="path('agenda/feriados-cierres')">Gestionar</a>
            </header>

            @if (upcomingHolidays().length === 0) {
              <div class="state-empty">
                <p>No hay feriados proximos en los siguientes 30 dias.</p>
              </div>
            } @else {
              <ul class="holiday-list">
                @for (feriado of upcomingHolidays(); track feriado.id) {
                  <li>
                    <strong>{{ formatDate(feriado.fecha) }}</strong>
                    <span>{{ feriado.descripcion || 'Feriado sin descripcion' }}</span>
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
      grid-template-columns: repeat(6, minmax(120px, 1fr));
    }

    .kpi-card {
      text-decoration: none;
      color: inherit;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: .58rem .68rem;
      background: var(--white);
      display: grid;
      gap: .14rem;
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }

    .kpi-card:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
      box-shadow: var(--shadow-sm);
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

    @media (max-width: 1140px) {
      .kpi-grid {
        grid-template-columns: repeat(3, minmax(140px, 1fr));
      }
    }

    @media (max-width: 900px) {
      .panels-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 680px) {
      .kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
  private readonly boxSvc = inject(BoxService);
  private readonly profesionalSvc = inject(ProfesionalService);
  private readonly horarioSvc = inject(HorarioService);
  private readonly duracionSvc = inject(DuracionService);
  private readonly asignacionSvc = inject(AsignacionService);
  private readonly feriadoSvc = inject(FeriadoService);
  private readonly especialidadSvc = inject(EspecialidadService);
  private readonly antecedenteSvc = inject(AntecedenteCatalogService);
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
      boxes: safe(this.boxSvc.list(this.consultorioId), [] as Box[]),
      profesionales: safe(this.profesionalSvc.list(this.consultorioId), [] as Profesional[]),
      horarios: safe(this.horarioSvc.list(this.consultorioId), [] as ConsultorioHorario[]),
      duraciones: safe(this.duracionSvc.list(this.consultorioId), [] as ConsultorioDuracion[]),
      asignaciones: safe(this.asignacionSvc.list(this.consultorioId), [] as ProfesionalAsignado[]),
      feriados: safe(this.feriadoSvc.list(this.consultorioId, year), [] as Feriado[]),
      especialidades: safe(this.especialidadSvc.list(this.consultorioId), [] as Especialidad[]),
      antecedentes: safe(this.antecedenteSvc.get(this.consultorioId), null as AntecedenteCatalog | null),
    }).subscribe({
      next: (data) => {
        this.buildViewModel(data);
        this.loading.set(false);

        if (partialError) {
          this.toast.warning('El resumen se cargo parcialmente. Algunas metricas pueden estar incompletas.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private buildViewModel(data: ResumenData): void {
    const activeBoxes = data.boxes.filter((item) => item.activo).length;
    const activeProfessionals = data.profesionales.filter((item) => item.activo).length;
    const activeSpecialties = data.especialidades.filter((item) => item.activo).length;
    const antecedentesActivos = this.countActiveAntecedentes(data.antecedentes?.categories ?? []);

    const sortedDurations = data.duraciones
      .map((item) => item.minutos)
      .sort((left, right) => left - right);

    const intervalSummary =
      sortedDurations.length > 0
        ? sortedDurations.map((minutes) => `${minutes} min`).join(' | ')
        : 'Sin definir';

    const upcomingHolidays = this.resolveUpcomingHolidays(data.feriados);

    this.kpis.set([
      {
        label: 'Boxes',
        value: String(activeBoxes),
        helper: `${data.boxes.length} total`,
        route: this.path('boxes'),
      },
      {
        label: 'Profesionales',
        value: String(activeProfessionals),
        helper: `${data.profesionales.length} total`,
        route: this.path('profesionales'),
      },
      {
        label: 'Horarios',
        value: String(data.horarios.length),
        helper: 'Tramos semanales activos',
        route: this.path('agenda/horarios-atencion'),
      },
      {
        label: 'Cobertura',
        value: String(data.asignaciones.length),
        helper: 'Profesionales asignados',
        route: this.path('agenda/cobertura-profesionales'),
      },
      {
        label: 'Intervalos',
        value: String(data.duraciones.length),
        helper: intervalSummary,
        route: this.path('agenda/intervalo-turnos'),
      },
      {
        label: 'Especialidades',
        value: String(activeSpecialties),
        helper: 'Especialidades activas',
        route: this.path('configuracion/especialidades'),
      },
    ]);

    this.upcomingHolidays.set(upcomingHolidays);

    const alerts: ConfigAlert[] = [];
    if (activeBoxes === 0) {
      alerts.push({
        title: 'Sin boxes activos',
        detail: 'Configura al menos un box para habilitar operacion de agenda.',
        route: this.path('boxes'),
      });
    }
    if (activeProfessionals === 0) {
      alerts.push({
        title: 'Sin profesionales activos',
        detail: 'No hay profesionales activos para asignar turnos.',
        route: this.path('profesionales'),
      });
    }
    if (data.horarios.length === 0) {
      alerts.push({
        title: 'Horarios de atencion incompletos',
        detail: 'Debes cargar horarios para habilitar disponibilidad de turnos.',
        route: this.path('agenda/horarios-atencion'),
      });
    }
    if (data.asignaciones.length === 0) {
      alerts.push({
        title: 'Cobertura profesional sin configurar',
        detail: 'Asigna profesionales para completar cobertura por consultorio.',
        route: this.path('agenda/cobertura-profesionales'),
      });
    }
    if (data.duraciones.length === 0) {
      alerts.push({
        title: 'Intervalo de turnos no definido',
        detail: 'Define al menos una duracion para bloquear turnos invalidos.',
        route: this.path('agenda/intervalo-turnos'),
      });
    }
    if (activeSpecialties === 0) {
      alerts.push({
        title: 'Sin especialidades activas',
        detail: 'Activa especialidades para completar la configuracion clinica.',
        route: this.path('configuracion/especialidades'),
      });
    }
    if (antecedentesActivos === 0) {
      alerts.push({
        title: 'Catalogo de antecedentes vacio',
        detail: 'No hay plantillas activas para antecedentes clinicos.',
        route: this.path('configuracion/plantillas-antecedentes'),
      });
    }

    this.alerts.set(alerts);
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

  private countActiveAntecedentes(categories: AntecedenteCatalogCategory[]): number {
    return categories.reduce((acc, category) => {
      const activeItems = (category.items ?? []).filter((item) => item.active).length;
      return acc + activeItems;
    }, 0);
  }
}
