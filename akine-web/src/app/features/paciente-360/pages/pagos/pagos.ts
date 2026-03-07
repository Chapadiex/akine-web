import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360Pagos } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  styleUrl: './pagos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pagos-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Pagos</h2>
          <p>Vista financiera del paciente: saldo, cobranzas y conciliacion administrativa.</p>
        </div>
      </header>

      @if (loading()) {
        <p class="loading-msg">Cargando pagos...</p>
      } @else if (data(); as current) {
        <div class="summary-strip">
          <article class="summary-card">
            <span class="summary-label">Saldo pendiente</span>
            <strong>{{ current.summary.saldoPendiente | currency:'ARS':'symbol':'1.0-0' }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Total cobrado</span>
            <strong>{{ current.summary.totalCobrado | currency:'ARS':'symbol':'1.0-0' }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Ultimo pago</span>
            <strong>{{ current.summary.ultimoPagoMonto | currency:'ARS':'symbol':'1.0-0' }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Deuda vencida</span>
            <strong>{{ current.summary.deudaVencida | currency:'ARS':'symbol':'1.0-0' }}</strong>
          </article>
        </div>

        <div class="panels-grid">
          <article class="panel">
            <header class="panel-head">
              <h3>Movimientos</h3>
            </header>
            @if (current.items.length === 0) {
              <div class="state-empty">
                <p>No hay movimientos registrados para este paciente.</p>
              </div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of current.items; track item.id) {
                      <tr>
                        <td>{{ item.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ item.concepto }}</td>
                        <td>{{ item.tipo }}</td>
                        <td>{{ item.estado }}</td>
                        <td>{{ item.monto | currency:'ARS':'symbol':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <h3>Conciliacion</h3>
            </header>
            <ul class="conciliacion-list">
              @for (item of current.conciliacion; track item.id) {
                <li>
                  <strong>{{ item.estado }}</strong>
                  <p>{{ item.detalle }}</p>
                </li>
              }
            </ul>
          </article>
        </div>
      } @else {
        <div class="state-empty">
          <p>No hay informacion financiera para este paciente.</p>
        </div>
      }
    </section>
  `,
})
export class PagosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly data = signal<Patient360Pagos | null>(null);
  readonly loading = signal(true);

  constructor() {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    this.svc.getPagos(consultorioId, pacienteId).subscribe({
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
