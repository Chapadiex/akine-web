import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { CobroPacienteService } from '../../../caja/services/cobro-paciente.service';
import { LiquidacionSesionService } from '../../../caja/services/liquidacion-sesion.service';
import { CobroPaciente, LiquidacionSesion } from '../../../caja/models/caja.models';

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
          <p>Sesiones pendientes de cobro y movimientos registrados.</p>
        </div>
        @if (pacienteId()) {
          <button class="btn-primary" type="button" (click)="irACobrar()">
            Registrar cobro
          </button>
        }
      </header>

      @if (loading()) {
        <p class="loading-msg">Cargando información financiera...</p>
      } @else {

        <div class="summary-strip">
          <article class="summary-card">
            <span class="summary-label">Saldo pendiente</span>
            <strong>{{ saldoPendiente() | currency:'ARS':'symbol':'1.0-0' }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Sesiones pendientes</span>
            <strong>{{ pendientes().length }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Total cobrado</span>
            <strong>{{ totalCobrado() | currency:'ARS':'symbol':'1.0-0' }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-label">Cobros registrados</span>
            <strong>{{ cobros().length }}</strong>
          </article>
        </div>

        <div class="panels-grid">

          <article class="panel">
            <header class="panel-head">
              <h3>Sesiones pendientes de cobro</h3>
            </header>
            @if (pendientes().length === 0) {
              <div class="state-empty">
                <p>No hay sesiones pendientes de cobro para este paciente.</p>
              </div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th class="col-num">Importe</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (liq of pendientes(); track liq.id) {
                      <tr>
                        <td>{{ liq.createdAt | date:'dd/MM/yyyy' }}</td>
                        <td>{{ tipoLabel(liq) }}</td>
                        <td>
                          <span class="badge-estado" [class]="estadoClass(liq)">
                            <span class="dot" [class]="dotClass(liq)"></span>
                            Pendiente
                          </span>
                        </td>
                        <td class="col-num">{{ liq.importePaciente | currency:'ARS':'symbol':'1.0-0' }}</td>
                        <td class="col-action">
                          <button class="btn-action" type="button" (click)="cobrarSesion(liq)">
                            Cobrar
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </article>

          <article class="panel">
            <header class="panel-head">
              <h3>Cobros registrados</h3>
            </header>
            @if (cobros().length === 0) {
              <div class="state-empty">
                <p>No hay cobros registrados para este paciente.</p>
              </div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th class="col-num">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cobro of cobros(); track cobro.id) {
                      <tr>
                        <td>{{ cobro.fechaCobro | date:'dd/MM/yyyy' }}</td>
                        <td>
                          <span class="badge-estado" [class]="cobroEstadoClass(cobro)">
                            <span class="dot" [class]="cobroDotClass(cobro)"></span>
                            {{ cobroEstadoLabel(cobro) }}
                          </span>
                        </td>
                        <td class="col-num">{{ cobro.importeTotal | currency:'ARS':'symbol':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </article>

        </div>
      }
    </section>
  `,
})
export class PagosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly liquidacionSvc = inject(LiquidacionSesionService);
  private readonly cobroSvc = inject(CobroPacienteService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly loading = signal(true);
  readonly liquidaciones = signal<LiquidacionSesion[]>([]);
  readonly cobros = signal<CobroPaciente[]>([]);

  readonly pacienteId = signal<string>('');

  readonly pendientes = computed(() =>
    this.liquidaciones().filter(
      (l) => (l.estado === 'LIQUIDADA_PARTICULAR' || l.estado === 'LIQUIDADA_MIXTA') && l.importePaciente > 0,
    ),
  );

  readonly saldoPendiente = computed(() =>
    this.pendientes().reduce((acc, l) => acc + (l.importePaciente ?? 0), 0),
  );

  readonly totalCobrado = computed(() =>
    this.cobros()
      .filter((c) => c.estado === 'COBRADO_TOTAL' || c.estado === 'COBRADO')
      .reduce((acc, c) => acc + (c.importeTotal ?? 0), 0),
  );

  constructor() {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.pacienteId.set(pacienteId);

    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      liquidaciones: this.liquidacionSvc.byPaciente(consultorioId, pacienteId).pipe(
        catchError(() => of([] as LiquidacionSesion[])),
      ),
      cobros: this.cobroSvc.byPaciente(consultorioId, pacienteId).pipe(
        catchError(() => of([] as CobroPaciente[])),
      ),
    }).subscribe({
      next: ({ liquidaciones, cobros }) => {
        this.liquidaciones.set(liquidaciones);
        this.cobros.set(cobros.sort((a, b) => new Date(b.fechaCobro ?? 0).getTime() - new Date(a.fechaCobro ?? 0).getTime()));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  irACobrar(): void {
    this.router.navigate(['/app/caja/cobrar'], {
      queryParams: { pacienteId: this.pacienteId() },
    });
  }

  cobrarSesion(liq: LiquidacionSesion): void {
    this.router.navigate(['/app/caja/cobrar'], {
      queryParams: { pacienteId: liq.pacienteId, sesionId: liq.sesionId },
    });
  }

  tipoLabel(liq: LiquidacionSesion): string {
    switch (liq.tipoLiquidacion) {
      case 'PARTICULAR': return 'Particular';
      case 'MIXTA': return 'Mixta (copago)';
      case 'OS': return 'Obra Social';
      default: return liq.tipoLiquidacion ?? '-';
    }
  }

  estadoClass(liq: LiquidacionSesion): string {
    return liq.tipoLiquidacion === 'MIXTA' ? 'badge-warning' : 'badge-pendiente';
  }

  dotClass(liq: LiquidacionSesion): string {
    return liq.tipoLiquidacion === 'MIXTA' ? 'dot-warning' : 'dot-pendiente';
  }

  cobroEstadoLabel(cobro: CobroPaciente): string {
    switch (cobro.estado) {
      case 'COBRADO_TOTAL': case 'COBRADO': return 'Cobrado';
      case 'PARCIAL': return 'Parcial';
      case 'PENDIENTE': return 'Pendiente';
      case 'ANULADO': return 'Anulado';
      default: return cobro.estado ?? '-';
    }
  }

  cobroEstadoClass(cobro: CobroPaciente): string {
    switch (cobro.estado) {
      case 'COBRADO_TOTAL': case 'COBRADO': return 'badge-success';
      case 'PARCIAL': return 'badge-warning';
      case 'ANULADO': return 'badge-anulado';
      default: return 'badge-pendiente';
    }
  }

  cobroDotClass(cobro: CobroPaciente): string {
    switch (cobro.estado) {
      case 'COBRADO_TOTAL': case 'COBRADO': return 'dot-success';
      case 'PARCIAL': return 'dot-warning';
      case 'ANULADO': return 'dot-anulado';
      default: return 'dot-pendiente';
    }
  }
}
