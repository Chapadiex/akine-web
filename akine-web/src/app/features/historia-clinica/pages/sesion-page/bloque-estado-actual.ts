import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EvolucionDesdeAnterior, SesionEvaluacionDTO } from '../../models/historia-clinica.models';

@Component({
  selector: 'app-bloque-estado-actual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bloque bloque-estado">
      <h3 class="bloque__title">Estado actual</h3>
      <p class="bloque__subtitle">Cómo llega el paciente a esta sesión</p>

      <div class="bloque__grid" [formGroup]="form()">

        <!-- Dolor: slider prominente -->
        <div class="field-group">
          <label class="field-label">Dolor actual</label>
          <div class="dolor-block">
            <div class="dolor-scale-row">
              <span class="dolor-min">0</span>
              <input
                type="range" min="0" max="10" step="1"
                formControlName="dolorIntensidad"
                class="dolor-slider"
                (input)="changed.emit()"
              />
              <span class="dolor-max">10</span>
              <span class="dolor-badge" [attr.data-nivel]="nivelDolor()">
                {{ form().get('dolorIntensidad')?.value ?? 0 }}/10
              </span>
            </div>
            <div class="dolor-labels-row">
              <span>Sin dolor</span>
              <span>Moderado</span>
              <span>Intenso</span>
            </div>
          </div>
        </div>

        <!-- Zona: solo si dolor > 0 -->
        @if ((form().get('dolorIntensidad')?.value ?? 0) > 0) {
          <div class="field-group field-group--inline">
            <label class="field-label">Zona de dolor</label>
            <input
              formControlName="dolorZona"
              placeholder="Ej: rodilla derecha, hombro..."
              class="field-input"
              (input)="changed.emit()"
            />
          </div>
        }

        <!-- Evolución desde la última sesión -->
        <div class="field-group">
          <label class="field-label">Evolución desde la última sesión</label>
          @if (previousEval()?.dolorIntensidad != null) {
            <div class="comparativa">
              Última sesión: dolor {{ previousEval()!.dolorIntensidad }}/10
              @if (previousEval()?.dolorZona) { · {{ previousEval()!.dolorZona }} }
            </div>
          }
          <div class="seg-ctrl seg-ctrl--evol">
            @for (ev of evolucionOpciones; track ev.value) {
              <button
                type="button"
                class="seg-btn"
                [class.seg-btn--active]="form().get('evolucionEstado')?.value === ev.value"
                [attr.data-evol]="ev.value"
                (click)="setField('evolucionEstado', ev.value)"
              >
                <span class="seg-icon">{{ ev.icon }}</span>
                {{ ev.label }}
              </button>
            }
          </div>
        </div>

      </div>
    </section>
  `,
  styles: `
    .bloque { margin-bottom: 16px; }
    .bloque__title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text, #0f172a);
      margin-bottom: 2px;
      padding-bottom: 6px;
      border-bottom: 2px solid var(--primary, #0f766e);
    }
    .bloque__subtitle {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
      margin: 0 0 14px;
    }
    .bloque__grid { display: flex; flex-direction: column; gap: 16px; }

    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-group--inline { flex-direction: row; align-items: center; gap: 12px; }
    .field-group--inline .field-label { white-space: nowrap; flex-shrink: 0; }
    .field-label { font-size: 0.82rem; font-weight: 500; color: var(--text-muted, #64748b); }

    /* Dolor block */
    .dolor-block {
      background: #f8fafc;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      padding: 14px 16px 10px;
    }
    .dolor-scale-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dolor-min, .dolor-max {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      min-width: 16px;
      text-align: center;
    }
    .dolor-slider {
      flex: 1;
      accent-color: var(--primary, #0f766e);
      height: 6px;
    }
    .dolor-badge {
      font-size: 1.1rem;
      font-weight: 700;
      min-width: 52px;
      text-align: center;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--white, #fff);
      border: 1px solid var(--border, #e2e8f0);
    }
    .dolor-badge[data-nivel='none'] { color: #64748b; }
    .dolor-badge[data-nivel='low'] { color: #16a34a; border-color: #bbf7d0; background: #f0fdf4; }
    .dolor-badge[data-nivel='mid'] { color: #d97706; border-color: #fde68a; background: #fffbeb; }
    .dolor-badge[data-nivel='high'] { color: #dc2626; border-color: #fecaca; background: #fef2f2; }

    .dolor-labels-row {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 0.68rem;
      color: var(--text-muted, #64748b);
    }

    /* Zona */
    .field-input {
      flex: 1;
      padding: 7px 10px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      font-size: 0.88rem;
      background: var(--white, #fff);
      color: var(--text, #0f172a);
    }
    .field-input:focus { outline: none; border-color: var(--primary, #0f766e); }

    /* Evolución */
    .comparativa {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      background: #f8fafc;
      padding: 4px 10px;
      border-radius: 4px;
      border-left: 3px solid var(--primary, #0f766e);
      margin-bottom: 6px;
    }

    .seg-ctrl {
      display: inline-flex;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
    }
    .seg-btn {
      padding: 8px 20px;
      font-size: 0.85rem;
      font-weight: 500;
      border: none;
      background: var(--white, #fff);
      color: var(--text-muted, #64748b);
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
      border-right: 1px solid var(--border, #e2e8f0);
      &:last-child { border-right: none; }
      &:hover { background: #f1f5f9; color: var(--text, #0f172a); }
      &--active { color: #fff; }
    }
    .seg-icon { font-size: 1rem; }

    .seg-ctrl--evol .seg-btn[data-evol='MEJOR'].seg-btn--active { background: #16a34a; border-color: #16a34a; }
    .seg-ctrl--evol .seg-btn[data-evol='IGUAL'].seg-btn--active { background: #64748b; border-color: #64748b; }
    .seg-ctrl--evol .seg-btn[data-evol='PEOR'].seg-btn--active  { background: #dc2626; border-color: #dc2626; }
  `,
})
export class BloqueEstadoActualComponent {
  readonly form = input.required<FormGroup>();
  readonly previousEval = input<SesionEvaluacionDTO | null>(null);
  readonly changed = output<void>();

  readonly evolucionOpciones: { value: EvolucionDesdeAnterior; label: string; icon: string }[] = [
    { value: 'MEJOR', label: 'Mejor', icon: '↑' },
    { value: 'IGUAL', label: 'Igual', icon: '→' },
    { value: 'PEOR',  label: 'Peor',  icon: '↓' },
  ];

  readonly nivelDolor = computed(() => {
    const v = this.form().get('dolorIntensidad')?.value ?? 0;
    if (v === 0) return 'none';
    if (v <= 3) return 'low';
    if (v <= 6) return 'mid';
    return 'high';
  });

  setField(controlName: string, value: string): void {
    const ctrl = this.form().get(controlName);
    if (!ctrl) return;
    ctrl.setValue(ctrl.value === value ? '' : value);
    this.changed.emit();
  }
}
