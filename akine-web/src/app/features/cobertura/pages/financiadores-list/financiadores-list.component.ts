import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CoberturaService } from '../../services/cobertura.service';
import { FinanciadorSalud, TipoFinanciador } from '../../models/cobertura.models';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-financiadores-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageSectionHeaderComponent, ConfirmDialog],
  template: `
    <div class="page">
      <app-page-section-header
        title="Financiadores de Salud"
        description="Administración de Obras Sociales, Prepagas y Mutuales."
        titleLevel="h2"
      >
        <button header-actions class="btn-primary" type="button" (click)="openCreate()">
          + Nuevo Financiador
        </button>
      </app-page-section-header>

      @if (isLoading()) {
        <p class="empty">Cargando financiadores...</p>
      } @else if (loadError()) {
        <p class="empty error-msg">No se pudieron cargar los financiadores. <button class="link-btn" type="button" (click)="load()">Reintentar</button></p>
      } @else {
        <table class="table app-data-table">
          <thead>
            <tr>
              <th class="col-text">Nombre</th>
              <th class="col-text-short">Tipo</th>
              <th class="col-status">Estado</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (f of financiadores(); track f.id) {
              <tr>
                <td class="col-text">
                  <span class="nombre">{{ f.nombre }}</span>
                  @if (f.nombreCorto) {
                    <span class="sub">{{ f.nombreCorto }}</span>
                  }
                  <div class="meta-row">
                    <span class="badge badge-plan">{{ planesBadgeLabel(f.id) }}</span>
                  </div>
                </td>
                <td class="col-text-short">{{ tipoLabel(f.tipoFinanciador) }}</td>
                <td class="col-status">
                  <span class="badge" [class.badge-active]="f.activo" [class.badge-inactive]="!f.activo">
                    <strong>{{ f.activo ? 'Activo' : 'Inactivo' }}</strong>
                  </span>
                </td>
                <td class="col-actions">
                  <button class="table-row-action" type="button" (click)="openEdit(f)">Editar</button>
                  <button class="table-row-action" type="button" (click)="verPlanes(f)">Ver planes</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">
                  No hay financiadores configurados.
                  <button class="link-btn" type="button" (click)="cargarListadoBase()" [disabled]="isSeeding()">
                    {{ isSeeding() ? 'Cargando listado...' : 'Cargar listado base de obras sociales' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    @if (showModal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h4>{{ editTarget() ? 'Editar Financiador' : 'Nuevo Financiador' }}</h4>
              <p>Complete los datos básicos del financiador de salud.</p>
            </div>
            <button class="icon-btn" type="button" aria-label="Cerrar" (click)="closeModal()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">
              <div class="field full-width">
                <label for="fin-nombre">Nombre Completo *</label>
                <input
                  id="fin-nombre"
                  type="text"
                  formControlName="nombre"
                  placeholder="Ej: Obra Social del Personal de Dirección"
                  autofocus
                  (input)="nombreError.set(null)"
                />
                @if (form.get('nombre')?.touched && form.get('nombre')?.hasError('required')) {
                  <small class="field-error">El nombre es obligatorio.</small>
                }
                @if (nombreError()) {
                  <small class="field-error">{{ nombreError() }}</small>
                }
              </div>

              <div class="field">
                <label for="fin-nombreCorto">Nombre Corto / Acrónimo</label>
                <input id="fin-nombreCorto" type="text" formControlName="nombreCorto" placeholder="Ej: OSDE" />
              </div>

              <div class="field">
                <label for="fin-tipo">Tipo de Financiador *</label>
                <select id="fin-tipo" formControlName="tipoFinanciador">
                  @for (t of tipos; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label for="fin-codigo">Código Externo / SSS</label>
                <input id="fin-codigo" type="text" formControlName="codigoExterno" placeholder="Ej: 1-0000-1" />
              </div>

              <div class="field">
                <label for="fin-ambito">Ámbito de Cobertura</label>
                <input id="fin-ambito" type="text" formControlName="ambitoCobertura" placeholder="Ej: Nacional, Provincial" />
              </div>

              <div class="field full-width">
                <label class="switch-row">
                  <input type="checkbox" formControlName="activo" class="switch-input" />
                  <span class="switch-track" aria-hidden="true"></span>
                  <span class="switch-label">Financiador Activo</span>
                </label>
              </div>
            </div>

            @if (saveError()) {
              <p class="save-error">{{ saveError() }}</p>
            }
            <div class="modal-actions">
              <button class="btn-secondary" type="button" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" type="submit" [disabled]="form.invalid || isSaving()">
                {{ isSaving() ? 'Guardando...' : 'Guardar Financiador' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (discardTarget()) {
      <app-confirm-dialog
        title="¿Descartar cambios?"
        message="Hay datos cargados que todavía no fueron guardados."
        confirmLabel="Descartar"
        (confirmed)="forceClose()"
        (cancelled)="discardTarget.set(false)"
      />
    }
  `,
  styles: [`
    .page { display: grid; gap: 1rem; }

    .table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface, var(--white));
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .table th,
    .table td { padding: .65rem .75rem; border-bottom: 1px solid var(--border); font-size: .86rem; }
    .table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
    .table tr:last-child td { border-bottom: 0; }
    .col-text { text-align: left; }
    .col-text-short { text-align: left; width: 130px; }
    .col-status { text-align: left; width: 100px; }
    .col-actions { text-align: right; width: 160px; white-space: nowrap; }

    .nombre { display: block; font-weight: 600; }
    .sub { display: block; font-size: .78rem; color: var(--text-muted); margin-top: .1rem; }
    .meta-row { margin-top: .35rem; }

    .badge {
      display: inline-block;
      padding: .2rem .55rem;
      border-radius: 999px;
      font-size: .75rem;
    }
    .badge-plan { background: var(--surface-alt, #f1f5f9); color: var(--text-muted); }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .badge-inactive { background: var(--error-bg, #fef2f2); color: var(--error, #dc2626); }

    .btn-primary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-size: .85rem;
      font-weight: 600;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary {
      min-height: 2.5rem;
      padding: 0 .95rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      cursor: pointer;
      font-size: .85rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
    }
    .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }

    .empty { color: var(--text-muted); text-align: center; padding: 1.5rem; font-size: .86rem; }

    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 35%);
      display: grid; place-items: center;
      z-index: 900;
    }
    .modal {
      width: min(560px, 92vw);
      background: var(--white);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }
    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem;
    }
    .modal h4 { margin: 0 0 .2rem; font-size: 1rem; font-weight: 700; }
    .modal p { margin: 0; color: var(--text-muted); font-size: .82rem; }
    .icon-btn {
      width: 34px; height: 34px; border-radius: 10px;
      border: 1px solid var(--border); background: var(--white);
      display: inline-grid; place-items: center;
      cursor: pointer; color: var(--text-muted); font-size: 1.2rem; flex-shrink: 0;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .75rem;
    }
    .full-width { grid-column: 1 / -1; }
    .field { display: grid; gap: .3rem; }
    .field label { font-size: .82rem; font-weight: 600; color: var(--text-muted); }
    .field input,
    .field select {
      height: 38px;
      padding: 0 .65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: .86rem;
      background: var(--white);
    }
    .field input:focus,
    .field select:focus {
      outline: none;
      border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
    }
    .field-error { color: var(--error, #dc2626); font-size: .78rem; }
    .toggle-row {
      display: inline-flex; align-items: center; gap: .5rem;
      cursor: pointer; font-size: .86rem; font-weight: 600; color: var(--text);
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: .5rem; }
    .save-error { color: var(--error, #dc2626); font-size: .82rem; margin: 0 0 .25rem; }
    .error-msg { color: var(--error, #dc2626); }
    .link-btn { background: none; border: none; padding: 0; color: var(--primary); cursor: pointer; font-size: inherit; text-decoration: underline; }

    /* Toggle switch — CSS only, sin Material */
    .switch-row { position: relative; display: inline-flex; align-items: center; gap: .6rem; cursor: pointer; user-select: none; }
    .switch-input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
    .switch-track {
      position: relative; display: inline-block;
      width: 36px; height: 20px;
      background: var(--border, #d1d5db);
      border-radius: 999px;
      transition: background .2s;
      flex-shrink: 0;
    }
    .switch-track::after {
      content: ''; position: absolute;
      top: 2px; left: 2px;
      width: 16px; height: 16px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgb(0 0 0 / .2);
      transition: transform .2s;
    }
    .switch-input:checked + .switch-track { background: var(--primary); }
    .switch-input:checked + .switch-track::after { transform: translateX(16px); }
    .switch-input:focus-visible + .switch-track { outline: 2px solid var(--primary); outline-offset: 2px; }
    .switch-label { font-size: .86rem; font-weight: 600; color: var(--text); }

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: 1; }
      .col-text-short { display: none; }
    }
  `],
})
export class FinanciadoresListComponent implements OnInit {
  private svc = inject(CoberturaService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ctx = inject(ConsultorioContextService);

  private get consultorioId(): string {
    return this.ctx.selectedConsultorioId();
  }

  financiadores = signal<FinanciadorSalud[]>([]);
  isLoading = signal(true);
  loadError = signal(false);
  showModal = signal(false);
  editTarget = signal<FinanciadorSalud | null>(null);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  nombreError = signal<string | null>(null);
  discardTarget = signal(false);
  isSeeding = signal(false);
  planCountByFinanciadorId = signal<Record<string, number>>({});

  tipos = Object.values(TipoFinanciador).map((v) => ({ value: v, label: this.formatTipo(v) }));
  form: FormGroup = this.buildForm(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.consultorioId) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    this.loadError.set(false);
    this.svc.getFinanciadores(this.consultorioId).subscribe({
      next: (data) => {
        this.financiadores.set(data);
        this.loadPlanesCountByFinanciador(data);
        this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.loadError.set(true); },
    });
  }

