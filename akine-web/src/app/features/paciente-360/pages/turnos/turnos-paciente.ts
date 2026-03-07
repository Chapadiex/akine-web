import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360Turnos } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-turnos-paciente-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrl: './turnos-paciente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="turnos-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Turnos</h2>
          <p>Agenda del paciente con split entre proximos e historicos.</p>
        </div>
        <button
          type="button"
          class="btn-filters-toggle"
          [class.btn-filters-toggle-active]="filtersOpen()"
          [attr.aria-expanded]="filtersOpen()"
          aria-controls="turnos-filters"
          aria-label="Mostrar u ocultar filtros de turnos"
          (click)="toggleFilters()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          </svg>
        </button>
      </header>

      <div class="summary-strip">
        <article class="summary-card">
          <span class="summary-label">Proximos</span>
          <strong>{{ data()?.proximosCount ?? 0 }}</strong>
        </article>
        <article class="summary-card">
          <span class="summary-label">Historicos</span>
          <strong>{{ data()?.historicosCount ?? 0 }}</strong>
        </article>
        <article class="summary-card">
          <span class="summary-label">Cancelados / ausentes</span>
          <strong>{{ data()?.canceladosCount ?? 0 }}</strong>
        </article>
      </div>

      @if (filtersOpen()) {
        <section id="turnos-filters" class="filters-card">
          <div class="scope-tabs">
            <button type="button" [class.scope-tab-active]="scope === 'PROXIMOS'" (click)="setScope('PROXIMOS')">Proximos</button>
            <button type="button" [class.scope-tab-active]="scope === 'HISTORICOS'" (click)="setScope('HISTORICOS')">Historicos</button>
          </div>

          <label>
            Profesional
            <select [(ngModel)]="profesionalId">
              <option value="">Todos</option>
              @for (prof of data()?.profesionales ?? []; track prof.id) {
                <option [value]="prof.id">{{ prof.nombre }}</option>
              }
            </select>
          </label>

          <label>
            Estado
            <input type="text" [(ngModel)]="estado" placeholder="Programado, Cancelado..." />
          </label>

          <button class="btn-filter" type="button" (click)="load()">Aplicar</button>
        </section>
      }

      @if (loading()) {
        <p class="loading-msg">Cargando turnos...</p>
      } @else if ((data()?.items?.length ?? 0) === 0) {
        <div class="state-empty">
          <p>No hay turnos para el filtro actual.</p>
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Profesional</th>
                <th>Box</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              @for (item of data()!.items; track item.id) {
                <tr>
                  <td>{{ item.fechaHoraInicio | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ item.profesionalNombre || '-' }}</td>
                  <td>{{ item.boxNombre || '-' }}</td>
                  <td>{{ item.estado }}</td>
                  <td>{{ item.tipoConsulta || '-' }}</td>
                  <td>{{ item.motivoConsulta || '-' }}</td>
                  <td>{{ item.alerta || '-' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class TurnosPacientePage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly data = signal<Patient360Turnos | null>(null);
  readonly loading = signal(true);
  readonly filtersOpen = signal(false);
  scope: 'PROXIMOS' | 'HISTORICOS' = 'PROXIMOS';
  profesionalId = '';
  estado = '';

  constructor() {
    this.load();
  }

  toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  setScope(scope: 'PROXIMOS' | 'HISTORICOS'): void {
    this.scope = scope;
    this.load();
  }

  load(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.svc.getTurnos(consultorioId, pacienteId, {
      scope: this.scope,
      profesionalId: this.profesionalId || undefined,
      estado: this.estado || undefined,
    }).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }
}
