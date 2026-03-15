import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Profesional } from '../../models/consultorio.models';
import { ProfesionalAsignado } from '../../models/agenda.models';
import { AsignacionService } from '../../services/asignacion.service';
import { ConsultorioCompletenessRefreshService } from '../../services/consultorio-completeness-refresh.service';
import { ProfesionalService } from '../../services/profesional.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-asignaciones-list',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-header">
      <span class="sub-count">{{ items().length }} cobertura(s) configurada(s)</span>
      <div class="controls">
        <select [(ngModel)]="selectedProfesionalId">
          <option [ngValue]="''">Seleccionar profesional</option>
          @for (p of profesionales(); track p.id) {
            <option [ngValue]="p.id">{{ p.nombre }} {{ p.apellido }}</option>
          }
        </select>
        <button class="btn-primary" (click)="asignar()" [disabled]="!selectedProfesionalId">Asignar cobertura</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="app-data-table">
        <thead><tr><th class="col-text">Profesional</th><th class="col-status">Estado</th><th class="col-actions">Acciones</th></tr></thead>
        <tbody>
          @for (a of items(); track a.id) {
            <tr>
              <td class="col-text">{{ a.profesionalNombre }} {{ a.profesionalApellido }}</td>
              <td class="col-status">{{ a.activo ? 'Activo' : 'Inactivo' }}</td>
              <td class="col-actions"><button class="table-row-action table-row-action--danger" (click)="desasignar(a.profesionalId)">Desasignar</button></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .sub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; gap: 1rem; }
    .sub-count { color: var(--text-muted); font-size: .9rem; }
    .controls { display: flex; gap: .5rem; align-items: center; }
    select { min-width: 230px; padding: .45rem .55rem; border: 1px solid var(--border); border-radius: var(--radius); }
    .btn-primary { padding: .45rem .9rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: .875rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    th { background: var(--bg); padding: .7rem 1rem; text-align: left; font-size: .78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    td { padding: .7rem 1rem; border-top: 1px solid var(--border); font-size: .9rem; }
  `],
})
export class AsignacionesListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(AsignacionService);
  private profesionalSvc = inject(ProfesionalService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private completenessRefresh = inject(ConsultorioCompletenessRefreshService);

  items = signal<ProfesionalAsignado[]>([]);
  profesionales = signal<Profesional[]>([]);
  selectedProfesionalId = '';
  private consultorioId = '';

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.load();
    this.profesionalSvc.list(this.consultorioId).subscribe({
      next: (data) => this.profesionales.set(data),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  asignar(): void {
    if (!this.selectedProfesionalId) return;
    this.svc.asignar(this.consultorioId, this.selectedProfesionalId).subscribe({
      next: () => { this.toast.success('Cobertura asignada'); this.selectedProfesionalId = ''; this.load(); this.completenessRefresh.notify(this.consultorioId); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  desasignar(profesionalId: string): void {
    this.svc.desasignar(this.consultorioId, profesionalId).subscribe({
      next: () => { this.toast.success('Cobertura eliminada'); this.load(); this.completenessRefresh.notify(this.consultorioId); },
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
