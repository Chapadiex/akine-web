import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PacienteForm } from '../../components/paciente-form/paciente-form';
import { PacienteSearch } from '../../components/paciente-search/paciente-search';
import { PacienteRequest, PacienteSearchResult } from '../../models/paciente.models';
import { PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-pacientes-backoffice',
  standalone: true,
  imports: [PacienteSearch, PacienteForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="header">
        <h2>Pacientes</h2>
        <button class="btn-primary" (click)="openNuevoPaciente()">Nuevo paciente</button>
      </div>

      <div class="subheader">
        <span class="current-consultorio">
          Consultorio activo: {{ selectedConsultorioName() || 'Sin consultorio seleccionado' }}
        </span>
      </div>

      <app-paciente-search (search)="buscar($event)" />

      @if (!consultorioId()) {
        <div class="empty">No hay consultorio activo seleccionado.</div>
      }

      @if (consultorioId() && searchedQuery() && items().length === 0) {
        <div class="empty">No se encontraron pacientes para "{{ searchedQuery() }}".</div>
      }

      @if (consultorioId() && !searchedQuery() && !loading() && items().length === 0) {
        <div class="empty">No hay pacientes cargados para este consultorio.</div>
      }

      @if (items().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>DNI</th>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td>{{ item.dni }}</td>
                  <td>{{ item.apellido }}</td>
                  <td>{{ item.nombre }}</td>
                  <td>{{ item.telefono || '-' }}</td>
                  <td>{{ item.email || '-' }}</td>
                  <td>
                    <span class="badge" [class.ok]="item.linkedToConsultorio">
                      {{ item.linkedToConsultorio ? 'Vinculado' : 'No vinculado' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button class="btn-link" (click)="verDetalle(item.id)">Ver</button>
                    @if (!item.linkedToConsultorio) {
                      <button class="btn-link" (click)="vincularSiCorresponde(item)">Vincular</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (showAlta()) {
        <div class="overlay" (click)="showAlta.set(false)">
          <div class="panel" (click)="$event.stopPropagation()">
            <h3>Nueva ficha paciente</h3>
            <app-paciente-form
              [initialDni]="prefillDni()"
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
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .2rem; }
    .subheader { margin-bottom: .8rem; }
    .current-consultorio { color: var(--text-muted); font-size: .9rem; }
    .empty {
      margin-top: .9rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--white); padding: .8rem;
    }
    .table-wrap { margin-top: .9rem; overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    th {
      background: var(--bg);
      padding: .7rem .8rem;
      text-align: left;
      font-size: .78rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }
    td { padding: .7rem .8rem; border-top: 1px solid var(--border); font-size: .9rem; }
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
    .actions-cell { display: flex; gap: .5rem; }
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
  private readonly router = inject(Router);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly consultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly selectedConsultorioName = computed(
    () => this.consultorioCtx.selectedConsultorio()?.name ?? '',
  );
  readonly searchedQuery = signal<string>('');
  readonly items = signal<PacienteSearchResult[]>([]);
  readonly prefillDni = signal('');
  readonly showAlta = signal(false);
  readonly loading = signal(false);

  constructor() {
    effect(() => {
      const cid = this.consultorioId();
      this.searchedQuery.set('');
      if (!cid) {
        this.items.set([]);
        return;
      }
      this.loadAll();
    });
  }

  buscar(query: string): void {
    if (!this.consultorioId()) {
      this.toast.error('Selecciona un consultorio');
      return;
    }
    const normalized = query.trim();
    this.searchedQuery.set(normalized);
    if (!normalized) {
      this.loadAll();
      return;
    }
    this.items.set([]);
    this.loading.set(true);

    const isDni = /^[0-9]{7,10}$/.test(normalized);
    this.pacienteSvc.search(this.consultorioId(), isDni ? normalized : undefined, isDni ? undefined : normalized).subscribe({
      next: (results) => {
        this.items.set(results);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  openNuevoPaciente(): void {
    if (!this.consultorioId()) {
      this.toast.error('Selecciona un consultorio');
      return;
    }
    const q = this.searchedQuery();
    this.prefillDni.set(/^[0-9]{7,10}$/.test(q) ? q : '');
    this.showAlta.set(true);
  }

  crearPaciente(req: PacienteRequest): void {
    this.pacienteSvc.createAdmin(this.consultorioId(), req).subscribe({
      next: (paciente) => {
        this.toast.success('Paciente registrado');
        this.showAlta.set(false);
        const createdItem: PacienteSearchResult = {
          id: paciente.id,
          dni: paciente.dni,
          nombre: paciente.nombre,
          apellido: paciente.apellido,
          telefono: paciente.telefono,
          email: paciente.email,
          activo: paciente.activo,
          linkedToConsultorio: true,
        };
        this.items.update((curr) => [createdItem, ...curr.filter((x) => x.id !== createdItem.id)]);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  verDetalle(pacienteId: string): void {
    this.router.navigate(['/app', 'pacientes', pacienteId, 'resumen']);
  }

  vincularSiCorresponde(item: PacienteSearchResult): void {
    if (item.linkedToConsultorio) return;

    this.pacienteSvc.createAdmin(this.consultorioId(), {
      dni: item.dni,
      nombre: item.nombre,
      apellido: item.apellido,
      telefono: item.telefono,
      email: item.email,
    }).subscribe({
      next: () => {
        this.toast.success('Paciente vinculado al consultorio');
        this.items.update((curr) =>
          curr.map((x) => (x.id === item.id ? { ...x, linkedToConsultorio: true } : x)),
        );
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private loadAll(): void {
    const cid = this.consultorioId();
    if (!cid) return;
    this.loading.set(true);
    this.pacienteSvc.list(cid).subscribe({
      next: (results) => {
        this.items.set(results);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }
}
