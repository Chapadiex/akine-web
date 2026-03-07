import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioDuracion } from '../../models/agenda.models';
import { DuracionService } from '../../services/duracion.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-duraciones-list',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sub-header">
      <span class="sub-count">{{ items().length }} intervalo(s) configurado(s)</span>
      <div class="controls">
        <input type="number" [(ngModel)]="nuevoMinutos" min="15" step="5" />
        <button class="btn-primary" (click)="add()">Agregar intervalo</button>
      </div>
    </div>

    <div class="chips">
      @for (d of items(); track d.id) {
        <button class="chip" (click)="remove(d.minutos)">{{ d.minutos }} min x</button>
      }
    </div>
  `,
  styles: [`
    .sub-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .sub-count { color: var(--text-muted); font-size: .9rem; }
    .controls { display: flex; gap: .5rem; }
    input { width: 90px; padding: .45rem .55rem; border: 1px solid var(--border); border-radius: var(--radius); }
    .btn-primary { padding: .45rem .9rem; background: var(--primary); color: #fff; border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: .875rem; }
    .chips { display: flex; gap: .5rem; flex-wrap: wrap; }
    .chip { padding: .35rem .8rem; border: 1px solid var(--border); border-radius: 999px; background: var(--white); cursor: pointer; }
  `],
})
export class DuracionesListPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(DuracionService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  items = signal<ConsultorioDuracion[]>([]);
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
      next: () => { this.toast.success('Intervalo agregado'); this.load(); },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  remove(minutos: number): void {
    this.svc.remove(this.consultorioId, minutos).subscribe({
      next: () => { this.toast.success('Intervalo eliminado'); this.load(); },
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
