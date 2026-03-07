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
        <header class="page-head">
          <div class="page-head-main">
            <h2>Resumen</h2>
            <p>Vista general del paciente con actividad reciente, alertas y proximas acciones.</p>
          </div>
        </header>

        <div class="kpi-grid">
          <article class="kpi-card">
            <span class="kpi-label">Proximo turno</span>
            <strong class="kpi-value">
              {{ current.kpis.proximoTurnoFecha ? (current.kpis.proximoTurnoFecha | date:'dd MMM · HH:mm') : 'Sin turno' }}
            </strong>
            <small class="kpi-helper">{{ current.kpis.proximoTurnoProfesional || 'Pendiente de agenda' }}</small>
          </article>

          <article class="kpi-card">
            <span class="kpi-label">Ultima atencion</span>
            <strong class="kpi-value">
              {{ current.kpis.ultimaAtencionFecha ? (current.kpis.ultimaAtencionFecha | date:'dd MMM · HH:mm') : 'Sin registros' }}
            </strong>
            <small class="kpi-helper">{{ current.kpis.ultimaAtencionProfesional || 'Sin profesional' }}</small>
          </article>

          <article class="kpi-card">
            <span class="kpi-label">Diagnosticos activos</span>
            <strong class="kpi-value">{{ current.kpis.diagnosticosActivos }}</strong>
            <small class="kpi-helper">Pendientes de seguimiento clinico</small>
          </article>

          <article class="kpi-card">
            <span class="kpi-label">Sesiones del mes</span>
            <strong class="kpi-value">{{ current.kpis.sesionesMes }}</strong>
            <small class="kpi-helper">Atenciones efectivas registradas</small>
          </article>

          <article class="kpi-card">
            <span class="kpi-label">Cobertura</span>
            <strong class="kpi-value">{{ current.kpis.coberturaEstado }}</strong>
            <small class="kpi-helper">Convenio y autorizaciones</small>
          </article>

          <article class="kpi-card">
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
            <ul class="list">
              @for (alert of current.alertas; track alert.mensaje) {
                <li class="list-row">
                  <span class="row-pill" [class.row-pill-warning]="alert.tipo === 'warning'">
                    {{ alert.tipo }}
                  </span>
                  <div>
                    <strong>{{ alert.mensaje }}</strong>
                  </div>
                  <a [routerLink]="[alert.route]">Abrir</a>
                </li>
              }
            </ul>
          </article>

          <article class="panel">
            <header class="panel-head">
              <h3>Proximas acciones</h3>
              <a [routerLink]="['../turnos']">Gestionar</a>
            </header>
            <ul class="list">
              @for (item of current.proximasAcciones; track item.etiqueta) {
                <li class="list-row">
                  <div>
                    <strong>{{ item.etiqueta }}</strong>
                    <p>
                      {{ item.fechaReferencia ? (item.fechaReferencia | date:'dd/MM/yyyy HH:mm') : 'Sin fecha comprometida' }}
                    </p>
                  </div>
                  <a [routerLink]="[item.route]">Ir</a>
                </li>
              }
            </ul>
          </article>
        </div>

        <article class="panel panel-wide">
          <header class="panel-head">
            <h3>Actividad reciente</h3>
            <a [routerLink]="activityRoute()">Abrir tab</a>
          </header>
          @if (current.actividadReciente.length === 0) {
            <div class="state-empty">
              <p>No hay actividad reciente para mostrar.</p>
            </div>
          } @else {
            <div class="activity-list">
              @for (item of current.actividadReciente; track item.id) {
                <a class="activity-row" [routerLink]="[item.route]">
                  <span class="activity-type">{{ item.tipo }}</span>
                  <div class="activity-copy">
                    <strong>{{ item.titulo }}</strong>
                    <p>{{ item.detalle }}</p>
                  </div>
                  <span class="activity-date">{{ item.fecha | date:'dd MMM · HH:mm' }}</span>
                </a>
              }
            </div>
          }
        </article>
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
