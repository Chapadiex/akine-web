import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PlanFinanciador, TipoPlan, FinanciadorSalud } from '../../models/cobertura.models';
import { CoberturaService } from '../../services/cobertura.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-plan-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatDatepickerModule, MatNativeDateModule, ConfirmDialog
  ],
  template: `
    <div class="dialog-container">
      <header mat-dialog-title class="compact">
        <div class="title-group">
          <h2>{{ isEdit ? 'Editar' : 'Nuevo' }} Plan</h2>
          <p class="subtitle">Financiador: {{ financiador.nombre }}</p>
        </div>
        <button mat-icon-button (click)="onClose()" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSave()">
        <mat-dialog-content class="akine-form">
          <div class="form-grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre del Plan</mat-label>
              <input matInput formControlName="nombrePlan" placeholder="Ej: Plan 210" cdkFocusInitial>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tipo de Plan</mat-label>
              <mat-select formControlName="tipoPlan">
                @for (tipo of tiposPlan; track tipo) {
                  <mat-option [value]="tipo">{{ tipo }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="form-grid-2-col full-width" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <mat-form-field appearance="outline">
                <mat-label>Vigencia Desde</mat-label>
                <input matInput [matDatepicker]="pickerDesde" formControlName="vigenciaDesde">
                <mat-datepicker-toggle matIconSuffix [for]="pickerDesde"></mat-datepicker-toggle>
                <mat-datepicker #pickerDesde></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Vigencia Hasta</mat-label>
                <input matInput [matDatepicker]="pickerHasta" formControlName="vigenciaHasta">
                <mat-datepicker-toggle matIconSuffix [for]="pickerHasta"></mat-datepicker-toggle>
                <mat-datepicker #pickerHasta></mat-datepicker>
              </mat-form-field>
            </div>

            <div class="toggles full-width">
              <mat-slide-toggle formControlName="requiereAutorizacionDefault" class="mb-2 block">Requiere autorización por defecto</mat-slide-toggle>
              <mat-slide-toggle formControlName="activo" class="block">Plan Activo</mat-slide-toggle>
            </div>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="onClose()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || isSaving">
            {{ isSaving ? 'Guardando...' : 'Guardar Plan' }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>

    @if (showConfirmDiscard()) {
      <app-confirm-dialog
        title="¿Descartar cambios?"
        message="Hay datos cargados que todavía no fueron guardados."
        confirmLabel="Descartar"
        (confirmed)="dialogRef.close()"
        (cancelled)="showConfirmDiscard.set(false)" />
    }
  `,
  styles: [`
    .dialog-container { min-width: 400px; }
    .title-group h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .subtitle { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding-top: 8px; }
    .full-width { grid-column: 1 / -1; }
    .toggles { padding: 8px 0; display: flex; flex-direction: column; gap: 12px; }
    mat-dialog-title { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 12px; }
  `]
})
export class PlanFormDialogComponent {
  private fb = inject(FormBuilder);
  private service = inject(CoberturaService);
  
  form: FormGroup;
  isEdit = false;
  isSaving = false;
  tiposPlan = Object.values(TipoPlan);
  financiador: FinanciadorSalud;
  showConfirmDiscard = signal(false);

  constructor(
    public dialogRef: MatDialogRef<PlanFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { plan: PlanFinanciador | null, financiador: FinanciadorSalud }
  ) {
    this.isEdit = !!data.plan;
    this.financiador = data.financiador;
    this.form = this.fb.group({
      id: [data.plan?.id],
      financiadorId: [this.financiador.id],
      nombrePlan: [data.plan?.nombrePlan || '', Validators.required],
      tipoPlan: [data.plan?.tipoPlan || TipoPlan.PMO, Validators.required],
      requiereAutorizacionDefault: [data.plan?.requiereAutorizacionDefault ?? false],
      vigenciaDesde: [data.plan?.vigenciaDesde],
      vigenciaHasta: [data.plan?.vigenciaHasta],
      activo: [data.plan?.activo ?? true]
    });
  }

  onSave() {
    if (this.form.invalid) return;
    this.isSaving = true;
    this.service.createPlan(this.form.value).subscribe({
      next: (res) => { this.isSaving = false; this.dialogRef.close(res); },
      error: () => { this.isSaving = false; }
    });
  }

  onClose() {
    if (this.form.dirty) {
      this.showConfirmDiscard.set(true);
    } else {
      this.dialogRef.close();
    }
  }
}
