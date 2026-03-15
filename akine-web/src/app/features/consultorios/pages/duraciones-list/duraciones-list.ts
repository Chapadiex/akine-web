import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioDuracion } from '../../models/agenda.models';
import { ConsultorioCompletenessRefreshService } from '../../services/consultorio-completeness-refresh.service';
import { DuracionService } from '../../services/duracion.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-duraciones-list',
  standalone: true,
  imports: [FormsModule, PageSectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-section-header
        title="Intervalo de turnos"
        [description]="headerDescription()"
        titleLevel="h3"
      >
        <button
          header-actions
          class="btn-icon"
          type="button"
          aria-label="Mostrar u ocultar opciones de intervalo"
          [attr.aria-expanded]="filtersExpanded()"
          (click)="toggleFilters()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button header-actions class="btn-primary" type="button" (click)="add()">+ Agregar intervalo</button>
      </app-page-section-header>

      @if (filtersExpanded()) {
        <div class="controls-panel">
          <label class="field">
            <span>Duración del nuevo intervalo</span>
            <input type="number" [(ngModel)]="nuevoMinutos" min="15" step="5" />
          </label>
        </div>
      }

      <div class="chips">
        @for (d of items(); track d.id) {
          <button class="chip" type="button" (click)="remove(d.minutos)">{{ d.minutos }} min x</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { display: grid; gap: 1rem; }
    .btn-icon {
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
      cursor: pointer;
      transition: border-color .18s ease, background-color .18s ease, color .18s ease;
    }
    .btn-icon[aria-expanded='true'] {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, white);
      color: var(--primary);
    }
    .controls-panel {
      display: flex;
      align-items: end;
      gap: .75rem;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg, 16px) - 2px);
      background: color-mix(in srgb, var(--white) 92%, var(--bg));
    }
    .field {
      display: grid;
      gap: .35rem;
      max-width: 220px;
    }
    .field span {
      font-size: .8rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    input {
      width: 100%;
      min-height: 2.5rem;
      padding: .45rem .55rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
    }
    .btn-primary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      background: var(--primary);
      color: #fff;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      font-weight: 600;
      cursor: pointer;
      font-size: .875rem;
      white-space: nowrap;
    }
    .chips { display: flex; gap: .5rem; flex-wrap: wrap; }
    .chip { padding: .35rem .8rem; border: 1px solid var(--border); border-radius: 999px; background: var(--white); cursor: pointer; }
  `],
})
export class DuracionesListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(DuracionService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private completenessRefresh = inject(ConsultorioCompletenessRefreshService);

  items = signal<ConsultorioDuracion[]>([]);
  filtersExpanded = signal(false);
  intervalsConfiguredLabel = computed(() => {
    const count = this.items().length;
    return `${count} ${count === 1 ? 'intervalo configurado' : 'intervalos configurados'}`;
  });
  headerDescription = computed(
    () => `${this.intervalsConfiguredLabel()} para la agenda del consultorio.`,
  );
  nuevoMinutos = 30;
  private consultorioId = '';

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.load();
  }

  add(): void {
    this.svc.add(this.consultorioId, this.nuevoMinutos).subscribe({
      next: () => { this.toast.success('Intervalo agregado'); this.load(); this.completenessRefresh.notify(this.consultorioId); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  remove(minutos: number): void {
    this.svc.remove(this.consultorioId, minutos).subscribe({
      next: () => { this.toast.success('Intervalo eliminado'); this.load(); this.completenessRefresh.notify(this.consultorioId); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private load(): void {
    this.svc.list(this.consultorioId).subscribe({
      next: (data) => this.items.set(data),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
