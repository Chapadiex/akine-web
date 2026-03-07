import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360ObraSocial } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-cobertura-page',
  standalone: true,
  imports: [CurrencyPipe],
  styleUrl: './cobertura.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cobertura-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Obra Social</h2>
          <p>Convenio activo, plan, coseguro y disponibilidad administrativa del paciente.</p>
        </div>
      </header>

      @if (loading()) {
        <p class="loading-msg">Cargando cobertura...</p>
      } @else if (data(); as current) {
        <div class="overview-grid">
          <article class="overview-card">
            <span class="overview-label">Obra social</span>
            <strong>{{ current.overview.obraSocialNombre || 'Sin cobertura' }}</strong>
            <small>{{ current.overview.plan || 'Sin plan informado' }}</small>
          </article>
          <article class="overview-card">
            <span class="overview-label">Afiliado</span>
            <strong>{{ current.overview.nroAfiliado || '-' }}</strong>
            <small>{{ current.overview.vigente ? 'Cobertura vigente' : 'Cobertura no vigente' }}</small>
          </article>
          <article class="overview-card">
            <span class="overview-label">Cobertura</span>
            <strong>{{ current.overview.tipoCobertura || '-' }}</strong>
            <small>{{ current.overview.valorCobertura != null ? (current.overview.valorCobertura | currency:'ARS':'symbol':'1.0-0') : 'Sin valor definido' }}</small>
          </article>
          <article class="overview-card">
            <span class="overview-label">Coseguro</span>
            <strong>{{ current.overview.tipoCoseguro || '-' }}</strong>
            <small>{{ current.overview.valorCoseguro != null ? (current.overview.valorCoseguro | currency:'ARS':'symbol':'1.0-0') : 'Sin coseguro cargado' }}</small>
          </article>
        </div>

        <div class="panels-grid">
          <article class="panel">
            <header class="panel-head">
              <h3>Cobertura y limites</h3>
            </header>
            <dl class="detail-grid">
              <div>
                <dt>Estado</dt>
                <dd>{{ current.coverage.estadoCobertura }}</dd>
              </div>
              <div>
                <dt>Prestaciones sin autorizacion</dt>
                <dd>{{ current.coverage.prestacionesSinAutorizacion ?? '-' }}</dd>
              </div>
              <div>
                <dt>Sesiones usadas este mes</dt>
                <dd>{{ current.coverage.sesionesUsadasMes }}</dd>
              </div>
              <div>
                <dt>Sesiones disponibles</dt>
                <dd>{{ current.coverage.sesionesDisponibles ?? '-' }}</dd>
              </div>
              <div>
                <dt>Autorizacion requerida</dt>
                <dd>{{ current.coverage.autorizacionRequerida ? 'Si' : 'No' }}</dd>
              </div>
            </dl>
            @if (current.overview.observacionesPlan) {
              <p class="support-text">{{ current.overview.observacionesPlan }}</p>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <h3>Adjuntos</h3>
            </header>
            @if (current.adjuntos.length === 0) {
              <div class="state-empty">
                <p>No hay carnet, ordenes o autorizaciones cargadas para este paciente.</p>
              </div>
            } @else {
              <ul class="attachment-list">
                @for (item of current.adjuntos; track item.id) {
                  <li>
                    <strong>{{ item.nombre }}</strong>
                    <span>{{ item.tipo }} · {{ item.vigente ? 'Vigente' : 'No vigente' }}</span>
                  </li>
                }
              </ul>
            }
          </article>
        </div>
      } @else {
        <div class="state-empty">
          <p>No hay datos de cobertura para este paciente.</p>
        </div>
      }
    </section>
  `,
})
export class CoberturaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly data = signal<Patient360ObraSocial | null>(null);
  readonly loading = signal(true);

  constructor() {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    this.svc.getObraSocial(consultorioId, pacienteId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }
}
