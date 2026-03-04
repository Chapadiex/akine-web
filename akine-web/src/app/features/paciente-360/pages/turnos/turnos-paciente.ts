import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { Turno, TURNO_ESTADO_LABELS, TurnoEstado } from '../../../turnos/models/turno.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

type FilterMode = 'proximos' | 'historicos' | 'todos';

@Component({
  selector: 'app-turnos-paciente-page',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './turnos-paciente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="turnos-page">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:1rem">
          <h2 class="page-title">Turnos</h2>
          <div class="filter-group">
            <button class="filter-chip" [class.filter-chip--active]="filterMode() === 'proximos'"
              (click)="filterMode.set('proximos')">Próximos</button>
            <button class="filter-chip" [class.filter-chip--active]="filterMode() === 'historicos'"
              (click)="filterMode.set('historicos')">Históricos</button>
            <button class="filter-chip" [class.filter-chip--active]="filterMode() === 'todos'"
              (click)="filterMode.set('todos')">Todos</button>
          </div>
        </div>
        <button class="btn-add" type="button">+ Nuevo turno</button>
      </div>

      @if (loading()) {
        <p class="empty">Cargando turnos...</p>
      } @else if (filteredTurnos().length === 0) {
        <p class="empty">No hay turnos {{ filterMode() === 'proximos' ? 'próximos' : filterMode() === 'historicos' ? 'pasados' : '' }}.</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Profesional</th>
                <th>Consultorio/Box</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (t of filteredTurnos(); track t.id) {
                <tr>
                  <td>
                    <span class="td-date">{{ t.fechaHoraInicio | date:'dd/MM/yyyy' }}</span><br>
                    <span class="td-time">{{ t.fechaHoraInicio | date:'HH:mm' }}</span>
                  </td>
                  <td>{{ t.profesionalNombre }} {{ t.profesionalApellido }}</td>
                  <td>{{ t.boxNombre || '—' }}</td>
                  <td>
                    <span class="status-chip" [class]="'status-chip--' + t.estado">
                      {{ estadoLabel(t.estado) }}
                    </span>
                  </td>
                  <td>
                    <div class="action-links">
                      @if (t.estado === 'CONFIRMADO') {
                        <button class="link-action link-action--primary" type="button">Check-in</button>
                        <button class="link-action link-action--danger" type="button">Cancelar</button>
                      } @else if (t.estado === 'PROGRAMADO') {
                        <button class="link-action link-action--primary" type="button">Reprogramar</button>
                      } @else if (t.estado === 'COMPLETADO') {
                        <button class="link-action link-action--primary" type="button">Ver atención</button>
                      } @else {
                        <span class="link-action link-action--muted">—</span>
                      }
                    </div>
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
export class TurnosPacientePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly allTurnos = signal<Turno[]>([]);
  readonly loading = signal(true);
  readonly filterMode = signal<FilterMode>('proximos');

  readonly filteredTurnos = computed(() => {
    const now = new Date();
    const all = this.allTurnos();
    switch (this.filterMode()) {
      case 'proximos':
        return all.filter(t => new Date(t.fechaHoraInicio) >= now && t.estado !== 'CANCELADO');
      case 'historicos':
        return all.filter(t => new Date(t.fechaHoraInicio) < now || t.estado === 'CANCELADO');
      default:
        return all;
    }
  });

  ngOnInit(): void {
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.http.get<Turno[]>('/assets/mocks/turnos-paciente.json').pipe(
      map(items => items
        .filter(t => t.pacienteId === pacienteId)
        .sort((a, b) => new Date(b.fechaHoraInicio).getTime() - new Date(a.fechaHoraInicio).getTime()),
      ),
    ).subscribe({
      next: (data) => { this.allTurnos.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }

  estadoLabel(estado: TurnoEstado): string {
    return TURNO_ESTADO_LABELS[estado] ?? estado;
  }
}
