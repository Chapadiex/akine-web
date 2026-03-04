import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Paciente360Service } from '../../services/paciente-360.service';
import { PatientSummary } from '../../models/paciente-360.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

@Component({
  selector: 'app-resumen-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  styleUrl: './resumen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="resumen">
      @if (loading()) {
        <p style="text-align:center;color:var(--text-muted);margin-top:2rem">Cargando resumen...</p>
      } @else if (summary()) {
        <div class="cards-row">
          <!-- Próximo turno -->
          <div class="card">
            <div class="card__header">
              <span class="card__label">Próximo turno</span>
            </div>
            @if (summary()!.proximoTurnoFecha) {
              <div class="card__value">{{ summary()!.proximoTurnoFecha | date:'EEE dd MMM · HH:mm' }}</div>
              <div class="card__sub">{{ summary()!.proximoTurnoProfesional }}</div>
              <span class="chip-sm" style="background:#DBEAFE;color:#2563EB;">{{ summary()!.proximoTurnoEstado }}</span>
            } @else {
              <div class="empty-card">Sin turnos próximos</div>
            }
          </div>

          <!-- Última atención -->
          <div class="card">
            <div class="card__header">
              <span class="card__label">Última atención</span>
            </div>
            @if (summary()!.ultimaAtencionFecha) {
              <div class="card__value">{{ summary()!.ultimaAtencionFecha | date:'EEE dd MMM · HH:mm' }}</div>
              <div class="card__sub">{{ summary()!.ultimaAtencionProfesional }} — {{ summary()!.ultimaAtencionResumen }}</div>
              <button class="card__link" [routerLink]="['../historia-clinica']">Ver detalle →</button>
            } @else {
              <div class="empty-card">Sin atenciones registradas</div>
            }
          </div>
        </div>

        <div class="bottom-section">
          <!-- Diagnósticos activos -->
          <div class="card">
            <div class="section-header">
              <span class="section-title">Diagnósticos activos</span>
              <a class="section-link" [routerLink]="['../diagnosticos']">Ver todos →</a>
            </div>
            @if (summary()!.diagnosticosActivos.length === 0) {
              <div class="empty-card">Sin diagnósticos activos</div>
            } @else {
              <div class="diag-list">
                @for (d of summary()!.diagnosticosActivos; track d.id) {
                  <div class="diag-item">
                    <span class="diag-dot" style="background:var(--warning)"></span>
                    <span class="diag-name">{{ d.nombre }}</span>
                    <span class="diag-date">Desde {{ d.fechaInicio | date:'MM/yyyy' }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Alertas y CTAs -->
          <div class="card">
            <div class="section-header">
              <span class="section-title">Alertas</span>
            </div>
            <div class="alerts-panel">
              @for (alert of summary()!.alertas; track alert.id) {
                <div class="alert-item" [class]="'alert-item--' + alert.tipo">
                  {{ alert.mensaje }}
                </div>
              }
            </div>
            <div class="cta-section">
              <span class="cta-label">Acciones rápidas</span>
              <button class="cta-btn cta-btn--primary" type="button">Crear turno</button>
              <button class="cta-btn cta-btn--outline" type="button">Registrar atención</button>
              <button class="cta-btn cta-btn--outline" type="button" [routerLink]="['../historia-clinica']">Ver historia clínica</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ResumenPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly summary = signal<PatientSummary | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.svc.getSummary(id).subscribe({
      next: (s) => { this.summary.set(s); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }
}
