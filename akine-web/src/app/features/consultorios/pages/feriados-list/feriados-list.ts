import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { FeriadoService } from '../../services/feriado.service';
import { Feriado } from '../../../turnos/models/turno.models';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-feriados-list',
  standalone: true,
  imports: [FormsModule, ConfirmDialog, PageSectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="section">
      <app-page-section-header
        title="Feriados y cierres"
        [description]="headerDescription()"
        titleLevel="h3"
      >
        <button
          header-actions
          class="btn-icon"
          type="button"
          aria-label="Mostrar u ocultar filtros"
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
        <button header-actions class="btn-primary" type="button" (click)="openForm()">+ Agregar feriado</button>
      </app-page-section-header>

      @if (filtersExpanded()) {
        <div class="filters-panel">
          <div class="year-filter">
            <label for="feriados-year">Año</label>
            <select id="feriados-year" [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)">
              @for (y of years; track y) {
                <option [value]="y">{{ y }}</option>
              }
            </select>
          </div>
          <button class="btn-secondary" type="button" (click)="syncNacionales()" [disabled]="syncing()">
            {{ syncing() ? 'Sincronizando...' : 'Importar nacionales' }}
          </button>
        </div>
      }

      @if (feriados().length === 0) {
        <p class="empty-msg">No hay feriados para este a&ntilde;o.</p>
      } @else {
        <table class="data-table app-data-table">
          <thead>
            <tr>
              <th class="col-text-short">Fecha</th>
              <th class="col-text">Descripción</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (f of feriados(); track f.id) {
              <tr>
                <td class="col-text-short">{{ formatDate(f.fecha) }}</td>
                <td class="col-text">{{ f.descripcion || '-' }}</td>
                <td class="col-actions">
                  <button class="table-row-action table-row-action--danger" (click)="askDelete(f)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (showForm()) {
      <div class="overlay" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h4>Agregar feriado</h4>
          <div class="form-row">
            <div class="field">
              <label>Fecha *</label>
              <input type="date" [(ngModel)]="newFecha" />
            </div>
            <div class="field">
              <label>Descripci&oacute;n</label>
              <input type="text" [(ngModel)]="newDescripcion" placeholder="Descripci&oacute;n (opcional)" maxlength="200" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeForm()">Cancelar</button>
            <button class="btn-primary" (click)="addFeriado()" [disabled]="!newFecha">Guardar</button>
          </div>
        </div>
      </div>
    }

    @if (deleteTarget(); as target) {
      <app-confirm-dialog
        title="Eliminar feriado"
        [message]="'¿Eliminar el feriado del ' + formatDate(target.fecha) + '?'"
        (confirmed)="confirmDelete()"
        (cancelled)="deleteTarget.set(null)"
      />
    }
  `,
  styles: [`
    .section {
      padding: 0;
      display: grid;
      gap: 1rem;
    }
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
    .filters-panel {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: .75rem;
      flex-wrap: wrap;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg, 16px) - 2px);
      background: color-mix(in srgb, var(--white) 92%, var(--bg));
    }
    .year-filter {
      display: grid;
      gap: .35rem;
      min-width: 180px;
      label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
      select {
        min-height: 2.5rem;
        padding: 0 .68rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.86rem;
        background: var(--white);
      }
    }
    .form-row { display: grid; grid-template-columns: 220px 1fr; gap: .75rem; }
    .field { display: flex; flex-direction: column; gap: .35rem; }
    .field label { font-size: .83rem; font-weight: 600; color: var(--text-muted); }
    .field input {
      height: 38px;
      padding: 0 .68rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.86rem;
    }
    .btn-primary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--white);
      cursor: pointer;
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
    }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel {
      padding: 0.4rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white); cursor: pointer; font-size: 0.85rem;
    }
    .data-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: 0.5rem 0.75rem; text-align: left; font-size: 0.85rem; }
      th {
        font-weight: 700;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: .05em;
        color: var(--text-muted);
        border-bottom: 2px solid var(--border);
      }
      td { border-bottom: 1px solid var(--border); }
    }
    .btn-sm {
      padding: 0.25rem 0.5rem; border: none; border-radius: var(--radius);
      font-size: 0.75rem; font-weight: 600; cursor: pointer;
    }
    .btn-danger { background: var(--error-bg, #fef2f2); color: var(--error, #dc2626); }
    .btn-danger:hover { opacity: 0.85; }
    .empty-msg { color: var(--text-muted); font-size: 0.85rem; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / 0.35);
      display: grid;
      place-items: center;
      z-index: 950;
    }
    .modal {
      width: min(640px, 92vw);
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      padding: 1rem;
    }
    .modal h4 {
      margin: 0 0 .8rem;
      font-size: 1rem;
      font-weight: 700;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: .5rem;
      margin-top: .9rem;
    }
    @media (max-width: 760px) {
      .form-row { grid-template-columns: 1fr; }
    }
  `],
})
export class FeriadosListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private feriadoSvc = inject(FeriadoService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  private consultorioId = '';
  feriados = signal<Feriado[]>([]);
  selectedYear = signal(new Date().getFullYear());
  filtersExpanded = signal(false);
  showForm = signal(false);
  syncing = signal(false);
  newFecha = '';
  newDescripcion = '';
  deleteTarget = signal<Feriado | null>(null);

  currentYear = new Date().getFullYear();
  years = [this.currentYear - 1, this.currentYear, this.currentYear + 1];
  headerDescription = () => {
    const count = this.feriados().length;
    return `${count} ${count === 1 ? 'feriado cargado' : 'feriados cargados'} para ${this.selectedYear()}.`;
  };

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.loadFeriados();
  }

  onYearChange(year: number): void {
    this.selectedYear.set(Number(year));
    this.loadFeriados();
  }

  private loadFeriados(): void {
    if (!this.consultorioId) return;
    this.feriadoSvc.list(this.consultorioId, this.selectedYear()).subscribe({
      next: (data) => this.feriados.set(data),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  addFeriado(): void {
    if (!this.newFecha) return;
    this.feriadoSvc.create(this.consultorioId, {
      fecha: this.newFecha,
      descripcion: this.newDescripcion || undefined,
    }).subscribe({
      next: () => {
        this.toast.success('Feriado agregado');
        this.closeForm();
        this.loadFeriados();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  askDelete(f: Feriado): void {
    this.deleteTarget.set(f);
  }

  openForm(): void {
    this.showForm.set(true);
  }

  toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.newFecha = '';
    this.newDescripcion = '';
  }

  syncNacionales(): void {
    if (!this.consultorioId || this.syncing()) return;
    this.syncing.set(true);
    this.feriadoSvc.syncNacionalesCompat(this.consultorioId, this.selectedYear()).subscribe({
      next: (result) => {
        this.toast.success(`Sincronizados ${result.created} feriados nacionales`);
        this.loadFeriados();
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.syncing.set(false);
      },
      complete: () => this.syncing.set(false),
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteTarget.set(null);

    this.feriadoSvc.delete(this.consultorioId, target.id).subscribe({
      next: () => {
        this.toast.success('Feriado eliminado');
        this.loadFeriados();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
}
