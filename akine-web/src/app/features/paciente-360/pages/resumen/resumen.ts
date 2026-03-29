import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360Summary, Patient360SummaryKpis } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

type KpiTone = 'neutral' | 'success' | 'warning' | 'danger';

interface ResumenKpiCard {
  key: 'proximo-turno' | 'ultima-atencion' | 'diagnosticos-activos' | 'sesiones-mes' | 'saldo-pendiente';
  label: string;
  value: string;
  helper: string;
  tone: KpiTone;
  clickable: boolean;
  route: string;
  queryParams: Params;
  cta: string;
}

@Component({
  selector: 'app-resumen-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
  styleUrl: './resumen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="resumen-page">
      @if (loading()) {
        <p class="loading-msg">Cargando resumen operativo...</p>
      } @else if (summary(); as current) {
        <div class="kpi-grid">
          @for (card of kpiCards(); track card.key) {
            <button
              type="button"
              class="kpi-card"
              [class.kpi-card-clickable]="card.clickable"
              [class.kpi-card-neutral]="card.tone === 'neutral'"
              [class.kpi-card-success]="card.tone === 'success'"
              [class.kpi-card-warning]="card.tone === 'warning'"
              [class.kpi-card-danger]="card.tone === 'danger'"
              [disabled]="!card.clickable"
              [attr.aria-label]="card.label + ': ' + card.value + '. ' + card.cta"
              (click)="onKpiClick(card)"
            >
              <span class="kpi-label">{{ card.label }}</span>
              <strong class="kpi-value">{{ card.value }}</strong>
              <span class="kpi-helper">{{ card.helper }}</span>
              <span class="kpi-cta">{{ card.cta }}</span>
            </button>
          }
        </div>

        <div class="panels-grid">
          <article class="panel">
            <header class="panel-head">
              <h3>Alertas</h3>
              <a [routerLink]="['../obra-social']">Ver cobertura</a>
            </header>
            @if (current.alertas.length === 0) {
              <div class="state-empty"><p>Sin alertas pendientes.</p></div>
            } @else {
              <ul class="alerts-list">
                @for (alert of current.alertas; track alert.mensaje) {
                  <li class="alert-card" [attr.data-tone]="alert.tipo">
                    <div>
                      <strong>{{ alert.mensaje }}</strong>
                    </div>
                    <a [routerLink]="[alert.route]">Abrir</a>
                  </li>
                }
              </ul>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <h3>Proximas acciones</h3>
              <a [routerLink]="['../turnos']">Gestionar</a>
            </header>
            @if (current.proximasAcciones.length === 0) {
              <div class="state-empty"><p>Sin acciones pendientes.</p></div>
            } @else {
              <ul class="actions-list">
                @for (item of current.proximasAcciones; track item.etiqueta) {
                  <li class="action-card">
                    <div>
                      <strong>{{ item.etiqueta }}</strong>
                      <p>{{ item.fechaReferencia ? (item.fechaReferencia | date:'dd/MM/yyyy HH:mm') : 'Sin fecha comprometida' }}</p>
                    </div>
                    <a [routerLink]="[item.route]">Ir</a>
                  </li>
                }
              </ul>
            }
          </article>
        </div>

      } @else {
        <div class="state-empty">
          <p>No hay resumen disponible para este paciente.</p>
        </div>
      }
    </section>
  `,
})
export class ResumenPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly summary = signal<Patient360Summary | null>(null);
  readonly loading = signal(true);

  readonly activityRoute = computed(() => this.summary()?.actividadReciente[0]?.route ?? '../turnos');

  readonly kpiCards = computed<ResumenKpiCard[]>(() => {
    const current = this.summary();
    if (!current) {
      return [];
    }

    const kpis = current.kpis;
    const canAccessPagos = this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO');

    return [
      {
        key: 'proximo-turno',
        label: 'Proximo turno',
        value: kpis.proximoTurnoFecha ? this.formatDateTime(kpis.proximoTurnoFecha) : 'Sin turno',
        helper: kpis.proximoTurnoProfesional || 'Sin agenda asignada',
        tone: this.getProximoTurnoTone(kpis),
        clickable: true,
        route: '../turnos',
        queryParams: {
          scope: 'PROXIMOS',
          origen: 'kpi-proximo-turno',
          cta: kpis.proximoTurnoFecha ? 'ver-turnos' : 'programar-turno',
        },
        cta: kpis.proximoTurnoFecha ? 'Ver turnos' : 'Programar turno',
      },
      {
        key: 'ultima-atencion',
        label: 'Ultima atencion',
        value: kpis.ultimaAtencionFecha ? this.formatDateTime(kpis.ultimaAtencionFecha) : 'Sin registros',
        helper: kpis.ultimaAtencionProfesional || 'Sin profesional registrado',
        tone: this.getUltimaAtencionTone(kpis),
        clickable: true,
        route: '../atenciones',
        queryParams: {
          origen: 'kpi-ultima-atencion',
          cta: kpis.ultimaAtencionFecha ? 'ver-detalle' : 'ver-atenciones',
        },
        cta: kpis.ultimaAtencionFecha ? 'Ver detalle' : 'Ir a atenciones',
      },
      {
        key: 'diagnosticos-activos',
        label: 'Diagnosticos activos',
        value: String(kpis.diagnosticosActivos),
        helper: kpis.diagnosticosActivos > 0 ? 'Con seguimiento en curso' : 'Sin diagnosticos activos',
        tone: kpis.diagnosticosActivos > 0 ? 'warning' : 'neutral',
        clickable: true,
        route: '../diagnosticos',
        queryParams: {
          estado: 'ACTIVO',
          origen: 'kpi-diagnosticos-activos',
          cta: kpis.diagnosticosActivos > 0 ? 'ver-activos' : 'crear-diagnostico',
        },
        cta: kpis.diagnosticosActivos > 0 ? 'Ver activos' : 'Crear diagnostico',
      },
      {
        key: 'sesiones-mes',
        label: 'Sesiones del mes',
        value: String(kpis.sesionesMes),
        helper: 'Atenciones del mes actual',
        tone: kpis.sesionesMes === 0 ? 'warning' : 'neutral',
        clickable: true,
        route: '../atenciones',
        queryParams: {
          periodo: 'mes-actual',
          origen: 'kpi-sesiones-mes',
          cta: 'ver-sesiones-mes',
        },
        cta: 'Ver sesiones',
      },
      {
        key: 'saldo-pendiente',
        label: 'Saldo pendiente',
        value: this.formatCurrency(kpis.saldoPendiente),
        helper: kpis.saldoPendiente > 0 ? 'Cuenta corriente con deuda' : 'Cuenta al dia',
        tone: kpis.saldoPendiente === 0 ? 'success' : 'warning',
        clickable: canAccessPagos,
        route: '../pagos',
        queryParams: {
          estado: kpis.saldoPendiente > 0 ? 'PENDIENTE' : 'AL_DIA',
          origen: 'kpi-saldo-pendiente',
          cta: kpis.saldoPendiente > 0 ? 'regularizar' : 'ver-cuenta',
        },
        cta: canAccessPagos ? 'Ver cobranzas' : 'Sin permisos de cobranza',
      },
    ];
  });

  constructor() {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }
    this.svc.getSummary(consultorioId, pacienteId).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  onKpiClick(card: ResumenKpiCard): void {
    if (!card.clickable) {
      return;
    }
    void this.router.navigate([card.route], {
      relativeTo: this.route,
      queryParams: card.queryParams,
    });
  }

  private formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  private getProximoTurnoTone(kpis: Patient360SummaryKpis): KpiTone {
    if (!kpis.proximoTurnoFecha) {
      return 'warning';
    }
    const estado = (kpis.proximoTurnoEstado ?? '').toUpperCase();
    if (estado.includes('CANCEL') || estado.includes('AUSEN')) {
      return 'danger';
    }
    if (estado.includes('CONFIRM') || estado.includes('PROGRAM')) {
      return 'success';
    }
    return 'neutral';
  }

  private getUltimaAtencionTone(kpis: Patient360SummaryKpis): KpiTone {
    if (!kpis.ultimaAtencionFecha) {
      return 'warning';
    }
    const dias = this.getDaysSince(kpis.ultimaAtencionFecha);
    if (dias > 120) {
      return 'danger';
    }
    if (dias > 45) {
      return 'warning';
    }
    return 'neutral';
  }

  private getDaysSince(value: string): number {
    const diffMs = Date.now() - new Date(value).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}
