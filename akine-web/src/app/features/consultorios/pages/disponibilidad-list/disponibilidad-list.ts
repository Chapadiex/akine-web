import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { DisponibilidadForm } from '../../components/disponibilidad-form/disponibilidad-form';
import { DIAS_SEMANA, DisponibilidadProfesional, DisponibilidadRequest } from '../../models/agenda.models';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-disponibilidad-list',
  standalone: true,
  imports: [DisponibilidadForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-header">
      <span class="sub-count">{{ items().length }} disponibilidad(es)</span>
      <button class="btn-primary" (click)="showForm.set(true)">+ Nueva disponibilidad</button>
    </div>

    @if (items().length === 0) {
      <p class="empty-msg">Sin disponibilidades para este profesional.</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Dia</th><th>Inicio</th><th>Fin</th><th>Acciones</th></tr></thead>
          <tbody>
            @for (d of items(); track d.id) {
              <tr>
                <td>{{ dia(d.diaSemana) }}</td>
                <td>{{ d.horaInicio }}</td>
                <td>{{ d.horaFin }}</td>
                <td><button class="btn-link" (click)="remove(d.id)">Eliminar</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (showForm()) {
      <app-disponibilidad-form (saved)="create($event)" (cancelled)="showForm.set(false)" />
    }
  `,
  styles: [`
    .sub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .sub-count { color: var(--text-muted); font-size: .9rem; }
    .btn-primary { padding: .45rem 1rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: .875rem; }
    .empty-msg { color: var(--text-muted); text-align: center; margin-top: 2rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    th { background: var(--bg); padding: .7rem 1rem; text-align: left; font-size: .78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
    td { padding: .7rem 1rem; border-top: 1px solid var(--border); font-size: .9rem; }
    .btn-link { border: 0; background: none; color: var(--primary); cursor: pointer; }
  `],
})
export class DisponibilidadListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(DisponibilidadService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  items = signal<DisponibilidadProfesional[]>([]);
  showForm = signal(false);
  private consultorioId = '';
  private profesionalId = '';

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.profesionalId = this.route.snapshot.paramMap.get('profId')!;
    this.load();
  }

  dia(key: string): string {
    return DIAS_SEMANA.find((d) => d.key === key)?.label ?? key;
  }

  create(req: DisponibilidadRequest): void {
    this.svc.create(this.consultorioId, this.profesionalId, req).subscribe({
      next: () => { this.toast.success('Disponibilidad creada'); this.showForm.set(false); this.load(); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  remove(id: string): void {
    this.svc.delete(this.consultorioId, this.profesionalId, id).subscribe({
      next: () => { this.toast.success('Disponibilidad eliminada'); this.load(); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private load(): void {
    this.svc.list(this.consultorioId, this.profesionalId).subscribe({
      next: (data) => this.items.set(data),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
