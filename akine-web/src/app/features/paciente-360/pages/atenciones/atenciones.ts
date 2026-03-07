import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Patient360Atenciones } from '../../models/paciente-360.models';
import { Paciente360Service } from '../../services/paciente-360.service';

@Component({
  selector: 'app-atenciones-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrl: './atenciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="atenciones-page">
      <header class="page-head">
        <div class="page-head-main">
          <h2>Atenciones</h2>
          <p>Sesiones registradas para el paciente, con profesional, box y resumen operativo.</p>
        </div>
        <button
          type="button"
          class="btn-filters-toggle"
          [class.btn-filters-toggle-active]="filtersOpen()"
          [attr.aria-expanded]="filtersOpen()"
          aria-controls="atenciones-filters"
          aria-label="Mostrar u ocultar filtros de atenciones"
          (click)="toggleFilters()"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
          </svg>
        </button>
      </header>

      <div class="summary-strip">
        <article class="summary-card">
          <span class="summary-label">Total de atenciones</span>
          <strong>{{ data()?.total ?? 0 }}</strong>
        </article>
        <article class="summary-card">
          <span class="summary-label">Ultima asistencia</span>
          <strong>{{ data()?.ultimaAsistencia ? (data()!.ultimaAsistencia | date:'dd/MM/yyyy HH:mm') : 'Sin registros' }}</strong>
        </article>
      </div>

      @if (filtersOpen()) {
        <section id="atenciones-filters" class="filters-card">
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
            Desde
            <input type="date" [(ngModel)]="from" />
          </label>
          <label>
            Hasta
            <input type="date" [(ngModel)]="to" />
          </label>
          <button class="btn-filter" type="button" (click)="load()">Aplicar</button>
        </section>
      }

      @if (loading()) {
        <p class="loading-msg">Cargando atenciones...</p>
      } @else if ((data()?.items?.length ?? 0) === 0) {
        <div class="state-empty">
          <p>No hay atenciones registradas para este paciente.</p>
        </div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Profesional</th>
                <th>Consultorio</th>
                <th>Box</th>
                <th>Estado</th>
                <th>Resumen</th>
              </tr>
            </thead>
            <tbody>
              @for (item of data()!.items; track item.id) {
                <tr>
                  <td>{{ item.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ item.profesionalNombre || '-' }}</td>
                  <td>{{ item.consultorioNombre }}</td>
                  <td>{{ item.boxNombre || '-' }}</td>
                  <td>{{ item.estado }}</td>
                  <td>{{ item.resumen }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class AtencionesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly data = signal<Patient360Atenciones | null>(null);
  readonly loading = signal(true);
  readonly filtersOpen = signal(false);
  profesionalId = '';
  from = '';
  to = '';

  constructor() {
    this.load();
  }

  toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  load(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.route.parent?.snapshot.paramMap.get('patientId') ?? '';
    if (!consultorioId || !pacienteId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.svc.getAtenciones(consultorioId, pacienteId, {
      profesionalId: this.profesionalId || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
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
