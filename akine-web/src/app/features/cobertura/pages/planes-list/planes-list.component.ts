import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CoberturaService } from '../../services/cobertura.service';
import { PlanFinanciador, FinanciadorSalud, TipoPlan } from '../../models/cobertura.models';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-planes-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageSectionHeaderComponent, ConfirmDialog],
  template: `
    <div class="page">
      <app-page-section-header
        title="Planes de Cobertura"
        [description]="headerDesc()"
        titleLevel="h2"
      >
        @if (financiadorId()) {
          <button header-actions class="btn-primary" type="button" (click)="openCreate()">
            + Nuevo Plan
          </button>
        }
      </app-page-section-header>

      <div class="field financiador-select">
        <label for="pla-fin">Financiador</label>
        <select id="pla-fin" [value]="financiadorId()" (change)="onFinanciadorChange($event)">
          <option value="">— Seleccione un financiador —</option>
          @for (f of financiadores(); track f.id) {
            <option [value]="f.id">{{ f.nombre }}</option>
          }
        </select>
      </div>

      @if (!financiadorId()) {
        <p class="empty">Seleccione un financiador para ver sus planes.</p>
      } @else if (isLoading()) {
        <p class="empty">Cargando planes...</p>
      } @else if (loadError()) {
        <p class="empty error-msg">No se pudieron cargar los planes. <button class="link-btn" type="button" (click)="loadPlanes(financiadorId())">Reintentar</button></p>
      } @else {
        <table class="table app-data-table">
          <thead>
            <tr>
              <th class="col-text">Plan</th>
              <th class="col-text-short">Tipo</th>
              <th class="col-text">Vigencia</th>
              <th class="col-status">Estado</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (p of planes(); track p.id) {
              <tr>
                <td class="col-text"><strong>{{ p.nombrePlan }}</strong></td>
                <td class="col-text-short">{{ tipoLabel(p.tipoPlan) }}</td>
                <td class="col-text">{{ formatVigencia(p.vigenciaDesde, p.vigenciaHasta) }}</td>
                <td class="col-status">
                  <span class="badge" [class.badge-active]="p.activo" [class.badge-inactive]="!p.activo">
                    <strong>{{ p.activo ? 'Activo' : 'Inactivo' }}</strong>
                  </span>
                </td>
                <td class="col-actions">
                  <button class="table-row-action" type="button" (click)="openEdit(p)">Editar</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">No hay planes configurados para este financiador.</td>
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
              <h4>{{ editTarget() ? 'Editar Plan' : 'Nuevo Plan' }}</h4>
              <p>{{ financiadorNombre() }}</p>
            </div>
            <button class="icon-btn" type="button" aria-label="Cerrar" (click)="closeModal()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="form-grid">
              <div class="field full-width">
                <label for="pla-nombre">Nombre del Plan *</label>
                <input
                  id="pla-nombre"
                  type="text"
                  formControlName="nombrePlan"
                  placeholder="Ej: Plan 210"
                  autofocus
                  (input)="nombreError.set(null)"
                />
                @if (form.get('nombrePlan')?.touched && form.get('nombrePlan')?.hasError('required')) {
                  <small class="field-error">El nombre del plan es obligatorio.</small>
                }
                @if (nombreError()) {
                  <small class="field-error">{{ nombreError() }}</small>
                }
              </div>

              <div class="field full-width">
                <label for="pla-tipo">Tipo de Plan *</label>
                <select id="pla-tipo" formControlName="tipoPlan">
                  @for (t of tiposPlan; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label for="pla-desde">Vigencia Desde</label>
                <input id="pla-desde" type="date" formControlName="vigenciaDesde" />
              </div>

              <div class="field">
                <label for="pla-hasta">Vigencia Hasta</label>
                <input id="pla-hasta" type="date" formControlName="vigenciaHasta" />
              </div>

              <div class="field full-width toggles">
                <label class="switch-row">
                  <input type="checkbox" formControlName="requiereAutorizacionDefault" class="switch-input" />
                  <span class="switch-track" aria-hidden="true"></span>
                  <span class="switch-label">Requiere autorización por defecto</span>
                </label>
                <label class="switch-row">
                  <input type="checkbox" formControlName="activo" class="switch-input" />
                  <span class="switch-track" aria-hidden="true"></span>
                  <span class="switch-label">Plan Activo</span>
                </label>
              </div>
            </div>

            @if (saveError()) {
              <p class="save-error">{{ saveError() }}</p>
            }
            <div class="modal-actions">
              <button class="btn-secondary" type="button" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" type="submit" [disabled]="form.invalid || isSaving()">
                {{ isSaving() ? 'Guardando...' : 'Guardar Plan' }}
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

    .financiador-select {
      max-width: 400px;
    }

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
    .col-text-short { text-align: left; width: 110px; }
    .col-status { text-align: left; width: 100px; }
    .col-actions { text-align: right; width: 100px; }

    .badge {
      display: inline-block;
      padding: .2rem .55rem;
      border-radius: 999px;
      font-size: .75rem;
    }
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
      width: min(500px, 92vw);
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
    .field input[type="text"],
    .field input[type="date"],
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
    .toggles { display: flex; flex-direction: column; gap: .5rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: .5rem; }
    .save-error { color: var(--error, #dc2626); font-size: .82rem; margin: 0 0 .25rem; }
    .error-msg { color: var(--error, #dc2626); }
    .link-btn { background: none; border: none; padding: 0; color: var(--primary); cursor: pointer; font-size: inherit; text-decoration: underline; }

    /* Toggle switch — CSS only */
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
      .col-text-short,
      .col-text:nth-child(3) { display: none; }
    }
  `],
})
export class PlanesListComponent implements OnInit {
  private svc = inject(CoberturaService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private ctx = inject(ConsultorioContextService);

  private get consultorioId(): string {
    return this.ctx.selectedConsultorioId();
  }

  financiadores = signal<FinanciadorSalud[]>([]);
  planes = signal<PlanFinanciador[]>([]);
  financiadorId = signal('');
  isLoading = signal(false);
  loadError = signal(false);
  showModal = signal(false);
  editTarget = signal<PlanFinanciador | null>(null);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  nombreError = signal<string | null>(null);
  discardTarget = signal(false);

  tiposPlan = Object.values(TipoPlan).map((v) => ({ value: v, label: this.formatTipo(v) }));
  form: FormGroup = this.buildForm(null);

  readonly headerDesc = computed(() => {
    const fin = this.financiadores().find((f) => f.id === this.financiadorId());
    const count = this.planes().length;
    if (!fin) return 'Seleccione un financiador para ver sus planes.';
    return `${count} ${count === 1 ? 'plan' : 'planes'} — ${fin.nombre}`;
  });

  readonly financiadorNombre = computed(() => {
    const fin = this.financiadores().find((f) => f.id === this.financiadorId());
    return fin ? `Financiador: ${fin.nombre}` : '';
  });

  ngOnInit(): void {
    this.svc.getFinanciadores(this.consultorioId).subscribe({
      next: (data) => {
        this.financiadores.set(data);
        const qp = this.route.snapshot.queryParamMap.get('financiadorId');
        if (qp) {
          this.financiadorId.set(qp);
          this.loadPlanes(qp);
        }
      },
    });
  }

  onFinanciadorChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.financiadorId.set(id);
    this.planes.set([]);
    if (id) this.loadPlanes(id);
  }

