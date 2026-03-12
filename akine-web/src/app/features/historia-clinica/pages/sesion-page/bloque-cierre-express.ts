import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProximaConducta, RespuestaPaciente, Tolerancia } from '../../models/historia-clinica.models';

@Component({
  selector: 'app-bloque-cierre-express',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bloque bloque-cierre">
      <h3 class="bloque__title">Cierre rápido</h3>
      <p class="bloque__subtitle">Cómo se va el paciente y qué sigue</p>

      <div class="bloque__grid" [formGroup]="form()">

        <!-- Respuesta: segmented prominente -->
        <div class="field-group">
          <label class="field-label field-label--required">Respuesta del paciente</label>
          <div class="seg-ctrl seg-ctrl--respuesta">
            @for (r of respuestaOpciones; track r.value) {
              <button
                type="button"
                class="seg-btn"
                [class.seg-btn--active]="form().get('respuestaPaciente')?.value === r.value"
                [attr.data-resp]="r.value"
                (click)="setField('respuestaPaciente', r.value)"
              >
                <span class="seg-icon">{{ r.icon }}</span>
                {{ r.label }}
              </button>
            }
          </div>
        </div>

        <!-- Tolerancia: segmented compacto -->
        <div class="field-group">
          <label class="field-label">Tolerancia al tratamiento</label>
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

        <!-- Evolución breve: textarea pequeña pero obligatoria -->
        <div class="field-group">
          <label class="field-label field-label--required">Evolución clínica breve</label>
          <textarea
            formControlName="evolucionNota"
            class="field-textarea"
            rows="2"
            placeholder="Describí brevemente cómo respondió el paciente..."
            (input)="changed.emit()"
          ></textarea>
        </div>

        <!-- Próxima conducta: chips con peso visual diferente según importancia -->
        <div class="field-group">
          <label class="field-label field-label--required">Próxima conducta</label>
          <div class="chip-row">
            @for (c of conductaOpciones; track c.value) {
              <button
                type="button"
                class="chip"
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
    .bloque { margin-bottom: 16px; }
    .bloque__title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text, #0f172a);
      margin-bottom: 2px;
      padding-bottom: 6px;
      border-bottom: 2px solid #16a34a;
    }
    .bloque__subtitle {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
      margin: 0 0 14px;
    }
    .bloque__grid { display: flex; flex-direction: column; gap: 16px; }

    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 0.82rem; font-weight: 500; color: var(--text-muted, #64748b); }
    .field-label--required::after { content: ' *'; color: #dc2626; }

    .field-textarea {
      padding: 8px 10px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      font-size: 0.88rem;
      background: var(--white, #fff);
      color: var(--text, #0f172a);
      resize: vertical;
      font-family: inherit;
      max-height: 72px;
    }
    .field-textarea:focus { outline: none; border-color: var(--primary, #0f766e); }

    /* Segmented controls */
    .seg-ctrl {
      display: inline-flex;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
      flex-wrap: wrap;
    }
    .seg-btn {
      padding: 7px 16px;
      font-size: 0.85rem;
      font-weight: 500;
      border: none;
      background: var(--white, #fff);
      color: var(--text-muted, #64748b);
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border-right: 1px solid var(--border, #e2e8f0);
      &:last-child { border-right: none; }
      &:hover { background: #f1f5f9; color: var(--text, #0f172a); }
      &--active { color: #fff; }
    }
    .seg-icon { font-size: 0.9rem; }

    /* Respuesta colors */
    .seg-ctrl--respuesta .seg-btn[data-resp='FAVORABLE'].seg-btn--active { background: #16a34a; }
    .seg-ctrl--respuesta .seg-btn[data-resp='PARCIAL'].seg-btn--active   { background: #0f766e; }
    .seg-ctrl--respuesta .seg-btn[data-resp='SIN_CAMBIOS'].seg-btn--active { background: #64748b; }
    .seg-ctrl--respuesta .seg-btn[data-resp='REGULAR'].seg-btn--active   { background: #d97706; }
    .seg-ctrl--respuesta .seg-btn[data-resp='EMPEORA'].seg-btn--active   { background: #dc2626; }

    /* Tolerancia colors */
    .seg-ctrl--tolerancia .seg-btn[data-tol='BUENA'].seg-btn--active   { background: #16a34a; }
    .seg-ctrl--tolerancia .seg-btn[data-tol='REGULAR'].seg-btn--active { background: #d97706; }
    .seg-ctrl--tolerancia .seg-btn[data-tol='MALA'].seg-btn--active    { background: #dc2626; }

    /* Chips conducta */
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--white, #fff);
      cursor: pointer;
      transition: all 0.15s;
      color: var(--text, #0f172a);
    }
    .chip:hover { border-color: var(--primary, #0f766e); }
    .chip--active { background: var(--primary, #0f766e); color: #fff; border-color: var(--primary, #0f766e); }
    .chip[data-conducta='ALTA'].chip--active      { background: #16a34a; border-color: #16a34a; }
    .chip[data-conducta='DERIVAR'].chip--active   { background: #0284c7; border-color: #0284c7; }
    .chip[data-conducta='SUSPENDER'].chip--active { background: #dc2626; border-color: #dc2626; }
    .chip[data-conducta='REEVALUAR'].chip--active { background: #d97706; border-color: #d97706; }
  `,
})
export class BloqueCierreExpressComponent {
  readonly form = input.required<FormGroup>();
  readonly changed = output<void>();

  readonly respuestaOpciones: { value: RespuestaPaciente; label: string; icon: string }[] = [
    { value: 'FAVORABLE',  label: 'Favorable',   icon: '✓' },
    { value: 'PARCIAL',    label: 'Parcial',      icon: '◑' },
    { value: 'SIN_CAMBIOS',label: 'Sin cambios', icon: '→' },
    { value: 'REGULAR',    label: 'Regular',      icon: '!' },
    { value: 'EMPEORA',    label: 'Empeora',      icon: '↓' },
  ];

  readonly toleranciaOpciones: { value: Tolerancia; label: string }[] = [
    { value: 'BUENA',   label: 'Buena' },
    { value: 'REGULAR', label: 'Regular' },
    { value: 'MALA',    label: 'Mala' },
  ];

  readonly conductaOpciones: { value: ProximaConducta; label: string }[] = [
    { value: 'CONTINUAR',        label: 'Continuar igual' },
    { value: 'AJUSTAR',          label: 'Ajustar plan' },
    { value: 'REEVALUAR',        label: 'Re-evaluar' },
    { value: 'ALTA',             label: 'Alta' },
    { value: 'DERIVAR',          label: 'Derivar' },
    { value: 'SOLICITAR_ESTUDIO',label: 'Pedir estudio' },
    { value: 'SUSPENDER',        label: 'Suspender' },
  ];

  setField(controlName: string, value: string): void {
    const ctrl = this.form().get(controlName);
    if (!ctrl) return;
    ctrl.setValue(ctrl.value === value ? '' : value);
    this.changed.emit();
  }
}
