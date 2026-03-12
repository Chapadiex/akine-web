import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-bloque-administrativo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="bloque bloque-admin">
      <summary class="bloque__toggle">Administrativo</summary>
      <div class="bloque__content" [formGroup]="form()">
        <div class="admin-grid">
          <div class="field-group">
            <label class="field-label">Tipo de atención</label>
            <select formControlName="tipoAtencion" class="field-select" (change)="changed.emit()">
              <option value="EVALUACION">Evaluación</option>
              <option value="SEGUIMIENTO">Seguimiento</option>
              <option value="TRATAMIENTO">Tratamiento</option>
              <option value="INTERCONSULTA">Interconsulta</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Motivo de consulta</label>
            <input formControlName="motivoConsulta" class="field-input" placeholder="Motivo" (input)="changed.emit()" />
          </div>
          <div class="field-group">
            <label class="field-label">Resumen clínico</label>
            <textarea formControlName="resumenClinico" class="field-textarea" rows="2" placeholder="Resumen" (input)="changed.emit()"></textarea>
          </div>
        </div>
      </div>
    </details>
  `,
  styles: `
    .bloque-admin {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      margin-bottom: 20px;
    }
    .bloque__toggle {
      padding: 10px 16px;
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      user-select: none;
      list-style: none;
    }
    .bloque__toggle::marker { content: ''; }
    .bloque__toggle::before {
      content: '▸ ';
      font-size: 0.8rem;
    }
    details[open] .bloque__toggle::before { content: '▾ '; }
    .bloque__content {
      padding: 0 16px 16px;
    }
    .admin-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .field-group { display: flex; flex-direction: column; gap: 4px; }
    .field-label { font-size: 0.78rem; font-weight: 500; color: var(--text-muted, #64748b); }
    .field-input, .field-select, .field-textarea {
      padding: 7px 10px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      font-size: 0.85rem;
      background: var(--white, #fff);
      color: var(--text, #0f172a);
    }
    .field-input:focus, .field-select:focus, .field-textarea:focus {
      outline: none;
      border-color: var(--primary, #0f766e);
    }
    .field-textarea { resize: vertical; }
  `,
})
export class BloqueAdministrativoComponent {
  readonly form = input.required<FormGroup>();
  readonly changed = output<void>();
}
