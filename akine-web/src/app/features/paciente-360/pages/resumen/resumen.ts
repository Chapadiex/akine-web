import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360Summary } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-resumen-page',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  styleUrl: './resumen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="resumen-page">
      @if (loading()) {
        <p class="loading-msg">Cargando resumen operativo...</p>
      } @else if (summary(); as current) {
        <div class="kpi-grid">
          <article class="kpi-card"
            [class.kpi-card-success]="!!current.kpis.proximoTurnoFecha"
            [class.kpi-card-warning]="!current.kpis.proximoTurnoFecha">
            <span class="kpi-label">Próximo turno</span>
            <strong class="kpi-value">
              {{ current.kpis.proximoTurnoFecha ? (current.kpis.proximoTurnoFecha | date:'dd MMM · HH:mm') : 'Sin turno' }}
            </strong>
            <small class="kpi-helper">{{ current.kpis.proximoTurnoProfesional || 'Pendiente de agenda' }}</small>
          </article>

          <article class="kpi-card"
            [class.kpi-card-success]="!!current.kpis.ultimaAtencionFecha"
            [class.kpi-card-warning]="!current.kpis.ultimaAtencionFecha">
            <span class="kpi-label">Última atención</span>
            <strong class="kpi-value">
              {{ current.kpis.ultimaAtencionFecha ? (current.kpis.ultimaAtencionFecha | date:'dd MMM · HH:mm') : 'Sin registros' }}
            </strong>
            <small class="kpi-helper">{{ current.kpis.ultimaAtencionProfesional || 'Sin profesional' }}</small>
          </article>

          <article class="kpi-card"
            [class.kpi-card-warning]="current.kpis.diagnosticosActivos > 0"
            [class.kpi-card-success]="current.kpis.diagnosticosActivos === 0">
            <span class="kpi-label">Diagnósticos activos</span>
            <strong class="kpi-value">{{ current.kpis.diagnosticosActivos }}</strong>
            <small class="kpi-helper">Pendientes de seguimiento clínico</small>
          </article>

          <article class="kpi-card"
            [class.kpi-card-success]="current.kpis.sesionesMes > 0"
            [class.kpi-card-warning]="current.kpis.sesionesMes === 0">
            <span class="kpi-label">Sesiones del mes</span>
            <strong class="kpi-value">{{ current.kpis.sesionesMes }}</strong>
            <small class="kpi-helper">Atenciones efectivas registradas</small>
          </article>

          <article class="kpi-card"
            [class.kpi-card-success]="current.kpis.coberturaEstado && !current.kpis.coberturaEstado.toLowerCase().startsWith('sin')"
            [class.kpi-card-warning]="!current.kpis.coberturaEstado || current.kpis.coberturaEstado.toLowerCase().startsWith('sin')">
            <span class="kpi-label">Cobertura</span>
            <strong class="kpi-value">{{ current.kpis.coberturaEstado }}</strong>
            <small class="kpi-helper">Convenio y autorizaciones</small>
          </article>

          <article class="kpi-card"
            [class.kpi-card-warning]="current.kpis.saldoPendiente > 0"
            [class.kpi-card-success]="current.kpis.saldoPendiente === 0">
            <span class="kpi-label">Saldo pendiente</span>
            <strong class="kpi-value">{{ current.kpis.saldoPendiente | currency:'ARS':'symbol':'1.0-0' }}</strong>
            <small class="kpi-helper">Caja vinculada al paciente</small>
          </article>
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
              <h3>Próximas acciones</h3>
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
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly summary = signal<Patient360Summary | null>(null);
  readonly loading = signal(true);

  readonly activityRoute = computed(() =>
    this.summary()?.actividadReciente[0]?.route ?? '../turnos',
  );

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
}
