import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PacienteQuickForm } from '../../components/paciente-quick-form/paciente-quick-form';
import { PacienteSearch } from '../../components/paciente-search/paciente-search';
import { Paciente, PacienteRequest, PacienteSearchResult } from '../../models/paciente.models';
import { PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-pacientes-backoffice',
  standalone: true,
  imports: [PacienteSearch, PacienteQuickForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="header">
        <div class="header-copy">
          <h2>Pacientes</h2>
          <span class="current-consultorio">
            Consultorio activo: {{ selectedConsultorioName() || 'Sin consultorio seleccionado' }}
          </span>
        </div>
        <button class="btn-primary" (click)="openNuevoPaciente()">Nuevo paciente</button>
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
                <th>Edad</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Cobertura</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr [class.row-expanded]="expandedPatientId() === item.id">
                  <td>
                    @if (item.linkedToConsultorio) {
                      <button type="button" class="dni-link" (click)="goToPaciente360(item.id)">
                        {{ item.dni }}
                      </button>
                    } @else {
                      <span class="dni-text">{{ item.dni }}</span>
                    }
                  </td>
                  <td>{{ item.apellido }}</td>
                  <td>{{ item.nombre }}</td>
                  <td>{{ ageLabel(item) }}</td>
                  <td>{{ item.telefono || '-' }}</td>
                  <td>{{ item.email || '-' }}</td>
                  <td>
                    <span class="badge" [class.badge-warning]="!hasCoverage(item)" [class.badge-info]="hasCoverage(item)">
                      {{ coverageLabel(item) }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" [class.ok]="item.linkedToConsultorio" [class.badge-muted]="!item.linkedToConsultorio">
                      {{ item.linkedToConsultorio ? 'Vinculado' : 'No vinculado' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button class="btn-link" type="button" (click)="toggleExpanded(item)">
                      {{ expandedPatientId() === item.id ? 'Ocultar' : 'Ver' }}
                    </button>
                    @if (!item.linkedToConsultorio) {
                      <button class="btn-link" (click)="vincularSiCorresponde(item)">Vincular</button>
                    }
                  </td>
                </tr>
                @if (expandedPatientId() === item.id) {
                  <tr class="detail-row">
                    <td colspan="9">
                      @if (!item.linkedToConsultorio) {
                        <div class="detail-loading">El paciente no esta vinculado a este consultorio.</div>
                      } @else if (patientDetails()[item.id]; as detail) {
                        <div class="detail-panel">
                          <div class="detail-grid">
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
                                  <path d="M8 3.5v3M16 3.5v3M7 10h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Nacimiento</span>
                                <strong>{{ formatDate(detail.fechaNacimiento) || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.8" />
                                  <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Sexo</span>
                                <strong>{{ detail.sexo || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M5.5 4.5h3l1.6 4.3-1.9 1.9a15 15 0 0 0 5.6 5.6l1.9-1.9 4.3 1.6v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 6.5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Telefono</span>
                                <strong>{{ detail.telefono || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
                                  <path d="m4.5 7 7.5 5 7.5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Email</span>
                                <strong>{{ detail.email || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item detail-item-wide">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z" stroke="currentColor" stroke-width="1.8" />
                                  <circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Domicilio</span>
                                <strong>{{ detail.domicilio || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.8" />
                                  <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Profesion</span>
                                @if ((detail.profesiones || []).length > 0) {
                                  <div class="detail-professions">
                                    @for (prof of detail.profesiones; track prof) {
                                      <span class="profession-tag">{{ prof }}</span>
                                    }
                                  </div>
                                } @else {
                                  <strong>-</strong>
                                }
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M3.5 12h17M12 3.5a15 15 0 0 1 0 17M12 3.5a15 15 0 0 0 0 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Nacionalidad</span>
                                <strong>{{ detail.nacionalidad || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M7 4.5h10a2 2 0 0 1 2 2v11l-4-2-3 2-3-2-4 2v-11a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Estado civil</span>
                                <strong>{{ detail.estadoCivil || '-' }}</strong>
                              </div>
                            </article>
                            <article class="detail-item detail-item-wide">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <path d="M12 21c4.4-2.7 7-6 7-10.2A4.8 4.8 0 0 0 14.2 6 5.4 5.4 0 0 0 12 6.6 5.4 5.4 0 0 0 9.8 6 4.8 4.8 0 0 0 5 10.8C5 15 7.6 18.3 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Obra social</span>
                                <strong>
                                  {{ detail.obraSocialNombre || 'Sin cobertura' }}
                                  @if (detail.obraSocialPlan) {
                                    <span> - {{ detail.obraSocialPlan }}</span>
                                  }
                                </strong>
                              </div>
                            </article>
                            <article class="detail-item">
                              <div class="detail-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                  <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.8" />
                                  <path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                </svg>
                              </div>
                              <div class="detail-copy">
                                <span class="detail-label">Afiliado</span>
                                <strong>{{ detail.obraSocialNroAfiliado || '-' }}</strong>
                              </div>
                            </article>
                          </div>
                        </div>
                      } @else {
                        <div class="detail-loading">Cargando datos del paciente...</div>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }

      @if (showAlta()) {
        <div class="overlay">
          <div class="panel">
            <h3>Nueva ficha paciente</h3>
            <app-paciente-quick-form
              [consultorioId]="consultorioId()"
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
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      margin-bottom: .55rem;
    }
    .header-copy {
      display: flex;
      align-items: baseline;
      gap: 1.1rem;
      flex-wrap: wrap;
    }
    .header h2 { margin: 0; }
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
    tr.row-expanded td {
      background: color-mix(in srgb, var(--primary) 2%, var(--white));
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
    .dni-link {
      border: none;
      background: transparent;
      padding: 0;
      color: var(--text);
      font-size: .95rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      text-decoration-color: color-mix(in srgb, var(--primary) 32%, transparent);
      text-underline-offset: .18rem;
    }
    .dni-link:hover { color: var(--primary); }
    .dni-text { font-weight: 700; color: var(--text); }
    .badge {
      font-size: .76rem; background: var(--bg); color: var(--text-muted);
      padding: .2rem .5rem; border-radius: 999px;
    }
    .badge.ok { background: var(--success-bg); color: var(--success); }
    .badge-info {
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
      color: var(--primary);
    }
    .badge-warning {
      background: color-mix(in srgb, var(--warning) 12%, var(--white));
      color: color-mix(in srgb, var(--warning) 82%, var(--text));
    }
    .badge-muted {
      background: color-mix(in srgb, var(--border) 55%, var(--white));
      color: var(--text-muted);
    }
    .btn-primary {
      border: none; border-radius: var(--radius); background: var(--primary); color: #fff;
      padding: .45rem .8rem; cursor: pointer; font-weight: 600;
    }
    .btn-link {
      border: none; background: transparent; color: var(--primary); cursor: pointer; font-weight: 600;
    }
    .actions-cell { display: flex; gap: .5rem; }
    .detail-row td {
      padding: 0;
      background: color-mix(in srgb, var(--primary) 1.5%, var(--white));
    }
    .detail-panel {
      padding: .95rem 1rem 1rem;
      border-top: 1px solid color-mix(in srgb, var(--primary) 8%, var(--border));
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: .95rem 1.1rem;
    }
    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: .62rem;
      min-width: 0;
    }
    .detail-item-wide { grid-column: span 2; }
    .detail-icon {
      color: var(--text-muted);
      flex: 0 0 auto;
      display: inline-grid;
      place-items: center;
      padding-top: .12rem;
    }
    .detail-copy {
      display: grid;
      gap: .12rem;
      min-width: 0;
    }
    .detail-label {
      color: var(--text-muted);
      font-size: .72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .03em;
    }
    .detail-item strong {
      font-size: .9rem;
      color: var(--text);
      line-height: 1.35;
      overflow-wrap: break-word;
    }
    .detail-professions {
      display: flex;
      flex-wrap: wrap;
      gap: .35rem;
    }
    .profession-tag {
      display: inline-flex;
      align-items: center;
      padding: .28rem .42rem;
      border-radius: 5px;
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      color: var(--primary);
      font-size: .78rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .detail-loading {
      padding: .9rem 1rem 1rem;
      color: var(--text-muted);
      font-size: .88rem;
    }
    .overlay {
      position: fixed; inset: 0; background: rgb(0 0 0 / .35);
      display: flex; justify-content: center; align-items: flex-start; padding-top: 8vh; z-index: 900;
    }
    .panel {
      width: min(520px, 92vw); background: var(--white);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 1.5rem;
    }
    @media (max-width: 960px) {
      .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .header { align-items: stretch; flex-direction: column; }
      .detail-grid { grid-template-columns: 1fr; }
      .detail-item-wide { grid-column: span 1; }
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
  readonly patientDetails = signal<Record<string, Paciente>>({});
  readonly prefillDni = signal('');
  readonly showAlta = signal(false);
  readonly loading = signal(false);
  readonly expandedPatientId = signal<string | null>(null);

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
        this.applyResults(results);
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
        this.goToPaciente360(paciente.id);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  goToPaciente360(pacienteId: string): void {
    this.router.navigate(['/app', 'pacientes', pacienteId, 'resumen']);
  }

  toggleExpanded(item: PacienteSearchResult): void {
    if (this.expandedPatientId() === item.id) {
      this.expandedPatientId.set(null);
      return;
    }

    this.expandedPatientId.set(item.id);
    if (item.linkedToConsultorio && !this.patientDetails()[item.id]) {
      this.loadPatientDetail(item.id);
    }
  }

  hasCoverage(item: PacienteSearchResult): boolean {
    const detail = this.patientDetails()[item.id];
    return !!detail?.obraSocialNombre;
  }

  coverageLabel(item: PacienteSearchResult): string {
    if (!item.linkedToConsultorio) return 'Sin detalle';
    const detail = this.patientDetails()[item.id];
    if (!detail) return 'Cargando...';
      return detail.obraSocialNombre ? 'Con cobertura' : 'Sin cobertura';
  }

  ageLabel(item: PacienteSearchResult): string {
    const fechaNacimiento = this.patientDetails()[item.id]?.fechaNacimiento;
    const age = this.calculateAge(fechaNacimiento);
    return age === null ? '-' : `${age}`;
  }

  formatDate(value?: string): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  private calculateAge(value?: string): number | null {
    if (!value) return null;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
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
        this.applyResults(results);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private applyResults(results: PacienteSearchResult[]): void {
    this.items.set(results);
    this.expandedPatientId.set(null);

    const currentDetails = this.patientDetails();
    const nextDetails = Object.fromEntries(
      results
        .map((item) => item.id)
        .filter((id) => currentDetails[id])
        .map((id) => [id, currentDetails[id]]),
    ) as Record<string, Paciente>;

    this.patientDetails.set(nextDetails);
    this.preloadPatientDetails(results);
  }

  private preloadPatientDetails(results: PacienteSearchResult[]): void {
    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    const missingIds = results
      .filter((item) => item.linkedToConsultorio && !this.patientDetails()[item.id])
      .map((item) => item.id);

    if (missingIds.length === 0) return;

    forkJoin(
      missingIds.map((id) =>
        this.pacienteSvc.getById(id, consultorioId).pipe(
          catchError(() => of(null)),
        ),
      ),
    ).subscribe((details) => {
      const merged = { ...this.patientDetails() };
      for (const detail of details) {
        if (detail) {
          merged[detail.id] = detail;
        }
      }
      this.patientDetails.set(merged);
    });
  }

  private loadPatientDetail(patientId: string): void {
    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    this.pacienteSvc.getById(patientId, consultorioId).pipe(
      catchError(() => of(null)),
    ).subscribe((detail) => {
      if (!detail) return;
      this.patientDetails.update((curr) => ({ ...curr, [detail.id]: detail }));
    });
  }
}
