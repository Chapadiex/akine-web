import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PacienteForm } from '../../components/paciente-form/paciente-form';
import { PacienteService } from '../../services/paciente.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PacienteRequest } from '../../models/paciente.models';

@Component({
  selector: 'app-paciente-self-alta',
  standalone: true,
  imports: [PacienteForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h2>Crear mi ficha de paciente</h2>
      <p class="hint">Completá los datos mínimos para continuar.</p>

      @if (created()) {
        <div class="ok">Ficha creada correctamente.</div>
      } @else {
        <app-paciente-form (saved)="onSave($event)" (cancelled)="noop()" />
      }
    </div>
  `,
  styles: [`
    .page {
      max-width: 720px; background: var(--white); border-radius: var(--radius-lg);
      padding: 1.25rem; box-shadow: var(--shadow-sm);
    }
    h2 { margin-bottom: .4rem; }
    .hint { color: var(--text-muted); margin-bottom: 1rem; }
    .ok {
      border: 1px solid var(--success-bg); background: var(--success-bg); color: var(--success);
      padding: .7rem .9rem; border-radius: var(--radius);
    }
  `],
})
export class PacienteSelfAltaPage {
  private readonly pacienteSvc = inject(PacienteService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly created = signal(false);

  onSave(req: PacienteRequest): void {
    this.pacienteSvc.createMe(req).subscribe({
      next: () => {
        this.created.set(true);
        this.toast.success('Tu ficha fue creada');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  noop(): void {}
}