  cargarListadoBase(): void {
    if (!this.consultorioId || this.isSeeding()) return;
    this.isSeeding.set(true);
    this.svc.seedFinanciadores(this.consultorioId).subscribe({
      next: () => { this.isSeeding.set(false); this.load(); },
      error: () => { this.isSeeding.set(false); this.loadError.set(true); },
    });
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.form = this.buildForm(null);
    this.showModal.set(true);
  }

  openEdit(f: FinanciadorSalud): void {
    this.editTarget.set(f);
    this.form = this.buildForm(f);
    this.showModal.set(true);
  }

  closeModal(): void {
    if (this.form.dirty) {
      this.discardTarget.set(true);
      return;
    }
    this.forceClose();
  }

  forceClose(): void {
    this.showModal.set(false);
    this.discardTarget.set(false);
    this.editTarget.set(null);
    this.isSaving.set(false);
    this.saveError.set(null);
    this.nombreError.set(null);
  }

  save(): void {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    this.saveError.set(null);
    this.nombreError.set(null);
    const target = this.editTarget();
    const payload = { ...this.form.value, consultorioId: this.consultorioId };
    const op$ = target
      ? this.svc.updateFinanciador(target.id!, payload)
      : this.svc.createFinanciador(payload);
    op$.subscribe({
      next: () => { this.forceClose(); this.load(); },
      error: (err) => {
        this.isSaving.set(false);
        const detail: string = err?.error?.detail ?? 'No se pudo guardar. Verificá los datos e intentá de nuevo.';
        if (err?.status === 409 && detail.toLowerCase().includes('nombre')) {
          this.nombreError.set(detail);
        } else {
          this.saveError.set(detail);
        }
      },
    });
  }

