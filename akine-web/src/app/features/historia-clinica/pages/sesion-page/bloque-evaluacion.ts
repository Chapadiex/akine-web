import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  DolorComportamiento,
  DolorTipo,
  EvolucionDesdeAnterior,
  SesionEvaluacionDTO,
} from '../../models/historia-clinica.models';

@Component({
  selector: 'app-bloque-evaluacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bloque bloque-evaluacion">
      <h3 class="bloque__title">Evaluación clínica</h3>

      <div class="bloque__grid" [formGroup]="form()">

        <!-- Dolor actual -->
        <div class="field-group field-group--dolor">
          <label class="field-label">Dolor actual</label>
          <div class="dolor-row">
            <div class="dolor-scale">
              <input
                type="range" min="0" max="10"
                formControlName="dolorIntensidad"
                class="dolor-slider"
                (input)="changed.emit()"
              />
              <span class="dolor-value" [class.dolor-high]="(form().get('dolorIntensidad')?.value ?? 0) >= 7">
                {{ form().get('dolorIntensidad')?.value ?? 0 }}/10
              </span>
            </div>
            <input
              formControlName="dolorZona"
              placeholder="Zona"
              class="field-input field-input--sm"
              (input)="changed.emit()"
            />
          </div>

          <!-- Lateralidad: segmented control -->
          <div class="field-subgroup">
            <span class="field-sublabel">Lateralidad</span>
            <div class="seg-ctrl">
              @for (lat of lateralidadOpciones; track lat.value) {
                <button
                  type="button"
                  class="seg-btn"
                  [class.seg-btn--active]="form().get('dolorLateralidad')?.value === lat.value"
                  (click)="setField('dolorLateralidad', lat.value)"
                >{{ lat.label }}</button>
              }
            </div>
          </div>

          <!-- Tipo de dolor: chips (múltiple semántica) -->
          <div class="chip-row">
            @for (tipo of dolorTipos; track tipo) {
              <button
                type="button"
                class="chip"
                [class.chip--active]="form().get('dolorTipo')?.value === tipo"
                (click)="setField('dolorTipo', tipo)"
              >{{ dolorTipoLabel(tipo) }}</button>
            }
          </div>

          <!-- Comportamiento: chips -->
          <div class="chip-row">
            @for (comp of dolorComportamientos; track comp) {
              <button
                type="button"
                class="chip"
                [class.chip--active]="form().get('dolorComportamiento')?.value === comp"
                (click)="setField('dolorComportamiento', comp)"
              >{{ dolorCompLabel(comp) }}</button>
            }
          </div>

          @if (previousEval(); as prev) {
            @if (prev.dolorIntensidad != null) {
              <div class="comparativa">
                Sesión anterior: dolor {{ prev.dolorIntensidad }}/10
                @if (prev.dolorZona) { · {{ prev.dolorZona }} }
              </div>
            }
          }
        </div>

        <!-- Evolución desde sesión anterior: segmented control -->
        <div class="field-group">
          <label class="field-label">Evolución desde la sesión anterior</label>
          <div class="seg-ctrl seg-ctrl--evol">
            @for (ev of evolucionOpciones; track ev.value) {
              <button
                type="button"
                class="seg-btn"
                [class.seg-btn--active]="form().get('evolucionEstado')?.value === ev.value"
                [attr.data-evol]="ev.value"
                (click)="setField('evolucionEstado', ev.value)"
              >{{ ev.label }}</button>
            }
          </div>
        </div>

        <!-- Objetivo de la sesión -->
        <div class="field-group">
          <label class="field-label">Objetivo de la sesión</label>
          <div class="chip-row">
            @for (obj of objetivosFrecuentes; track obj) {
              <button
                type="button"
                class="chip"
                [class.chip--active]="form().get('objetivoSesion')?.value === obj"
                (click)="setField('objetivoSesion', obj)"
              >{{ obj }}</button>
            }
          </div>
          <input
            formControlName="objetivoSesion"
            placeholder="Otro objetivo..."
            class="field-input"
            (input)="changed.emit()"
          />
        </div>

        <!-- Limitación funcional -->
        <div class="field-group">
          <label class="field-label">Limitación funcional actual</label>
          <div class="chip-row">
            @for (lim of limitacionesFrecuentes; track lim) {
              <button
                type="button"
                class="chip"
                [class.chip--active]="form().get('limitacionFuncional')?.value === lim"
                (click)="setField('limitacionFuncional', lim)"
              >{{ lim }}</button>
            }
          </div>
          <input
            formControlName="limitacionFuncional"
            placeholder="Otra limitación..."
            class="field-input"
            (input)="changed.emit()"
          />
        </div>

      </div>
    </section>
  `,
  styles: `
    .bloque { margin-bottom: 20px; }
    .bloque__title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text, #0f172a);
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid var(--primary, #0f766e);
    }
    .bloque__grid { display: flex; flex-direction: column; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-subgroup { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .field-label { font-size: 0.82rem; font-weight: 500; color: var(--text-muted, #64748b); }
    .field-sublabel { font-size: 0.78rem; color: var(--text-muted, #64748b); white-space: nowrap; }
    .field-input {
      padding: 8px 10px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      font-size: 0.88rem;
      background: var(--white, #fff);
      color: var(--text, #0f172a);
      transition: border-color 0.15s;
    }
    .field-input:focus { outline: none; border-color: var(--primary, #0f766e); }
    .field-input--sm { max-width: 160px; }

    /* Pain scale */
    .dolor-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .dolor-scale { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; }
    .dolor-slider { flex: 1; accent-color: var(--primary, #0f766e); }
    .dolor-value { font-weight: 600; font-size: 1rem; min-width: 44px; text-align: center; }
    .dolor-high { color: var(--error, #dc2626); }

    /* Chips */
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.78rem;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--white, #fff);
      cursor: pointer;
      transition: all 0.15s;
      color: var(--text, #0f172a);
    }
    .chip:hover { border-color: var(--primary, #0f766e); }
    .chip--active { background: var(--primary, #0f766e); color: #fff; border-color: var(--primary, #0f766e); }

    /* Segmented control */
    .seg-ctrl {
      display: inline-flex;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
    }
    .seg-btn {
      padding: 5px 14px;
      font-size: 0.82rem;
      font-weight: 500;
      border: none;
      background: var(--white, #fff);
      color: var(--text-muted, #64748b);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      border-right: 1px solid var(--border, #e2e8f0);
      &:last-child { border-right: none; }
      &:hover { background: #f1f5f9; color: var(--text, #0f172a); }
      &--active { background: var(--primary, #0f766e); color: #fff; }
    }
    /* Evolution colors when active */
    .seg-ctrl--evol .seg-btn[data-evol='MEJOR'].seg-btn--active { background: #16a34a; }
    .seg-ctrl--evol .seg-btn[data-evol='PEOR'].seg-btn--active { background: #dc2626; }
    .seg-ctrl--evol .seg-btn[data-evol='IGUAL'].seg-btn--active { background: #64748b; }

    /* Comparativa */
    .comparativa {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
      background: #f8fafc;
      padding: 4px 10px;
      border-radius: 4px;
      border-left: 3px solid var(--primary, #0f766e);
    }
  `,
})
export class BloqueEvaluacionComponent {
  readonly form = input.required<FormGroup>();
  readonly previousEval = input<SesionEvaluacionDTO | null>(null);
  readonly changed = output<void>();

  readonly dolorTipos: DolorTipo[] = ['PUNZANTE', 'QUEMANTE', 'DIFUSO', 'MECANICO', 'OTRO'];
  readonly dolorComportamientos: DolorComportamiento[] = ['MEJORA', 'EMPEORA', 'CONSTANTE', 'INTERMITENTE'];

  readonly lateralidadOpciones = [
    { value: 'DERECHA', label: 'Derecha' },
    { value: 'IZQUIERDA', label: 'Izquierda' },
    { value: 'BILATERAL', label: 'Bilateral' },
    { value: 'NA', label: 'N/A' },
  ];

  readonly evolucionOpciones: { value: EvolucionDesdeAnterior; label: string }[] = [
    { value: 'MEJOR', label: 'Mejor' },
    { value: 'IGUAL', label: 'Igual' },
    { value: 'PEOR', label: 'Peor' },
  ];

  readonly objetivosFrecuentes = [
    'Disminuir dolor',
    'Mejorar movilidad',
    'Mejorar fuerza',
    'Mejorar marcha',
    'Mejorar funcionalidad',
    'Sostener plan',
    'Re-evaluar evolución',
  ];

  readonly limitacionesFrecuentes = [
    'Caminar',
    'Subir escaleras',
    'Levantar brazo',
    'Girar cuello',
    'Sentarse/pararse',
    'Tareas laborales',
    'Deporte',
    'Sueño',
  ];

  setField(controlName: string, value: string): void {
    const ctrl = this.form().get(controlName);
    if (!ctrl) return;
    ctrl.setValue(ctrl.value === value ? '' : value);
    this.changed.emit();
  }

  dolorTipoLabel(t: DolorTipo): string {
    const m: Record<DolorTipo, string> = {
      PUNZANTE: 'Punzante', QUEMANTE: 'Quemante', DIFUSO: 'Difuso', MECANICO: 'Mecánico', OTRO: 'Otro',
    };
    return m[t];
  }

  dolorCompLabel(c: DolorComportamiento): string {
    const m: Record<DolorComportamiento, string> = {
      MEJORA: 'Mejora', EMPEORA: 'Empeora', CONSTANTE: 'Constante', INTERMITENTE: 'Intermitente',
    };
    return m[c];
  }
}