  loadPlanes(id: string): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    this.svc.getPlanesByFinanciador(id).subscribe({
      next: (data) => { this.planes.set(data); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.loadError.set(true); },
    });
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.form = this.buildForm(null);
    this.showModal.set(true);
  }

  openEdit(p: PlanFinanciador): void {
    this.editTarget.set(p);
    this.form = this.buildForm(p);
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
    const op$ = target
      ? this.svc.updatePlan(target.id!, this.form.value)
      : this.svc.createPlan(this.form.value);
    op$.subscribe({
      next: () => { this.forceClose(); this.loadPlanes(this.financiadorId()); },
      error: (err) => {
        this.isSaving.set(false);
        const detail: string = err?.error?.detail ?? 'No se pudo guardar. Verificá los datos e intentá de nuevo.';
        if (err?.status === 409 && detail.toLowerCase().includes('vigencia')) {
          this.nombreError.set(detail);
        } else {
          this.saveError.set(detail);
        }
      },
    });
  }

  tipoLabel(tipo: TipoPlan): string {
    return this.formatTipo(tipo);
  }

  formatVigencia(desde?: string, hasta?: string): string {
    const fDesde = desde ? this.formatDate(desde) : '—';
    const fHasta = hasta ? this.formatDate(hasta) : 'Actualidad';
    return `${fDesde} → ${fHasta}`;
  }

  private formatDate(d: string): string {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  private buildForm(p: PlanFinanciador | null): FormGroup {
    return this.fb.group({
      id: [p?.id ?? null],
      financiadorId: [this.financiadorId()],
      nombrePlan: [p?.nombrePlan ?? '', Validators.required],
      tipoPlan: [p?.tipoPlan ?? TipoPlan.PMO, Validators.required],
      vigenciaDesde: [p?.vigenciaDesde ?? ''],
      vigenciaHasta: [p?.vigenciaHasta ?? ''],
      requiereAutorizacionDefault: [p?.requiereAutorizacionDefault ?? false],
      activo: [p?.activo ?? true],
    });
  }

  private formatTipo(v: string): string {
    const map: Record<string, string> = {
      PMO: 'PMO',
      COMERCIAL: 'Comercial',
      SUPERADOR: 'Superador',
      BASICO: 'Básico',
      OTRO: 'Otro',
    };
    return map[v] ?? v;
  }
}
