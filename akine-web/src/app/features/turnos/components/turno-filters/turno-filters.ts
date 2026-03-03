import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioService } from '../../../consultorios/services/consultorio.service';
import { AsignacionService } from '../../../consultorios/services/asignacion.service';
import { BoxService } from '../../../consultorios/services/box.service';
import { Consultorio, Box } from '../../../consultorios/models/consultorio.models';
import { ProfesionalAsignado } from '../../../consultorios/models/agenda.models';
import { TurnoEstado, TURNO_ESTADO_LABELS } from '../../models/turno.models';

export interface TurnoFilterValues {
  consultorioId: string;
  profesionalId?: string;
  boxId?: string;
  estado?: TurnoEstado;
}

@Component({
  selector: 'app-turno-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters-bar">
      <select [ngModel]="selectedConsultorioId()" (ngModelChange)="onConsultorioChange($event)">
        @for (c of consultorios(); track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }
      </select>

      <select [ngModel]="selectedProfesionalId()" (ngModelChange)="onFilterChange('profesional', $event)">
        <option value="">Todos los profesionales</option>
        @for (p of profesionales(); track p.profesionalId) {
          <option [value]="p.profesionalId">{{ p.profesionalNombre }} {{ p.profesionalApellido }}</option>
        }
      </select>

      <select [ngModel]="selectedBoxId()" (ngModelChange)="onFilterChange('box', $event)">
        <option value="">Todos los boxes</option>
        @for (b of boxes(); track b.id) {
          <option [value]="b.id">{{ b.nombre }}</option>
        }
      </select>

      <select [ngModel]="selectedEstado()" (ngModelChange)="onFilterChange('estado', $event)">
        <option value="">Todos los estados</option>
        @for (e of estadoOptions; track e.key) {
          <option [value]="e.key">{{ e.label }}</option>
        }
      </select>
    </div>
  `,
  styles: [`
    .filters-bar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }
    select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.85rem;
      background: var(--white);
      min-width: 160px;
    }
  `],
})
export class TurnoFilters implements OnInit {
  private auth = inject(AuthService);
  private consultorioSvc = inject(ConsultorioService);
  private asignacionSvc = inject(AsignacionService);
  private boxSvc = inject(BoxService);

  initialConsultorioId = input<string>('');
  filtersChanged = output<TurnoFilterValues>();

  consultorios = signal<Consultorio[]>([]);
  profesionales = signal<ProfesionalAsignado[]>([]);
  boxes = signal<Box[]>([]);

  selectedConsultorioId = signal('');
  selectedProfesionalId = signal('');
  selectedBoxId = signal('');
  selectedEstado = signal('');

  estadoOptions: { key: TurnoEstado; label: string }[] = [
    { key: 'PROGRAMADO', label: TURNO_ESTADO_LABELS.PROGRAMADO },
    { key: 'CONFIRMADO', label: TURNO_ESTADO_LABELS.CONFIRMADO },
    { key: 'EN_ESPERA', label: TURNO_ESTADO_LABELS.EN_ESPERA },
    { key: 'EN_CURSO', label: TURNO_ESTADO_LABELS.EN_CURSO },
    { key: 'COMPLETADO', label: TURNO_ESTADO_LABELS.COMPLETADO },
    { key: 'CANCELADO', label: TURNO_ESTADO_LABELS.CANCELADO },
    { key: 'AUSENTE', label: TURNO_ESTADO_LABELS.AUSENTE },
  ];

  ngOnInit(): void {
    this.loadConsultorios();
  }

  private loadConsultorios(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.consultorioSvc.list().subscribe({
      next: (all) => {
        const mine = all.filter((c) => user.consultorioIds.includes(c.id));
        this.consultorios.set(mine);
        const initial = this.initialConsultorioId() || (mine.length > 0 ? mine[0].id : '');
        if (initial) {
          this.selectedConsultorioId.set(initial);
          this.loadSubData(initial);
          this.emit();
        }
      },
    });
  }

  onConsultorioChange(id: string): void {
    this.selectedConsultorioId.set(id);
    this.selectedProfesionalId.set('');
    this.selectedBoxId.set('');
    this.loadSubData(id);
    this.emit();
  }

  onFilterChange(type: string, value: string): void {
    if (type === 'profesional') this.selectedProfesionalId.set(value);
    if (type === 'box') this.selectedBoxId.set(value);
    if (type === 'estado') this.selectedEstado.set(value);
    this.emit();
  }

  private loadSubData(cid: string): void {
    this.asignacionSvc.list(cid).subscribe({
      next: (p) => this.profesionales.set(p),
    });
    this.boxSvc.list(cid).subscribe({
      next: (b) => this.boxes.set(b.filter((x) => x.activo)),
    });
  }

  private emit(): void {
    const val: TurnoFilterValues = {
      consultorioId: this.selectedConsultorioId(),
    };
    if (this.selectedProfesionalId()) val.profesionalId = this.selectedProfesionalId();
    if (this.selectedBoxId()) val.boxId = this.selectedBoxId();
    if (this.selectedEstado()) val.estado = this.selectedEstado() as TurnoEstado;
    this.filtersChanged.emit(val);
  }
}
