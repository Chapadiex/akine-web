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
import { FeriadoService } from '../../services/feriado.service';
import { Feriado } from '../../../turnos/models/turno.models';

@Component({
  selector: 'app-feriados-list',
  standalone: true,
  imports: [FormsModule, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="section">
      <div class="section-header">
        <h3>Feriados</h3>
        <div class="year-filter">
          <label>A&ntilde;o:</label>
          <select [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)">
            @for (y of years; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        </div>
      </div>

      @if (showForm()) {
        <div class="form-row">
          <input type="date" [(ngModel)]="newFecha" />
          <input type="text" [(ngModel)]="newDescripcion" placeholder="Descripci&oacute;n (opcional)" maxlength="200" />
          <button class="btn-primary" (click)="addFeriado()" [disabled]="!newFecha">Agregar</button>
          <button class="btn-cancel" (click)="showForm.set(false)">Cancelar</button>
        </div>
      } @else {
        <button class="btn-add" (click)="showForm.set(true)">+ Agregar feriado</button>
      }

      @if (feriados().length === 0) {
        <p class="empty-msg">No hay feriados para este a&ntilde;o.</p>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripci&oacute;n</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (f of feriados(); track f.id) {
              <tr>
                <td>{{ formatDate(f.fecha) }}</td>
                <td>{{ f.descripcion || '-' }}</td>
                <td>
                  <button class="btn-sm btn-danger" (click)="askDelete(f)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

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
    .section { padding: 0; }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1rem;
      h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
    }
    .year-filter {
      display: flex; gap: 0.5rem; align-items: center;
      label { font-size: 0.85rem; font-weight: 600; }
      select {
        padding: 0.35rem 0.5rem; border: 1px solid var(--border);
        border-radius: var(--radius); font-size: 0.85rem;
      }
    }
    .form-row {
      display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;
      input {
        padding: 0.4rem 0.6rem; border: 1px solid var(--border);
        border-radius: var(--radius); font-size: 0.85rem;
      }
      input[type="text"] { flex: 1; min-width: 150px; }
    }
    .btn-add {
      background: none; border: 1px dashed var(--border); border-radius: var(--radius);
      padding: 0.5rem 1rem; cursor: pointer; color: var(--primary); font-weight: 600;
      font-size: 0.85rem; margin-bottom: 1rem;
    }
    .btn-add:hover { background: var(--bg, #f9fafb); }
    .btn-primary {
      padding: 0.4rem 0.75rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; cursor: pointer; font-size: 0.85rem; font-weight: 600;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel {
      padding: 0.4rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white); cursor: pointer; font-size: 0.85rem;
    }
    .data-table {
      width: 100%; border-collapse: collapse;
      th, td { padding: 0.5rem 0.75rem; text-align: left; font-size: 0.85rem; }
      th { font-weight: 600; color: var(--text-muted); border-bottom: 2px solid var(--border); }
      td { border-bottom: 1px solid var(--border); }
    }
    .btn-sm {
      padding: 0.25rem 0.5rem; border: none; border-radius: var(--radius);
      font-size: 0.75rem; font-weight: 600; cursor: pointer;
    }
    .btn-danger { background: var(--error-bg, #fef2f2); color: var(--error, #dc2626); }
    .btn-danger:hover { opacity: 0.85; }
    .empty-msg { color: var(--text-muted); font-size: 0.85rem; }
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
  showForm = signal(false);
  newFecha = '';
  newDescripcion = '';
  deleteTarget = signal<Feriado | null>(null);

  currentYear = new Date().getFullYear();
  years = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  ngOnInit(): void {
    this.consultorioId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
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
        this.showForm.set(false);
        this.newFecha = '';
        this.newDescripcion = '';
        this.loadFeriados();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  askDelete(f: Feriado): void {
    this.deleteTarget.set(f);
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
