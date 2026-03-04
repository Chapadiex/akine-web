import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import {
  ClinicalEvent,
  CLINICAL_EVENT_TYPE_COLORS,
  CLINICAL_EVENT_TYPE_LABELS,
  ClinicalEventType,
} from '../../models/paciente-360.models';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';

@Component({
  selector: 'app-historia-clinica-page',
  standalone: true,
  imports: [DatePipe],
  styleUrl: './historia-clinica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hc-page">
      <div class="filters">
        <span class="filter-label">Filtros:</span>
        <button class="filter-btn" type="button">Último mes</button>
        <button class="filter-btn" type="button">Todos los profesionales</button>
        <button class="filter-btn" type="button">Todos los tipos</button>
        <button class="btn-add" type="button">+ Agregar nota</button>
      </div>

      @if (loading()) {
        <p class="empty">Cargando historia clínica...</p>
      } @else if (events().length === 0) {
        <p class="empty">No hay registros en la historia clínica.</p>
      } @else {
        <div class="timeline">
          @for (ev of events(); track ev.id) {
            <div class="event">
              <div class="event-date">
                <div class="event-date__day">{{ ev.fecha | date:'dd MMM yyyy' }}</div>
                <div class="event-date__time">{{ ev.fecha | date:'HH:mm' }}</div>
              </div>
              <div class="event-dot">
                <span class="event-dot__circle" [style.background]="getColor(ev.tipo).bg"></span>
              </div>
              <div class="event-content">
                <div class="event-meta">
                  <span class="event-type-chip"
                    [style.background]="getColor(ev.tipo).bg"
                    [style.color]="getColor(ev.tipo).text">
                    {{ getLabel(ev.tipo) }}
                  </span>
                  <span class="event-prof">{{ ev.profesionalNombre }}</span>
                </div>
                <p class="event-summary">{{ ev.resumen }}</p>
                @if (ev.adjuntos.length > 0) {
                  <div class="event-attachments">📎 {{ ev.adjuntos.length }} adjunto{{ ev.adjuntos.length > 1 ? 's' : '' }}</div>
                }
                <button class="event-link" type="button" (click)="openDetail(ev)">Ver detalle →</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (selectedEvent()) {
      <div class="overlay" (click)="selectedEvent.set(null)">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h3>Detalle del evento</h3>
            <button class="drawer-close" (click)="selectedEvent.set(null)">✕</button>
          </div>
          <div class="drawer-body">
            <div class="event-meta" style="margin-bottom:.75rem">
              <span class="event-type-chip"
                [style.background]="getColor(selectedEvent()!.tipo).bg"
                [style.color]="getColor(selectedEvent()!.tipo).text">
                {{ getLabel(selectedEvent()!.tipo) }}
              </span>
              <span class="event-prof">{{ selectedEvent()!.profesionalNombre }}</span>
              <span class="event-prof">{{ selectedEvent()!.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <p style="font-size:.9rem;line-height:1.6;color:var(--text)">{{ selectedEvent()!.detalle }}</p>
            @if (selectedEvent()!.adjuntos.length > 0) {
              <h4 style="margin-top:1rem;font-size:.85rem;font-weight:600">Adjuntos</h4>
              @for (adj of selectedEvent()!.adjuntos; track adj.id) {
                <div style="padding:.5rem 0;font-size:.82rem;color:var(--primary)">📎 {{ adj.nombre }}</div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgb(0 0 0 / .35);
      display: flex; justify-content: flex-end; z-index: 900;
    }
    .drawer {
      width: min(540px, 95vw); background: var(--white);
      height: 100vh; overflow-y: auto; box-shadow: var(--shadow-lg);
    }
    .drawer-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
    }
    .drawer-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    .drawer-close {
      background: none; border: none; font-size: 1.2rem; cursor: pointer;
      color: var(--text-muted); padding: 0.25rem;
    }
    .drawer-body { padding: 1.5rem; }
  `],
})
export class HistoriaClinicaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(HistoriaClinicaService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly events = signal<ClinicalEvent[]>([]);
  readonly loading = signal(true);
  readonly selectedEvent = signal<ClinicalEvent | null>(null);

  ngOnInit(): void {
    const id = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    this.svc.list(id).subscribe({
      next: (items) => { this.events.set(items); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(this.errMap.toMessage(err)); },
    });
  }

  getColor(tipo: ClinicalEventType): { bg: string; text: string } {
    return CLINICAL_EVENT_TYPE_COLORS[tipo];
  }

  getLabel(tipo: ClinicalEventType): string {
    return CLINICAL_EVENT_TYPE_LABELS[tipo];
  }

  openDetail(event: ClinicalEvent): void {
    this.selectedEvent.set(event);
  }
}