  verPlanes(f: FinanciadorSalud): void {
    this.router.navigate(['/app/cobertura/planes'], { queryParams: { financiadorId: f.id } });
  }

  tipoLabel(tipo: TipoFinanciador): string {
    return this.formatTipo(tipo);
  }

  planesBadgeLabel(financiadorId?: string): string {
    const total = financiadorId ? (this.planCountByFinanciadorId()[financiadorId] ?? 0) : 0;
    return `${total} ${total === 1 ? 'plan' : 'planes'}`;
  }

  private buildForm(f: FinanciadorSalud | null): FormGroup {
    return this.fb.group({
      id: [f?.id ?? null],
      nombre: [f?.nombre ?? '', Validators.required],
      nombreCorto: [f?.nombreCorto ?? ''],
      tipoFinanciador: [f?.tipoFinanciador ?? TipoFinanciador.OBRA_SOCIAL, Validators.required],
      codigoExterno: [f?.codigoExterno ?? ''],
      ambitoCobertura: [f?.ambitoCobertura ?? ''],
      activo: [f?.activo ?? true],
    });
  }

  private formatTipo(v: string): string {
    const map: Record<string, string> = {
      OBRA_SOCIAL: 'Obra Social',
      PREPAGA: 'Prepaga',
      PAMI: 'PAMI',
      ART: 'ART',
      PARTICULAR: 'Particular',
      OTRO: 'Otro',
    };
    return map[v] ?? v;
  }

  private loadPlanesCountByFinanciador(financiadores: FinanciadorSalud[]): void {
    const ids = financiadores.map((f) => f.id).filter((id): id is string => !!id);
    if (!ids.length) {
      this.planCountByFinanciadorId.set({});
      return;
    }

    const requests = ids.map((id) =>
      this.svc.getPlanesByFinanciador(id).pipe(
        map((planes) => ({ id, count: planes.length })),
        catchError(() => of({ id, count: 0 })),
      ),
    );

    forkJoin(requests).subscribe((results) => {
      const counts = results.reduce<Record<string, number>>((acc, item) => {
        acc[item.id] = item.count;
        return acc;
      }, {});
      this.planCountByFinanciadorId.set(counts);
    });
  }
}
