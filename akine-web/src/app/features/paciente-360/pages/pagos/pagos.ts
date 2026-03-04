import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { CoberturaService } from '../../services/cobertura.service';
import { Payment } from '../../models/paciente-360.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [DatePipe, CurrencyPipe],
  styleUrl: './pagos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagos-page">
      <h2 class="page-title">Pagos y Cobros</h2>

      @if (loading()) {
        <p class="empty">Cargando pagos...</p>
      } @else {
        <div class="summary-row">
          <div class="summary-card">
            <div class="summary-label">Total cobrado</div>
            <div class="summary-value">{{ totalCobrado() | currency:'ARS':'symbol':'1.0-0' }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Pendiente</div>
            <div class="summary-value summary-value--pending">{{ totalPendiente() | currency:'ARS':'symbol':'1.0-0' }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Movimientos</div>
            <div class="summary-value">{{ items().length }}</div>
          </div>
        </div>

        @if (items().length === 0) {
          <p class="empty">No hay movimientos registrados.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (p of items(); track p.id) {
                  <tr>
                    <td>{{ p.fecha | date:'dd/MM/yyyy' }}</td>
                    <td>{{ p.concepto }}</td>
                    <td>
                      <span class="amount" [class]="'amount--' + p.tipo.toLowerCase()">
                        {{ p.tipo === 'COBRO' ? '+' : '-' }}{{ p.monto | currency:'ARS':'symbol':'1.0-0' }}
                      </span>
                    </td>
                    <td>
                      <span class="status-chip" [class]="'status-chip--' + p.estado">
                        {{ p.estado === 'COMPLETADO' ? 'Completado' : 'Pendiente' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class PagosPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(CoberturaService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly items = signal<Payment[]>([]);
  readonly loading = signal(true);

  readonly totalCobrado = computed(() =>
    this.items()
      .filter(p => p.estado === 'COMPLETADO' && p.tipo === 'COBRO')
      .reduce((sum, p) => sum + p.monto, 0),
  );

  readonly totalPendiente = computed(() =>
    this.items()
      .filter(p => p.estado === 'PENDIENTE')
      .reduce((sum, p) => sum + p.monto, 0),
  );

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.svc.getPagos(id).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }
}
