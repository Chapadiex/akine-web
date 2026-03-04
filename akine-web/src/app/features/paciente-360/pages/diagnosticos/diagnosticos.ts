import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DiagnosticoService } from '../../services/diagnostico.service';
import { Diagnosis, DIAGNOSIS_STATUS_LABELS } from '../../models/paciente-360.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

@Component({
  selector: 'app-diagnosticos-page',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './diagnosticos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="diag-page">
      <div class="page-header">
        <h2 class="page-title">Diagnósticos</h2>
        <button class="btn-add" type="button">+ Agregar diagnóstico</button>
      </div>

      @if (loading()) {
        <p class="empty">Cargando diagnósticos...</p>
      } @else if (items().length === 0) {
        <p class="empty">No hay diagnósticos registrados.</p>
      } @else {
        <div class="diag-list">
          @for (d of items(); track d.id) {
            <div class="diag-card">
              <div class="diag-info">
                <div class="diag-name">{{ d.nombre }}</div>
                <div class="diag-meta">
                  <span>Desde: {{ d.fechaInicio | date:'dd/MM/yyyy' }}</span>
                  @if (d.fechaFin) {
                    <span>Hasta: {{ d.fechaFin | date:'dd/MM/yyyy' }}</span>
                  }
                </div>
                @if (d.notas) {
                  <div class="diag-notes">{{ d.notas }}</div>
                }
              </div>
              <span class="status-chip" [class]="'status-chip--' + d.estado">
                {{ statusLabel(d.estado) }}
              </span>
              <div class="diag-actions">
                @if (d.estado === 'ACTIVO') {
                  <button type="button">Resolver</button>
                }
                <button type="button">Editar</button>
                <button class="btn-danger" type="button">Eliminar</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DiagnosticosPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(DiagnosticoService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly items = signal<Diagnosis[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.svc.list(id).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }

  statusLabel(estado: string): string {
    return DIAGNOSIS_STATUS_LABELS[estado as keyof typeof DIAGNOSIS_STATUS_LABELS] ?? estado;
  }
}
