import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Paciente } from '../pacientes/models/paciente.models';
import { PacienteHeader } from './components/paciente-header/paciente-header';
import { Paciente360Service } from './services/paciente-360.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../core/error/error-mapper.service';

@Component({
  selector: 'app-paciente-360',
  standalone: true,
  imports: [RouterOutlet, PacienteHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="loading-msg">Cargando paciente...</p>
    } @else if (error()) {
      <div class="error-msg">
        <p>{{ error() }}</p>
        <button (click)="load()">Reintentar</button>
      </div>
    } @else if (paciente()) {
      <app-paciente-header [paciente]="paciente()!" [basePath]="basePath" />
      <div class="tab-content">
        <router-outlet />
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .loading-msg { color: var(--text-muted); text-align: center; margin-top: 3rem; }
    .error-msg { text-align: center; margin-top: 3rem; color: var(--error); }
    .error-msg button {
      margin-top: .5rem; padding: .4rem .8rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white); cursor: pointer;
    }
    .tab-content { flex: 1; overflow-y: auto; }
  `],
})
export class Paciente360 implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(Paciente360Service);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly paciente = signal<Paciente | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  basePath = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('patientId')!;
    this.basePath = `/app/pacientes/${id}`;
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('patientId')!;
    this.loading.set(true);
    this.error.set(null);
    this.svc.getDetail(id).subscribe({
      next: (p) => { this.paciente.set(p); this.loading.set(false); },
      error: (err) => {
        this.error.set(this.errMap.toMessage(err));
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }
}
