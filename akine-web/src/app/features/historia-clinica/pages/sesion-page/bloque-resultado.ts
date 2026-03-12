import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProximaConducta, RespuestaPaciente, Tolerancia } from '../../models/historia-clinica.models';

@Component({
  selector: 'app-bloque-resultado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bloque bloque-resultado">
      <h3 class="bloque__title">Resultado de la sesión</h3>
      <div class="bloque__grid" [formGroup]="form()">

        <!-- Respuesta del paciente: segmented control -->
        <div class="field-group">
          <label class="field-label">Respuesta del paciente <span class="required">*</span></label>
          <div class="seg-ctrl seg-ctrl--respuesta">
            @for (r of respuestaOpciones; track r.value) {
              <button
                type="button"
                class="seg-btn"
                [class.seg-btn--active]="form().get('respuestaPaciente')?.value === r.value"
                [attr.data-resp]="r.value"
                (click)="setField('respuestaPaciente', r.value)"
              >{{ r.label }}</button>
            }
          </div>
        </div>

        <!-- Tolerancia: segmented control -->
        <div class="field-group">
          <label class="field-label">Tolerancia</label>
          <div class="seg-ctrl seg-ctrl--tolerancia">
            @for (t of toleranciaOpciones; track t.value) {
              <button
                type="button"
                class="seg-btn"
                [class.seg-btn--active]="form().get('tolerancia')?.value === t.value"
                [attr.data-tol]="t.value"
                (click)="setField('tolerancia', t.value)"
              >{{ t.label }}</button>
            }
          </div>
        </div>

        <!-- Evolución breve: textarea obligatoria -->
        <div class="field-group">
          <label class="field-label">Evolución clínica breve <span class="required">*</span></label>
          <textarea
            formControlName="evolucionNota"
            class="field-textarea"
            rows="3"
            placeholder="Describí brevemente la evolución del paciente en esta sesión..."
            (input)="changed.emit()"
          ></textarea>
        </div>

        <!-- Indicaciones domiciliarias -->
        <div class="field-group">
          <label class="field-label">Indicaciones domiciliarias</label>
          <div class="chip-row">
            @for (ind of indicacionesFrecuentes; track ind) {
              <button
                type="button"
                class="chip"
                [class.chip--active]="hasIndicacion(ind)"
                (click)="toggleIndicacion(ind)"
              >{{ ind }}</button>
            }
          </div>
          <textarea
            formControlName="indicacionesDomiciliarias"
            class="field-textarea field-textarea--sm"
            rows="2"
            placeholder="Otras indicaciones..."
            (input)="changed.emit()"
          ></textarea>
        </div>

        <!-- Próxima conducta: chips de selección única -->
        <div class="field-group">
          <label class="field-label">Próxima conducta <span class="required">*</span></label>
          <div class="chip-row">
            @for (c of conductaOpciones; track c.value) {
              <button
                type="button"
                class="chip chip--conducta"
                [class.chip--active]="form().get('proximaConducta')?.value === c.value"
                [attr.data-conducta]="c.value"
                (click)="setField('proximaConducta', c.value)"
              >{{ c.label }}</button>
            }
          </div>
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
      border-bottom: 2px solid #16a34a;
    }
    .bloque__grid { display: flex; flex-direction: column; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 0.82rem; font-weight: 500; color: var(--text-muted, #64748b); }
    .required { color: #dc2626; margin-left: 2px; }

    .field-textarea {
      padding: 8px 10px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      font-size: 0.88rem;
      background: var(--white, #fff);
      color: var(--text, #0f172a);
      resize: vertical;
      font-family: inherit;
    }
    .field-textarea:focus { outline: none; border-color: var(--primary, #0f766e); }
    .field-textarea--sm { max-height: 72px; }

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

    /* Conducta colors when active */
    .chip--conducta[data-conducta='ALTA'].chip--active { background: #16a34a; border-color: #16a34a; }
    .chip--conducta[data-conducta='DERIVAR'].chip--active { background: #0284c7; border-color: #0284c7; }
    .chip--conducta[data-conducta='SUSPENDER'].chip--active { background: #dc2626; border-color: #dc2626; }
    .chip--conducta[data-conducta='REEVALUAR'].chip--active { background: #d97706; border-color: #d97706; }

    /* Segmented control */
    .seg-ctrl {
      display: inline-flex;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
      flex-wrap: wrap;
    }
    .seg-btn {
      padding: 6px 14px;
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

    /* Respuesta del paciente colors */
    .seg-ctrl--respuesta .seg-btn[data-resp='FAVORABLE'].seg-btn--active { background: #16a34a; }
    .seg-ctrl--respuesta .seg-btn[data-resp='EMPEORA'].seg-btn--active { background: #dc2626; }
    .seg-ctrl--respuesta .seg-btn[data-resp='REGULAR'].seg-btn--active { background: #d97706; }

    /* Tolerancia colors */
    .seg-ctrl--tolerancia .seg-btn[data-tol='BUENA'].seg-btn--active { background: #16a34a; }
    .seg-ctrl--tolerancia .seg-btn[data-tol='MALA'].seg-btn--active { background: #dc2626; }
    .seg-ctrl--tolerancia .seg-btn[data-tol='REGULAR'].seg-btn--active { background: #d97706; }
  `,
})
export class BloqueResultadoComponent {
  readonly form = input.required<FormGroup>();
  readonly changed = output<void>();

  readonly respuestaOpciones: { value: RespuestaPaciente; label: string }[] = [
    { value: 'FAVORABLE', label: 'Favorable' },
    { value: 'PARCIAL', label: 'Parcial' },
    { value: 'SIN_CAMBIOS', label: 'Sin cambios' },
    { value: 'REGULAR', label: 'Regular' },
    { value: 'EMPEORA', label: 'Empeora' },
  ];

  readonly toleranciaOpciones: { value: Tolerancia; label: string }[] = [
    { value: 'BUENA', label: 'Buena' },
    { value: 'REGULAR', label: 'Regular' },
    { value: 'MALA', label: 'Mala' },
  ];

  readonly conductaOpciones: { value: ProximaConducta; label: string }[] = [
    { value: 'CONTINUAR', label: 'Continuar igual' },
    { value: 'AJUSTAR', label: 'Ajustar plan' },
    { value: 'REEVALUAR', label: 'Re-evaluar' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'DERIVAR', label: 'Derivar' },
    { value: 'SOLICITAR_ESTUDIO', label: 'Solicitar estudio' },
    { value: 'SUSPENDER', label: 'Suspender' },
  ];

  readonly indicacionesFrecuentes = [
    'Reposo relativo',
    'Hielo local',
    'Calor local',
    'Ejercicios domiciliarios',
    'Caminar',
    'Evitar esfuerzo',
  ];

  setField(controlName: string, value: string): void {
    const ctrl = this.form().get(controlName);
    if (!ctrl) return;
    ctrl.setValue(ctrl.value === value ? '' : value);
    this.changed.emit();
  }

  hasIndicacion(ind: string): boolean {
    const val: string = this.form().get('indicacionesDomiciliarias')?.value ?? '';
    return val.includes(ind);
  }

  toggleIndicacion(ind: string): void {
    const ctrl = this.form().get('indicacionesDomiciliarias');
    if (!ctrl) return;
    const current: string = ctrl.value ?? '';
    if (current.includes(ind)) {
      ctrl.setValue(current.replace(ind, '').replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ','));
    } else {
      ctrl.setValue(current ? `${current}, ${ind}` : ind);
    }
    this.changed.emit();
  }
}
