import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360ClinicalEvent, Patient360HistoriaClinica } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-historia-clinica-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  styleUrl: './historia-clinica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="history-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Historia Clinica</h2>
          <p>Timeline clinico descendente con filtros por tipo, profesional y rango.</p>
        </div>
        <div class="page-head-actions">
          <a
            class="btn-filters-toggle btn-filters-link"
            [routerLink]="['/app/historia-clinica']"
            [queryParams]="workspaceQueryParams()"
            aria-label="Abrir workspace global de historia clinica"
          >
            Global
          </a>
          <button
            type="button"
            class="btn-filters-toggle"
            [class.btn-filters-toggle-active]="filtersOpen()"
            [attr.aria-expanded]="filtersOpen()"
            aria-controls="historia-filters"
            aria-label="Mostrar u ocultar filtros de historia clinica"
            (click)="toggleFilters()"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      @if (filtersOpen()) {
        <section id="historia-filters" class="filters-card">
          <label>
            Tipo
            <select [(ngModel)]="filters.tipo">
              <option value="">Todos</option>
              <option value="SESION">Sesion</option>
            </select>
          </label>

          <label>
            Profesional
            <select [(ngModel)]="filters.profesionalId">
              <option value="">Todos</option>
              @for (prof of data()?.profesionales ?? []; track prof.id) {
                <option [value]="prof.id">{{ prof.nombre }}</option>
              }
            </select>
          </label>

          <label>
            Desde
            <input type="date" [(ngModel)]="filters.from" />
          </label>

          <label>
            Hasta
            <input type="date" [(ngModel)]="filters.to" />
          </label>

          <button type="button" class="btn-filter" (click)="load()">Aplicar</button>
        </section>
      }

      @if (loading()) {
        <p class="loading-msg">Cargando historia clinica...</p>
      } @else if (data()?.items?.length) {
        <div class="content-grid">
          <div class="timeline">
            @for (item of data()!.items; track item.id) {
              <button class="timeline-item" type="button" (click)="selected.set(item)">
                <span class="timeline-date">{{ item.fecha | date:'dd MMM yyyy · HH:mm' }}</span>
                <div class="timeline-copy">
                  <strong>{{ item.resumen }}</strong>
                  <p>{{ item.profesionalNombre || 'Profesional sin identificar' }} · {{ item.tipo }}</p>
                </div>
              </button>
            }
          </div>

          <aside class="detail-card">
            @if (selected(); as current) {
              <span class="detail-tag">{{ current.tipo }}</span>
              <h3>{{ current.resumen }}</h3>
              <p class="detail-meta">{{ current.fecha | date:'dd/MM/yyyy HH:mm' }} · {{ current.profesionalNombre || 'Sin profesional' }}</p>
              <p class="detail-body">{{ current.detalle }}</p>
              <dl class="detail-grid">
                <div>
                  <dt>Turno vinculado</dt>
                  <dd>{{ current.turnoId || '-' }}</dd>
                </div>
                <div>
                  <dt>Ultima modificacion</dt>
                  <dd>{{ current.ultimaModificacion ? (current.ultimaModificacion | date:'dd/MM/yyyy HH:mm') : '-' }}</dd>
                </div>
              </dl>
            } @else {
              <div class="state-empty">
                <p>Selecciona un evento de la timeline para ver el detalle completo.</p>
              </div>
            }
          </aside>
        </div>
      } @else {
        <div class="state-empty">
          <p>No hay eventos clinicos para los filtros seleccionados.</p>
        </div>
      }
    </section>
  `,
})
export class HistoriaClinicaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly data = signal<Patient360HistoriaClinica | null>(null);
  readonly selected = signal<Patient360ClinicalEvent | null>(null);
  readonly loading = signal(true);
  readonly filtersOpen = signal(false);
  readonly filters = {
    tipo: '',
    profesionalId: '',
    from: '',
    to: '',
  };

  constructor() {
    this.load();
  }

  toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  workspaceQueryParams(): Record<string, string> {
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    return {
      ...(pacienteId ? { pacienteId } : {}),
      ...(this.filters.profesionalId ? { profesionalId: this.filters.profesionalId } : {}),
      ...(this.filters.from ? { from: this.filters.from } : {}),
      ...(this.filters.to ? { to: this.filters.to } : {}),
    };
  }

  load(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.svc.getHistoriaClinica(consultorioId, pacienteId, {
      tipo: this.filters.tipo || undefined,
      profesionalId: this.filters.profesionalId || undefined,
      from: this.filters.from || undefined,
      to: this.filters.to || undefined,
    }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.selected.set(data.items[0] ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }
}
