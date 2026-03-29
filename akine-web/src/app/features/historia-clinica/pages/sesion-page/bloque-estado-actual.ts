import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
      <div class="bloque__heading">
        <h3 class="bloque__title">Estado actual</h3>
        <p class="bloque__subtitle">Cómo llega el paciente a esta sesión</p>
      </div>

      <div class="estado-grid" [formGroup]="form()">
        <div class="field-group estado-grid__dolor">
          <label class="field-label">Dolor actual</label>
          <div class="dolor-block">
            <div class="dolor-scale-row">
              <span class="dolor-min">0</span>
              <input
                type="range" min="0" max="10" step="1"
                formControlName="dolorIntensidad"
                class="dolor-slider"
                [style.accentColor]="dolorColor()"
                (input)="changed.emit()"
              />
              <span class="dolor-max">10</span>
              <span
                class="dolor-badge"
                [style.color]="dolorColor()"
                [style.borderColor]="dolorColor()"
                [style.backgroundColor]="dolorBgColor()"
              >
                {{ form().get('dolorIntensidad')?.value ?? 5 }}/10
              </span>
            </div>
            <div class="dolor-labels-row">
              <span>Sin dolor</span>
              <span>Moderado</span>
              <span>Intenso</span>
            </div>
          </div>
        </div>

        <div class="field-group estado-grid__evolucion">
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

        <div class="field-group estado-grid__zona">
          <label class="field-label">Zona de dolor</label>
          <input
            formControlName="dolorZona"
            placeholder="Ej: rodilla derecha, hombro..."
            class="field-input"
            (input)="changed.emit()"
          />
        </div>
      </div>
    </section>
  `,
  styles: `
    .bloque { margin-bottom: 12px; }
    .bloque__heading {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--primary, #0f766e);
    }
    .bloque__title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text, #0f172a);
      margin: 0;
    }
    .bloque__subtitle {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
      margin: 0;
    }
    .estado-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    .estado-grid__zona { grid-column: 1 / -1; }

    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 0.82rem; font-weight: 500; color: var(--text-muted, #64748b); }

    .dolor-block {
      background: #f8fafc;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      padding: 10px 12px 8px;
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
      font-size: 1.05rem;
      font-weight: 700;
      min-width: 52px;
      text-align: center;
      padding: 3px 10px;
      border-radius: 999px;
      background: #fff;
      border: 1px solid var(--border, #e2e8f0);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 90ms linear, border-color 90ms linear, background-color 90ms linear;
    }

    .dolor-labels-row {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 0.68rem;
      color: var(--text-muted, #64748b);
    }

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

    .comparativa {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      background: #f8fafc;
      padding: 3px 8px;
      border-radius: 4px;
      border-left: 3px solid var(--primary, #0f766e);
      margin-bottom: 5px;
    }

    .seg-ctrl {
      display: inline-flex;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
    }
    .seg-btn {
      padding: 8px 16px;
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
    }
    .seg-btn:last-child { border-right: none; }
    .seg-btn:hover { background: #f1f5f9; color: var(--text, #0f172a); }
    .seg-btn--active { color: #fff; }
    .seg-icon { font-size: 1rem; }

    .seg-ctrl--evol .seg-btn[data-evol='MEJOR'].seg-btn--active { background: #16a34a; border-color: #16a34a; }
    .seg-ctrl--evol .seg-btn[data-evol='IGUAL'].seg-btn--active { background: #64748b; border-color: #64748b; }
    .seg-ctrl--evol .seg-btn[data-evol='PEOR'].seg-btn--active  { background: #dc2626; border-color: #dc2626; }

    @media (max-width: 900px) {
      .estado-grid { grid-template-columns: 1fr; }
      .estado-grid__zona { grid-column: auto; }
    }
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

  readonly dolorColor = () => {
    const raw = this.form().get('dolorIntensidad')?.value ?? 5;
    const value = Number.isNaN(Number(raw)) ? 5 : Math.min(10, Math.max(0, Number(raw)));
    return this.dolorScaleColor(value);
  };

  readonly dolorBgColor = () => {
    const raw = this.form().get('dolorIntensidad')?.value ?? 5;
    const value = Number.isNaN(Number(raw)) ? 5 : Math.min(10, Math.max(0, Number(raw)));
    return this.dolorScaleColor(value, true);
  };

  private dolorScaleColor(value: number, soft = false): string {
    const green: [number, number, number] = [22, 163, 74];  // 0
    const amber: [number, number, number] = [217, 119, 6];  // 5
    const red: [number, number, number] = [220, 38, 38];    // 10
    const p = Math.min(10, Math.max(0, value));

    const from = p <= 5 ? green : amber;
    const to = p <= 5 ? amber : red;
    const t = p <= 5 ? p / 5 : (p - 5) / 5;

    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);

    if (!soft) return `rgb(${r}, ${g}, ${b})`;

    const mix = 0.9;
    const sr = Math.round(r + (255 - r) * mix);
    const sg = Math.round(g + (255 - g) * mix);
    const sb = Math.round(b + (255 - b) * mix);
    return `rgb(${sr}, ${sg}, ${sb})`;
  }

  setField(controlName: string, value: string): void {
    const ctrl = this.form().get(controlName);
    if (!ctrl) return;
    ctrl.setValue(ctrl.value === value ? '' : value);
    this.changed.emit();
  }
}
