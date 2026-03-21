import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { CoberturaService } from '../../../cobertura/services/cobertura.service';
import { FinanciadorSalud, PlanFinanciador, TipoFinanciador } from '../../../cobertura/models/cobertura.models';

export interface FinanciadorPlanSelectorValue {
  financiadorId?: string;
  financiadorNombre?: string;
  planId?: string;
  planNombre?: string;
  nroAfiliado?: string;
  esParticular: boolean;
  financiadorHistoricoInactivo?: boolean;
  planHistoricoInactivoOVencido?: boolean;
}

interface FinanciadorOption {
  id: string;
  nombre: string;
  particular: boolean;
  historicoInactivo: boolean;
}

interface PlanOption {
  id: string;
  nombre: string;
  historicoInactivoOVencido: boolean;
}

const PARTICULAR_ID = 'PARTICULAR';
const PARTICULAR_NOMBRE = 'PARTICULAR';

@Component({
  selector: 'app-financiador-plan-selector',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp-shell">
      <div class="field financiador-field">
        <label [attr.for]="financiadorTriggerId">Financiador *</label>

        <button
          type="button"
          class="selector-trigger"
          [id]="financiadorTriggerId"
          [disabled]="!editable()"
          [class.selector-trigger-open]="financiadorOpen()"
          [class.field-error]="showValidationErrors() && !isValid()"
          (click)="toggleFinanciadorOpen()"
        >
          <span class="selector-trigger-copy">
            {{ selectedFinanciadorLabel() }}
          </span>
          <span
            class="selector-trigger-status"
            [class.selector-trigger-status-warning]="selectedFinanciador()?.historicoInactivo"
          >
            @if (selectedFinanciador()?.historicoInactivo) {
              Inactivo (historico)
            } @else if (selectedFinanciador()?.particular) {
              Particular
            } @else {
              Activo
            }
          </span>
          <span class="selector-trigger-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
              <path d="m5 7 5 6 5-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>

        @if (financiadorOpen() && editable()) {
          <div class="selector-panel">
            <div class="selector-search-row">
              <input
                type="text"
                class="selector-search"
                [value]="financiadorQuery()"
                placeholder="Buscar financiador activo"
                (input)="updateFinanciadorQuery($any($event.target).value)"
              />
            </div>

            <div class="selector-options" role="listbox" aria-label="Opciones de financiador">
              @for (option of filteredFinanciadores(); track option.id) {
                <button
                  type="button"
                  class="selector-option"
                  [class.selector-option-active]="selectedFinanciador()?.id === option.id"
                  (click)="selectFinanciador(option)"
                >
                  <span>{{ option.nombre }}</span>
                  <small>{{ option.particular ? 'Particular' : 'Activo' }}</small>
                </button>
              }
              @if (filteredFinanciadores().length === 0) {
                <div class="selector-empty">No hay financiadores activos para la busqueda actual.</div>
              }
            </div>
          </div>
        }

        @if (showValidationErrors() && !isValid()) {
          <span class="error-msg">{{ validationMessage() }}</span>
        }
      </div>

      @if (!isParticular()) {
        <div class="grid">
          <div class="field">
            <label [attr.for]="planSelectId">Plan *</label>
            <select
              [id]="planSelectId"
              [disabled]="!editable() || isLoadingPlanes() || availablePlanes().length === 0"
              [value]="selectedPlan()?.id || ''"
              [class.field-error]="showValidationErrors() && !isPlanValid()"
              (change)="onPlanChange($any($event.target).value)"
            >
              <option value="">
                @if (isLoadingPlanes()) {
                  Cargando planes...
                } @else if (availablePlanes().length === 0) {
                  Sin planes vigentes
                } @else {
                  Seleccionar plan
                }
              </option>
              @for (plan of availablePlanes(); track plan.id) {
                <option [value]="plan.id">{{ plan.nombre }}</option>
              }
              @if (selectedPlan()?.historicoInactivoOVencido) {
                <option [value]="selectedPlan()?.id">{{ selectedPlan()?.nombre }} (historico inactivo)</option>
              }
            </select>
            @if (noPlanesDisponiblesMessage()) {
              <span class="warning-msg">{{ noPlanesDisponiblesMessage() }}</span>
            }
            @if (showValidationErrors() && !isPlanValid() && !noPlanesDisponiblesMessage()) {
              <span class="error-msg">Selecciona un plan vigente para la obra social.</span>
            }
          </div>

          <div class="field">
            <label [attr.for]="afiliadoInputId">Nro. afiliado</label>
            <input
              [id]="afiliadoInputId"
              [value]="nroAfiliado()"
              [disabled]="!editable()"
              placeholder="Numero de afiliado"
              (input)="onAfiliadoInput($any($event.target).value)"
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }
    .fp-shell {
      display: grid;
      gap: .75rem;
      width: 100%;
      min-width: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .75rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: .35rem;
      margin-bottom: .82rem;
      min-width: 0;
    }
    .field label {
      font-size: .85rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .field input,
    .field select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      padding: .55rem .75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      outline: none;
      font-size: .95rem;
      background: var(--white);
      font-family: inherit;
      min-height: 40px;
    }
    .field input:focus,
    .field select:focus,
    .selector-trigger:focus,
    .selector-search:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }
    .financiador-field {
      position: relative;
      margin-bottom: 0;
    }
    .selector-trigger {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      min-height: 42px;
      padding: .55rem .75rem;
      display: flex;
      align-items: center;
      gap: .55rem;
      cursor: pointer;
      text-align: left;
    }
    .selector-trigger:disabled {
      cursor: not-allowed;
      opacity: .75;
    }
    .selector-trigger-copy {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
      font-size: .95rem;
    }
    .selector-trigger-status {
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
      background: color-mix(in srgb, var(--primary) 8%, var(--white));
      color: var(--primary);
      font-size: .72rem;
      font-weight: 600;
      padding: .1rem .45rem;
      line-height: 1.35;
      flex: 0 0 auto;
      max-width: 128px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .selector-trigger-status-warning {
      border-color: color-mix(in srgb, var(--warning) 28%, var(--border));
      background: color-mix(in srgb, var(--warning) 12%, var(--white));
      color: color-mix(in srgb, var(--warning) 86%, var(--text));
    }
    .selector-trigger-icon {
      display: inline-grid;
      place-items: center;
      color: var(--text-muted);
      flex: 0 0 auto;
    }
    .selector-trigger-open {
      border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
      background: color-mix(in srgb, var(--primary) 4%, var(--white));
    }
    .selector-panel {
      margin-top: .35rem;
      border: 1px solid color-mix(in srgb, var(--primary) 14%, var(--border));
      border-radius: 12px;
      background: var(--white);
      box-shadow: var(--shadow-lg);
      padding: .65rem;
      display: grid;
      gap: .55rem;
      z-index: 16;
      position: static;
      width: 100%;
      box-sizing: border-box;
    }
    .selector-search {
      width: 100%;
      min-height: 40px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: .55rem .7rem;
      font-size: .92rem;
      outline: none;
      background: color-mix(in srgb, var(--bg) 24%, var(--white));
      box-sizing: border-box;
    }
    .selector-options {
      max-height: 220px;
      overflow: auto;
      display: grid;
      gap: .2rem;
      padding-right: .1rem;
    }
    .selector-option {
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 9px;
      display: flex;
      justify-content: space-between;
      gap: .5rem;
      align-items: center;
      padding: .48rem .58rem;
      cursor: pointer;
      text-align: left;
      color: var(--text);
    }
    .selector-option small {
      color: var(--text-muted);
      font-size: .72rem;
      font-weight: 600;
      flex: 0 0 auto;
    }
    .selector-option:hover {
      background: color-mix(in srgb, var(--primary) 8%, var(--white));
      border-color: color-mix(in srgb, var(--primary) 12%, var(--border));
    }
    .selector-option-active {
      background: color-mix(in srgb, var(--primary) 8%, var(--white));
      border-color: color-mix(in srgb, var(--primary) 12%, var(--border));
      color: var(--primary);
    }
    .selector-empty {
      padding: .58rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--bg) 30%, var(--white));
      color: var(--text-muted);
      font-size: .86rem;
    }
    .field-error {
      border-color: #e53e3e !important;
      background: color-mix(in srgb, #e53e3e 4%, var(--white)) !important;
    }
    .warning-msg {
      font-size: .78rem;
      color: color-mix(in srgb, var(--warning) 85%, var(--text));
      font-weight: 500;
    }
    .error-msg {
      font-size: .78rem;
      color: #c53030;
      font-weight: 500;
      margin-top: -.1rem;
    }
    @media (max-width: 720px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 0;
      }
      .selector-trigger-status {
        display: none;
      }
    }
  `],
})
export class FinanciadorPlanSelector {
  readonly consultorioId = input<string>('');
  readonly initialValue = input<FinanciadorPlanSelectorValue | null>(null);
  readonly editable = input<boolean>(true);
  readonly context = input<'alta' | 'edicion'>('alta');
  readonly showValidationErrors = input<boolean>(false);

  readonly valueChange = output<FinanciadorPlanSelectorValue>();
  readonly validChange = output<boolean>();

  private readonly coberturaService = inject(CoberturaService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private hydrationKey = '';

  readonly financiadorTriggerId = `fp-financiador-${Math.random().toString(36).slice(2, 8)}`;
  readonly planSelectId = `fp-plan-${Math.random().toString(36).slice(2, 8)}`;
  readonly afiliadoInputId = `fp-afiliado-${Math.random().toString(36).slice(2, 8)}`;

  readonly financiadorOpen = signal(false);
  readonly financiadorQuery = signal('');
  readonly financiadores = signal<FinanciadorOption[]>([
    { id: PARTICULAR_ID, nombre: PARTICULAR_NOMBRE, particular: true, historicoInactivo: false },
  ]);
  readonly selectedFinanciador = signal<FinanciadorOption | null>(null);
  readonly availablePlanes = signal<PlanOption[]>([]);
  readonly selectedPlan = signal<PlanOption | null>(null);
  readonly nroAfiliado = signal('');
  readonly isLoadingPlanes = signal(false);
  readonly noPlanesDisponiblesMessage = signal<string | null>(null);

  readonly isParticular = computed(() => this.selectedFinanciador()?.particular ?? true);
  readonly isPlanValid = computed(() =>
    this.isParticular() || (!!this.selectedPlan() && !this.selectedPlan()!.historicoInactivoOVencido),
  );
  readonly isValid = computed(() => {
    const financiador = this.selectedFinanciador();
    if (!financiador) return false;
    if (financiador.particular) return true;
    if (financiador.historicoInactivo) return false;
    return this.isPlanValid() && !this.noPlanesDisponiblesMessage();
  });

  readonly selectedFinanciadorLabel = computed(() => {
    const selected = this.selectedFinanciador();
    return selected ? selected.nombre : PARTICULAR_NOMBRE;
  });

  readonly filteredFinanciadores = computed(() => {
    const query = this.normalize(this.financiadorQuery());
    return this.financiadores()
      .filter((item) => !item.historicoInactivo)
      .filter((item) => this.normalize(item.nombre).includes(query));
  });

  readonly validationMessage = computed(() => {
    if (this.selectedFinanciador()?.particular) {
      return 'Selecciona un financiador valido.';
    }
    if (this.selectedFinanciador()?.historicoInactivo) {
      return 'El financiador historico esta inactivo. Selecciona uno activo para guardar.';
    }
    if (this.noPlanesDisponiblesMessage()) {
      return this.noPlanesDisponiblesMessage()!;
    }
    if (!this.selectedPlan() || this.selectedPlan()?.historicoInactivoOVencido) {
      return 'Selecciona un plan vigente para continuar.';
    }
    return 'Selecciona un financiador valido.';
  });

  constructor() {
    effect(() => {
      const consultorioId = this.consultorioId();
      this.loadFinanciadores(consultorioId);
    });

    effect(() => {
      const nextHydrationKey = JSON.stringify({
        consultorioId: this.consultorioId(),
        initialValue: this.initialValue(),
        context: this.context(),
      });
      if (nextHydrationKey === this.hydrationKey) {
        return;
      }
      this.hydrationKey = nextHydrationKey;
      this.hydrateSelection();
    });

    effect(() => {
      this.validChange.emit(this.isValid());
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.financiadorOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.financiadorOpen.set(false);
  }

  toggleFinanciadorOpen(): void {
    if (!this.editable()) return;
    const next = !this.financiadorOpen();
    this.financiadorOpen.set(next);
    this.financiadorQuery.set('');
  }

  updateFinanciadorQuery(value: string): void {
    this.financiadorQuery.set(value);
  }

  selectFinanciador(option: FinanciadorOption): void {
    this.selectedFinanciador.set(option);
    this.selectedPlan.set(null);
    this.availablePlanes.set([]);
    this.nroAfiliado.set('');
    this.noPlanesDisponiblesMessage.set(null);
    this.financiadorOpen.set(false);
    this.financiadorQuery.set('');

    if (option.particular || option.historicoInactivo) {
      this.emitSelection();
      return;
    }

    this.loadPlanes(option.id);
  }

  onPlanChange(planId: string): void {
    if (!planId) {
      this.selectedPlan.set(null);
      this.emitSelection();
      return;
    }

    const selected = this.availablePlanes().find((plan) => plan.id === planId)
      ?? this.selectedPlan();
    this.selectedPlan.set(selected ?? null);
    this.emitSelection();
  }

  onAfiliadoInput(value: string): void {
    this.nroAfiliado.set(value);
    this.emitSelection();
  }

  private loadFinanciadores(consultorioId: string): void {
    if (!consultorioId) {
      this.financiadores.set([{ id: PARTICULAR_ID, nombre: PARTICULAR_NOMBRE, particular: true, historicoInactivo: false }]);
      return;
    }

    this.coberturaService.getFinanciadores(consultorioId).pipe(
      catchError(() => of([] as FinanciadorSalud[])),
    ).subscribe((items) => {
      const activeItems = items.filter((item) => item.activo !== false);
      const mapped: FinanciadorOption[] = activeItems.map((item) => ({
        id: item.id ?? '',
        nombre: item.nombre,
        particular: item.tipoFinanciador === TipoFinanciador.PARTICULAR,
        historicoInactivo: false,
      })).filter((item) => !!item.id && !!item.nombre);

      const hasParticular = mapped.some((item) => item.particular);
      const list = hasParticular
        ? mapped
        : [{ id: PARTICULAR_ID, nombre: PARTICULAR_NOMBRE, particular: true, historicoInactivo: false }, ...mapped];

      this.financiadores.set(list);
      this.hydrateSelection();
    });
  }

  private hydrateSelection(): void {
    const current = this.initialValue();
    const allFinanciadores = this.financiadores();

    if (!current || current.esParticular || !current.financiadorNombre) {
      const particular = allFinanciadores.find((item) => item.particular)
        ?? { id: PARTICULAR_ID, nombre: PARTICULAR_NOMBRE, particular: true, historicoInactivo: false };
      this.selectedFinanciador.set(particular);
      this.selectedPlan.set(null);
      this.availablePlanes.set([]);
      this.nroAfiliado.set('');
      this.noPlanesDisponiblesMessage.set(null);
      this.emitSelection();
      return;
    }

    const matched = allFinanciadores.find((option) => {
      if (current.financiadorId && option.id === current.financiadorId) return true;
      return this.normalize(option.nombre) === this.normalize(current.financiadorNombre ?? '');
    });

    if (!matched) {
      const historical: FinanciadorOption = {
        id: `historico-${this.normalize(current.financiadorNombre)}`,
        nombre: current.financiadorNombre,
        particular: false,
        historicoInactivo: true,
      };
      this.selectedFinanciador.set(historical);
      this.availablePlanes.set([]);
      this.selectedPlan.set(current.planNombre ? {
        id: current.planId ?? `historico-plan-${this.normalize(current.planNombre)}`,
        nombre: current.planNombre,
        historicoInactivoOVencido: true,
      } : null);
      this.nroAfiliado.set(current.nroAfiliado ?? '');
      this.noPlanesDisponiblesMessage.set(null);
      this.emitSelection();
      return;
    }

    this.selectedFinanciador.set(matched);
    this.nroAfiliado.set(current.nroAfiliado ?? '');

    if (matched.particular) {
      this.availablePlanes.set([]);
      this.selectedPlan.set(null);
      this.noPlanesDisponiblesMessage.set(null);
      this.emitSelection();
      return;
    }

    this.loadPlanes(matched.id, current.planId, current.planNombre);
  }

  private loadPlanes(financiadorId: string, initialPlanId?: string, initialPlanName?: string): void {
    if (!financiadorId || financiadorId === PARTICULAR_ID) {
      this.availablePlanes.set([]);
      this.selectedPlan.set(null);
      this.noPlanesDisponiblesMessage.set(null);
      this.emitSelection();
      return;
    }

    this.isLoadingPlanes.set(true);
    this.coberturaService.getPlanesByFinanciador(financiadorId).pipe(
      catchError(() => of([] as PlanFinanciador[])),
    ).subscribe((plans) => {
      const validPlans = plans
        .filter((plan) => plan.activo !== false)
        .filter((plan) => this.isVigente(plan.vigenciaDesde, plan.vigenciaHasta))
        .map((plan) => ({ id: plan.id ?? '', nombre: plan.nombrePlan, historicoInactivoOVencido: false }))
        .filter((plan) => !!plan.id && !!plan.nombre);

      this.availablePlanes.set(validPlans);
      this.isLoadingPlanes.set(false);

      if (validPlans.length === 0) {
        this.noPlanesDisponiblesMessage.set('Esta obra social no tiene planes vigentes disponibles');
      } else {
        this.noPlanesDisponiblesMessage.set(null);
      }

      const matchedById = initialPlanId
        ? validPlans.find((plan) => plan.id === initialPlanId)
        : null;
      const matchedByName = !matchedById && initialPlanName
        ? validPlans.find((plan) => this.normalize(plan.nombre) === this.normalize(initialPlanName))
        : null;
      const matched = matchedById ?? matchedByName;

      if (matched) {
        this.selectedPlan.set(matched);
      } else if (initialPlanName) {
        this.selectedPlan.set({
          id: initialPlanId ?? `historico-plan-${this.normalize(initialPlanName)}`,
          nombre: initialPlanName,
          historicoInactivoOVencido: true,
        });
      } else {
        this.selectedPlan.set(null);
      }

      this.emitSelection();
    });
  }

  private emitSelection(): void {
    const financiador = this.selectedFinanciador();
    const plan = this.selectedPlan();
    const particular = financiador?.particular ?? true;

    const payload: FinanciadorPlanSelectorValue = {
      esParticular: particular,
      financiadorId: particular || !financiador || financiador.historicoInactivo ? undefined : financiador.id,
      financiadorNombre: particular ? PARTICULAR_NOMBRE : financiador?.nombre,
      planId: particular || !plan || plan.historicoInactivoOVencido ? undefined : plan.id,
      planNombre: particular ? undefined : plan?.nombre,
      nroAfiliado: particular ? undefined : this.toOptional(this.nroAfiliado()),
      financiadorHistoricoInactivo: !!financiador?.historicoInactivo,
      planHistoricoInactivoOVencido: !!plan?.historicoInactivoOVencido,
    };

    this.valueChange.emit(payload);
  }

  private normalize(value?: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isVigente(vigenciaDesde?: string, vigenciaHasta?: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = vigenciaDesde ? new Date(vigenciaDesde) : null;
    const to = vigenciaHasta ? new Date(vigenciaHasta) : null;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(0, 0, 0, 0);

    if (from && today < from) return false;
    if (to && today > to) return false;
    return true;
  }

  private toOptional(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }
}
