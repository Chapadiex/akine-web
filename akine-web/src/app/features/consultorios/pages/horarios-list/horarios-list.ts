import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { HorarioForm, HorarioFormValue } from '../../components/horario-form/horario-form';
import { ConsultorioHorario, DayOfWeek, DIAS_SEMANA, HorarioRequest } from '../../models/agenda.models';
import { HorarioService } from '../../services/horario.service';

@Component({
  selector: 'app-horarios-list',
  standalone: true,
  imports: [HorarioForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-header">
      <span class="sub-count">{{ daysConfiguredCount() }} dia(s) configurado(s)</span>
      <button class="btn-primary" (click)="showForm.set(true)">+ Configurar dia</button>
    </div>

    @if (items().length === 0) {
      <p class="empty-msg">No hay horarios configurados.</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Dia</th><th>Apertura</th><th>Cierre</th><th>Acciones</th></tr></thead>
          <tbody>
            @for (h of sortedItems(); track h.id) {
              <tr>
                <td>{{ diaLabel(h.diaSemana) }}</td>
                <td>{{ h.horaApertura }}</td>
                <td>{{ h.horaCierre }}</td>
                <td><button class="btn-icon" (click)="remove(h.id, h.diaSemana)">Quitar</button></td>
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
  sortedItems = signal<ConsultorioHorario[]>([]);
  daysConfiguredCount = signal(0);
  showForm = signal(false);
  private consultorioId = '';

  ngOnInit(): void {
    this.consultorioId = this.route.parent!.snapshot.paramMap.get('id')!;
    this.load();
  }

  diaLabel(day: DayOfWeek): string {
    return DIAS_SEMANA.find((d) => d.key === day)?.label ?? day;
  }

  onSave(req: HorarioFormValue): void {
    const targets = this.resolveTargetDays(req.diaSeleccion);
    const payloads: HorarioRequest[] = targets.map((d) => ({
      diaSemana: d,
      horaApertura: req.horaApertura,
      horaCierre: req.horaCierre,
    }));

    if (this.hasOverlapWithExisting(payloads)) {
      this.toast.error('Hay superposicion con horarios existentes. No se guardo ningun dia.');
      return;
    }

    this.svc.createBatch(this.consultorioId, payloads).subscribe({
      next: () => {
        this.toast.success('Horario guardado');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as HttpErrorResponse;
        if (httpErr.status === 404 || httpErr.status === 405) {
          this.saveWithLegacyEndpoints(payloads);
          return;
        }
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  remove(horarioId: string, diaSemana: DayOfWeek): void {
    this.svc.deleteById(this.consultorioId, horarioId).subscribe({
      next: () => { this.toast.success('Horario eliminado'); this.load(); },
      error: (err) => {
        // Compatibilidad: si backend no expone delete por tramo, intentar borrado por dia.
        const httpErr = err as HttpErrorResponse;
        if (httpErr.status === 404 || httpErr.status === 405) {
          this.svc.delete(this.consultorioId, diaSemana).subscribe({
            next: () => { this.toast.success('Horario eliminado'); this.load(); },
            error: (fallbackErr) => this.toast.error(this.errMap.toMessage(fallbackErr)),
          });
          return;
        }
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private load(): void {
    this.svc.list(this.consultorioId).subscribe({
      next: (data) => {
        this.items.set(data);
        this.sortedItems.set(this.sortByDayAndStart(data));
        this.daysConfiguredCount.set(new Set(data.map((d) => d.diaSemana)).size);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private resolveTargetDays(day: HorarioFormValue['diaSeleccion']): DayOfWeek[] {
    if (day === 'MONDAY_TO_FRIDAY') {
      return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    }
    if (day === 'MONDAY_TO_SATURDAY') {
      return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    }
    return [day];
  }

  private sortByDayAndStart(items: ConsultorioHorario[]): ConsultorioHorario[] {
    const dayOrder = new Map<DayOfWeek, number>(DIAS_SEMANA.map((d, idx) => [d.key, idx]));
    return [...items].sort((a, b) => {
      const dayCmp = (dayOrder.get(a.diaSemana) ?? 0) - (dayOrder.get(b.diaSemana) ?? 0);
      if (dayCmp !== 0) return dayCmp;
      return a.horaApertura.localeCompare(b.horaApertura);
    });
  }

  private saveWithLegacyEndpoints(payloads: HorarioRequest[]): void {
    forkJoin(payloads.map((p) => this.svc.create(this.consultorioId, p))).subscribe({
      next: () => {
        this.toast.success('Horario guardado');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as HttpErrorResponse;
        if (httpErr.status === 404 || httpErr.status === 405) {
          forkJoin(payloads.map((p) => this.svc.set(this.consultorioId, p.diaSemana, p))).subscribe({
            next: () => {
              this.toast.success('Horario guardado');
              this.showForm.set(false);
              this.load();
            },
            error: (fallbackErr) => this.toast.error(this.errMap.toMessage(fallbackErr)),
          });
          return;
        }
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private hasOverlapWithExisting(payloads: HorarioRequest[]): boolean {
    const existing = this.items();
    return payloads.some((p) => {
      const pStart = this.toMinutes(p.horaApertura);
      const pEnd = this.toMinutes(p.horaCierre);
      return existing
        .filter((e) => e.diaSemana === p.diaSemana)
        .some((e) => {
          const eStart = this.toMinutes(e.horaApertura);
          const eEnd = this.toMinutes(e.horaCierre);
          return pStart < eEnd && pEnd > eStart;
        });
    });
  }

  private toMinutes(time: string): number {
    const [hh, mm] = time.split(':').map((v) => Number.parseInt(v, 10));
    return (hh * 60) + mm;
  }
}
