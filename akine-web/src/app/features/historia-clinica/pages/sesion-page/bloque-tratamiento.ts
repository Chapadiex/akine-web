import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TratamientoCatalogItem } from '../../../consultorios/models/tratamiento-catalog.models';

@Component({
  selector: 'app-bloque-tratamiento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bloque bloque-tratamiento">
      <div class="bloque__header">
        <div class="bloque__heading">
          <h3 class="bloque__title">Tratamiento aplicado</h3>
          <p class="bloque__subtitle">{{ subtitleText() }}</p>
        </div>
        @if (editable()) {
          <button type="button" class="btn btn--sm btn--secondary" (click)="addIntervencion.emit()">
            + Intervención
          </button>
        }
      </div>

      @for (ctrl of form().controls; track $index; let i = $index) {
        <div class="intervencion-card" [formGroup]="asGroup(ctrl)">
          <div class="intervencion-header">
            <span class="intervencion-num">#{{ i + 1 }}</span>
            @if (editable()) {
              <button type="button" class="btn-icon btn-icon--danger" (click)="removeIntervencion.emit(i)" title="Eliminar">×</button>
            }
          </div>
          <div class="intervencion-grid">
            <div class="field-group">
              <label class="field-label">Tratamiento</label>
              <select formControlName="tratamientoId" class="field-select" (change)="onTratamientoSelect(asGroup(ctrl))">
                <option value="">Seleccionar...</option>
                @for (t of tratamientos(); track t.id) {
                  <option [value]="t.id">{{ t.nombre }}</option>
                }
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Técnica</label>
              <input formControlName="tecnica" class="field-input" placeholder="Técnica utilizada" (input)="changed.emit()" />
            </div>
            <div class="field-group">
              <label class="field-label">Zona</label>
              <input formControlName="zona" class="field-input" placeholder="Zona tratada" (input)="changed.emit()" />
            </div>
            <div class="field-group">
              <label class="field-label">Duración (min)</label>
              <input formControlName="duracionMinutos" type="number" class="field-input field-input--sm" min="0" (input)="changed.emit()" />
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Parámetros</label>
            <textarea formControlName="parametrosJson" class="field-textarea field-textarea--sm" rows="2"
              placeholder="Parámetros: intensidad, frecuencia, series, repeticiones..." (input)="changed.emit()"></textarea>
          </div>
          <div class="field-group">
            <label class="field-label">Observaciones</label>
            <input formControlName="observaciones" class="field-input" placeholder="Observación breve" (input)="changed.emit()" />
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .bloque { margin-bottom: 12px; }
    .bloque__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      gap: 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--accent, #0284c7);
    }
    .bloque__heading {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      min-width: 0;
      flex: 1;
    }
    .bloque__title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text, #0f172a);
      margin: 0;
      flex-shrink: 0;
    }
    .bloque__subtitle {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
      margin: 0;
      min-width: 0;
    }
    .intervencion-card {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      padding: 10px;
      margin-bottom: 8px;
      background: var(--white, #fff);
    }
    .intervencion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .intervencion-num {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--accent, #0284c7);
    }
    .intervencion-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
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
    .field-input--sm { max-width: 100px; }
    .field-textarea--sm { resize: vertical; max-height: 60px; }
    .btn--sm { padding: 5px 10px; font-size: 0.8rem; }
    .btn--secondary {
      background: var(--white, #fff);
      border: 1px solid var(--border, #e2e8f0);
      color: var(--text, #0f172a);
      border-radius: var(--radius, 6px);
      cursor: pointer;
    }
    .btn--secondary:hover { border-color: var(--primary, #0f766e); }
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .btn-icon--danger { color: var(--error, #dc2626); }
    .btn-icon--danger:hover { background: #fef2f2; }

    @media (max-width: 900px) {
      .bloque__header { align-items: flex-start; }
      .intervencion-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class BloqueTratamientoComponent {
  readonly form = input.required<FormArray<FormGroup>>();
  readonly tratamientos = input<TratamientoCatalogItem[]>([]);
  readonly editable = input(true);
  readonly changed = output<void>();
  readonly addIntervencion = output<void>();
  readonly removeIntervencion = output<number>();

  subtitleText(): string {
    return this.form().length === 0
      ? 'Sin intervenciones registradas. Agrega una para documentar el tratamiento.'
      : 'Intervenciones y técnicas aplicadas en esta sesión.';
  }

  asGroup(ctrl: unknown): FormGroup {
    return ctrl as FormGroup;
  }

  onTratamientoSelect(group: FormGroup): void {
    const id = group.get('tratamientoId')?.value;
    const item = this.tratamientos().find((t) => t.id === id);
    if (item) {
      group.get('tratamientoNombre')?.setValue(item.nombre);
      if (item.duracionSugeridaMinutos) {
        group.get('duracionMinutos')?.setValue(item.duracionSugeridaMinutos);
      }
    }
    this.changed.emit();
  }
}
