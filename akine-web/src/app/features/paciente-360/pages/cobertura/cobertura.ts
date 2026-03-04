import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CoberturaService } from '../../services/cobertura.service';
import { Attachment, Insurance } from '../../models/paciente-360.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

@Component({
  selector: 'app-cobertura-page',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './cobertura.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cobertura-page">
      <h2 class="page-title">Obra Social y Adjuntos</h2>

      @if (loading()) {
        <p class="empty">Cargando...</p>
      } @else {
        <div class="sections">
          <!-- Datos de cobertura -->
          <div class="section-card">
            <div class="section-title">Datos de cobertura</div>
            @if (insurance()?.obraSocialNombre) {
              <div class="info-row">
                <span class="info-label">Obra Social</span>
                <span class="info-value">{{ insurance()!.obraSocialNombre }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Plan</span>
                <span class="info-value">{{ insurance()!.plan }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">N° Afiliado</span>
                <span class="info-value">{{ insurance()!.nroAfiliado }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Vigencia</span>
                <span class="vigente-chip" [class]="'vigente-chip--' + insurance()!.vigente">
                  {{ insurance()!.vigente ? 'Vigente' : 'Vencida' }}
                </span>
              </div>
              @if (insurance()!.fechaVencimiento) {
                <div class="info-row">
                  <span class="info-label">Vence</span>
                  <span class="info-value">{{ insurance()!.fechaVencimiento | date:'dd/MM/yyyy' }}</span>
                </div>
              }
            } @else {
              <p class="empty">Sin obra social registrada.</p>
            }
          </div>

          <!-- Adjuntos administrativos -->
          <div class="section-card">
            <div class="section-title">Adjuntos administrativos</div>
            @if (attachments().length === 0) {
              <p class="empty">Sin adjuntos.</p>
            } @else {
              <div class="attachments-list">
                @for (att of attachments(); track att.id) {
                  <div class="attachment-item">
                    <div>
                      <div class="att-name">📎 {{ att.nombre }}</div>
                      <div class="att-date">{{ att.fechaCarga | date:'dd/MM/yyyy' }}
                        @if (!att.vigente) { · <span style="color:var(--error)">No vigente</span> }
                      </div>
                    </div>
                    <div class="att-actions">
                      <button class="att-btn" type="button">Descargar</button>
                    </div>
                  </div>
                }
              </div>
            }
            <button class="btn-upload" type="button">+ Subir adjunto</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CoberturaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(CoberturaService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly insurance = signal<Insurance | null>(null);
  readonly attachments = signal<Attachment[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.svc.getCobertura(id).subscribe({
      next: (data) => {
        this.insurance.set(data.insurance);
        this.attachments.set(data.attachments);
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }
}
