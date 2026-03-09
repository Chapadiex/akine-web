import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360ObraSocial } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-cobertura-page',
  standalone: true,
  styleUrl: './cobertura.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cobertura-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Obra social</h2>
          <p>Cobertura vigente, plan, coseguro, adjuntos y estado administrativo del paciente.</p>
        </div>
      </header>

      @if (loading()) {
        <p class="loading-msg">Cargando cobertura...</p>
      } @else if (data(); as current) {
        <section class="status-strip">
          <article class="status-card">
            <span class="status-card__label">Estado</span>
            <strong>{{ current.overview.vigente ? 'Cobertura vigente' : 'Cobertura no vigente' }}</strong>
            <small>{{ current.coverage.estadoCobertura }}</small>
          </article>
          <article class="status-card">
            <span class="status-card__label">Plan</span>
            <strong>{{ current.overview.plan || 'Sin plan informado' }}</strong>
            <small>{{ current.overview.obraSocialNombre || 'Sin obra social declarada' }}</small>
          </article>
          <article class="status-card">
            <span class="status-card__label">Autorización</span>
            <strong>{{ current.coverage.autorizacionRequerida ? 'Requerida' : 'No requerida' }}</strong>
            <small>{{ convenioLabel(current) }}</small>
          </article>
        </section>

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
            <small>{{ formatCoverageValue(current.overview.tipoCobertura, current.overview.valorCobertura) }}</small>
          </article>
          <article class="overview-card">
            <span class="overview-label">Coseguro</span>
            <strong>{{ current.overview.tipoCoseguro || '-' }}</strong>
            <small>{{ formatCopayValue(current.overview.tipoCoseguro, current.overview.valorCoseguro) }}</small>
          </article>
        </div>

        <div class="panels-grid">
          <article class="panel">
            <header class="panel-head">
              <h3>Cobertura y límites</h3>
            </header>
            <dl class="detail-grid">
              <div>
                <dt>Estado</dt>
                <dd>{{ current.coverage.estadoCobertura }}</dd>
              </div>
              <div>
                <dt>Prestaciones sin autorización</dt>
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
                <dt>Autorización requerida</dt>
                <dd>{{ current.coverage.autorizacionRequerida ? 'Sí' : 'No' }}</dd>
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
                <p>No hay carnet, órdenes o autorizaciones cargadas para este paciente.</p>
              </div>
            } @else {
              <ul class="attachment-list">
                @for (item of current.adjuntos; track item.id) {
                  <li>
                    <div class="attachment-row">
                      <strong>{{ item.nombre }}</strong>
                      <span class="attachment-badge" [class.attachment-badge--warn]="!item.vigente">
                        {{ item.vigente ? 'Vigente' : 'No vigente' }}
                      </span>
                    </div>
                    <span>{{ item.tipo }} · {{ item.fechaCarga ? formatDate(item.fechaCarga) : 'Sin fecha de carga' }}</span>
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

  formatCoverageValue(type?: string | null, value?: number | null): string {
    return this.formatAmount(type, value, 'Sin valor definido');
  }

  formatCopayValue(type?: string | null, value?: number | null): string {
    if (type === 'SIN_COSEGURO') return 'Sin coseguro';
    return this.formatAmount(type, value, 'Sin coseguro cargado');
  }

  convenioLabel(data: Patient360ObraSocial): string {
    const max = data.coverage.prestacionesSinAutorizacion;
    if (max == null) return 'Sin tope operativo informado';
    return `${max} prestaciones sin autorización`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  private formatAmount(type?: string | null, value?: number | null, fallback = '—'): string {
    if (value == null) return fallback;
    if (type === 'PORCENTAJE') return `${value}%`;
    if (type === 'MIXTO') return `${value}% + monto variable`;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
