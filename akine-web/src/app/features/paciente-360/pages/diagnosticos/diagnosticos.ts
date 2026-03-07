import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360Diagnosticos } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-diagnosticos-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrl: './diagnosticos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="diagnosticos-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Diagnosticos</h2>
          <p>Seguimiento de diagnosticos activos y resueltos vinculados al paciente.</p>
        </div>
        <button
          type="button"
          class="btn-filters-toggle"
          [class.btn-filters-toggle-active]="filtersOpen()"
          [attr.aria-expanded]="filtersOpen()"
          aria-controls="diagnosticos-filters"
          aria-label="Mostrar u ocultar filtros de diagnosticos"
          (click)="toggleFilters()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          </svg>
        </button>
      </header>

      <div class="summary-strip">
        <article class="summary-card">
          <span class="summary-label">Activos</span>
          <strong>{{ data()?.totalActivos ?? 0 }}</strong>
        </article>
        <article class="summary-card">
          <span class="summary-label">Ultimo registro</span>
          <strong>{{ data()?.ultimaFechaRegistrada ? (data()!.ultimaFechaRegistrada | date:'dd/MM/yyyy') : 'Sin registros' }}</strong>
        </article>
      </div>

      @if (filtersOpen()) {
        <section id="diagnosticos-filters" class="filters-card">
          <label>
            Estado
            <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
              <option value="">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="RESUELTO">Resueltos</option>
            </select>
          </label>
        </section>
      }

      @if (loading()) {
        <p class="loading-msg">Cargando diagnosticos...</p>
      } @else if ((filteredItems()).length === 0) {
        <div class="state-empty">
          <p>No hay diagnosticos cargados para este paciente.</p>
        </div>
      } @else {
        <div class="cards-grid">
          @for (item of filteredItems(); track item.id) {
            <article class="diag-card">
              <div class="diag-head">
                <span class="diag-status">{{ item.estado }}</span>
                <strong>{{ item.nombre }}</strong>
              </div>
              <dl class="diag-grid">
                <div>
                  <dt>Inicio</dt>
                  <dd>{{ item.fechaInicio ? (item.fechaInicio | date:'dd/MM/yyyy') : '-' }}</dd>
                </div>
                <div>
                  <dt>Profesional</dt>
                  <dd>{{ item.profesionalNombre || '-' }}</dd>
                </div>
                <div>
                  <dt>Fin</dt>
                  <dd>{{ item.fechaFin ? (item.fechaFin | date:'dd/MM/yyyy') : '-' }}</dd>
                </div>
                <div>
                  <dt>Ultima atencion</dt>
                  <dd>{{ item.ultimaAtencionResumen || '-' }}</dd>
                </div>
              </dl>
              @if (item.notas) {
                <p class="diag-notes">{{ item.notas }}</p>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class DiagnosticosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly data = signal<Patient360Diagnosticos | null>(null);
  readonly loading = signal(true);
  readonly filteredItems = signal<Patient360Diagnosticos['items']>([]);
  readonly filtersOpen = signal(false);
  statusFilter = '';

  constructor() {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    this.svc.getDiagnosticos(consultorioId, pacienteId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  applyFilter(): void {
    const items = this.data()?.items ?? [];
    this.filteredItems.set(
      this.statusFilter ? items.filter((item) => item.estado === this.statusFilter) : items,
    );
  }
}
