import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { HorarioForm } from '../../components/horario-form/horario-form';
import { ConsultorioHorario, DayOfWeek, DIAS_SEMANA, HorarioRequest } from '../../models/agenda.models';
import { HorarioService } from '../../services/horario.service';

@Component({
  selector: 'app-horarios-list',
  standalone: true,
  imports: [HorarioForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-header">
      <span class="sub-count">{{ items().length }} dia(s) configurado(s)</span>
      <button class="btn-primary" (click)="showForm.set(true)">+ Configurar dia</button>
    </div>

    @if (items().length === 0) {
      <p class="empty-msg">No hay horarios configurados.</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Dia</th><th>Apertura</th><th>Cierre</th><th>Acciones</th></tr></thead>
          <tbody>
            @for (h of items(); track h.id) {
              <tr>
                <td>{{ diaLabel(h.diaSemana) }}</td>
                <td>{{ h.horaApertura }}</td>
                <td>{{ h.horaCierre }}</td>
                <td><button class="btn-icon" (click)="remove(h.diaSemana)">Quitar</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (showForm()) {
      <app-horario-form (saved)="onSave($event)" (cancelled)="showForm.set(false)" />
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
    .btn-icon { background: none; border: 1px solid var(--border); border-radius: var(--radius); padding: .2rem .6rem; }
  `],
})
export class HorariosListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(HorarioService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  items = signal<ConsultorioHorario[]>([]);
  showForm = signal(false);
  private consultorioId = '';

  ngOnInit(): void {
    this.consultorioId = this.route.parent!.snapshot.paramMap.get('id')!;
    this.load();
  }

  diaLabel(day: DayOfWeek): string {
    return DIAS_SEMANA.find((d) => d.key === day)?.label ?? day;
  }

  onSave(req: HorarioRequest): void {
    this.svc.set(this.consultorioId, req.diaSemana, req).subscribe({
      next: () => { this.toast.success('Horario guardado'); this.showForm.set(false); this.load(); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  remove(day: DayOfWeek): void {
    this.svc.delete(this.consultorioId, day).subscribe({
      next: () => { this.toast.success('Horario eliminado'); this.load(); },
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
