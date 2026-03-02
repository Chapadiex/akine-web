import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PacienteForm } from '../../components/paciente-form/paciente-form';
import { PacienteSearch } from '../../components/paciente-search/paciente-search';
import { Paciente, PacienteRequest, PacienteSearchResult } from '../../models/paciente.models';
import { PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-pacientes-backoffice',
  standalone: true,
  imports: [FormsModule, PacienteSearch, PacienteForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="header">
        <h2>Pacientes - Alta rapida</h2>
        <select [ngModel]="consultorioId()" (ngModelChange)="consultorioId.set($event)">
          @for (id of consultorioIds(); track id) {
            <option [ngValue]="id">{{ id }}</option>
          }
        </select>
      </div>

      <app-paciente-search (search)="buscarPorDni($event)" />

      @if (searchResult()) {
        <div class="result">
          <strong>{{ searchResult()!.apellido }}, {{ searchResult()!.nombre }}</strong>
          <span>DNI {{ searchResult()!.dni }}</span>
          <span class="badge" [class.ok]="searchResult()!.linkedToConsultorio">
            {{ searchResult()!.linkedToConsultorio ? 'Ya existe en consultorio' : 'Existe global, sin vinculo' }}
          </span>
          <button class="btn-link" (click)="verFicha(searchResult()!.id)">Ver ficha</button>
        </div>
      } @else if (searchedDni()) {
        <div class="empty">
          No se encontró paciente con DNI {{ searchedDni() }}.
          <button class="btn-primary" (click)="showAlta.set(true)">Alta rapida</button>
        </div>
      }

      @if (selectedPaciente()) {
        <div class="card">
          <h3>Ficha</h3>
          <p><b>{{ selectedPaciente()!.apellido }}, {{ selectedPaciente()!.nombre }}</b></p>
          <p>DNI: {{ selectedPaciente()!.dni }}</p>
          <p>Telefono: {{ selectedPaciente()!.telefono }}</p>
          <p>Email: {{ selectedPaciente()!.email || '-' }}</p>
        </div>
      }

      @if (showAlta()) {
        <div class="overlay" (click)="showAlta.set(false)">
          <div class="panel" (click)="$event.stopPropagation()">
            <h3>Nueva ficha paciente</h3>
            <app-paciente-form
              [initialDni]="searchedDni()"
              (saved)="crearPaciente($event)"
              (cancelled)="showAlta.set(false)"
            />
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .page { display: block; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .8rem; }
    .header select {
      min-width: 240px; border: 1px solid var(--border); border-radius: var(--radius);
      padding: .45rem .6rem; background: var(--white);
    }
    .result, .empty, .card {
      margin-top: .9rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white); padding: .8rem;
      display: flex; flex-wrap: wrap; gap: .7rem; align-items: center;
    }
    .badge {
      font-size: .76rem; background: var(--bg); color: var(--text-muted);
      padding: .2rem .5rem; border-radius: 999px;
    }
    .badge.ok { background: var(--success-bg); color: var(--success); }
    .btn-primary {
      border: none; border-radius: var(--radius); background: var(--primary); color: #fff;
      padding: .45rem .8rem; cursor: pointer; font-weight: 600;
    }
    .btn-link {
      border: none; background: transparent; color: var(--primary); cursor: pointer; font-weight: 600;
    }
    .overlay {
      position: fixed; inset: 0; background: rgb(0 0 0 / .35);
      display: flex; justify-content: center; align-items: flex-start; padding-top: 8vh; z-index: 900;
    }
    .panel {
      width: min(740px, 95vw); background: var(--white);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 1.2rem;
    }
  `],
})
export class PacientesBackofficePage {
  private readonly auth = inject(AuthService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly consultorioIds = signal<string[]>(this.auth.currentUser()?.consultorioIds ?? []);
  readonly consultorioId = signal<string>(this.consultorioIds()[0] ?? '');
  readonly searchedDni = signal<string>('');
  readonly searchResult = signal<PacienteSearchResult | null>(null);
  readonly selectedPaciente = signal<Paciente | null>(null);
  readonly showAlta = signal(false);

  buscarPorDni(dni: string): void {
    if (!this.consultorioId()) {
      this.toast.error('Seleccioná un consultorio');
      return;
    }
    this.searchedDni.set(dni);
    this.searchResult.set(null);
    this.selectedPaciente.set(null);

    this.pacienteSvc.search(this.consultorioId(), dni).subscribe({
      next: (results) => {
        const match = results.find((p) => p.dni === dni) ?? null;
        this.searchResult.set(match);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  crearPaciente(req: PacienteRequest): void {
    this.pacienteSvc.createAdmin(this.consultorioId(), req).subscribe({
      next: (paciente) => {
        this.toast.success('Paciente registrado');
        this.showAlta.set(false);
        this.searchResult.set({
          id: paciente.id,
          dni: paciente.dni,
          nombre: paciente.nombre,
          apellido: paciente.apellido,
          telefono: paciente.telefono,
          email: paciente.email,
          activo: paciente.activo,
          linkedToConsultorio: true,
        });
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  verFicha(id: string): void {
    this.pacienteSvc.getById(id, this.consultorioId()).subscribe({
      next: (p) => this.selectedPaciente.set(p),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
