import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SesionService } from '../../services/sesion.service';
import { Session, SESSION_STATUS_LABELS } from '../../models/paciente-360.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

@Component({
  selector: 'app-atenciones-page',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './atenciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="atenciones-page">
      <div class="page-header">
        <h2 class="page-title">Atenciones / Sesiones</h2>
        <button class="btn-add" type="button">+ Nueva atención</button>
      </div>

      @if (loading()) {
        <p class="empty">Cargando atenciones...</p>
      } @else if (items().length === 0) {
        <p class="empty">No hay atenciones registradas.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Profesional</th>
                <th>Consultorio/Box</th>
                <th>Estado</th>
                <th>Resumen</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (s of items(); track s.id) {
                <tr>
                  <td>{{ s.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ s.profesionalNombre }}</td>
                  <td>{{ s.consultorioNombre }}{{ s.boxNombre ? ', ' + s.boxNombre : '' }}</td>
                  <td>
                    <span class="status-chip" [class]="'status-chip--' + s.estado">
                      {{ statusLabel(s.estado) }}
                    </span>
                  </td>
                  <td>{{ s.resumen || '—' }}</td>
                  <td>
                    <button class="link-action" type="button">Ver</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AtencionesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SesionService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly items = signal<Session[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.svc.list(id).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }

  statusLabel(estado: string): string {
    return SESSION_STATUS_LABELS[estado as keyof typeof SESSION_STATUS_LABELS] ?? estado;
  }
}
