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
import { PacienteCobertura, FinanciadorSalud, PlanFinanciador } from '../../models/cobertura.models';
import { CoberturaService } from '../../services/cobertura.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-cobertura-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule, ConfirmDialog
  ],
  template: `
    <div class="dialog-container">
      <header mat-dialog-title class="compact">
        <div class="title-group">
          <h2>{{ isEdit ? 'Editar' : 'Asignar' }} Cobertura</h2>
          <p class="subtitle">Vincule una obra social/prepaga al paciente</p>
        </div>
        <button mat-icon-button (click)="onClose()" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSave()">
        <mat-dialog-content class="akine-form">
          <div class="form-grid">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Financiador (Obra Social/Prepaga)</mat-label>
              <mat-select formControlName="financiadorId" (selectionChange)="onFinanciadorChange($event.value)" cdkFocusInitial>
                @for (fin of financiadores; track fin.id) {
                  <mat-option [value]="fin.id">{{ fin.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Plan</mat-label>
              <mat-select formControlName="planId" [disabled]="!planes.length">
                <mat-option [value]="null">Sin plan específico</mat-option>
                @for (plan of planes; track plan.id) {
                  <mat-option [value]="plan.id">{{ plan.nombrePlan }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nº de Afiliado / Credencial</mat-label>
              <input matInput formControlName="numeroAfiliado">
            </mat-form-field>

            <div class="toggles full-width">
              <mat-slide-toggle formControlName="principal" class="mb-2 block">Es la cobertura principal</mat-slide-toggle>
              <mat-slide-toggle formControlName="activo" class="block">Cobertura Activa</mat-slide-toggle>
            </div>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="onClose()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || isSaving">
            Guardar Cobertura
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
export class CoberturaFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CoberturaService);
  private ctx = inject(ConsultorioContextService);
  private get consultorioId(): string { return this.ctx.selectedConsultorioId(); }
  
  form: FormGroup;
  isEdit = false;
  isSaving = false;
  financiadores: FinanciadorSalud[] = [];
  planes: PlanFinanciador[] = [];
  pacienteId: string;
  showConfirmDiscard = signal(false);

  constructor(
    public dialogRef: MatDialogRef<CoberturaFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cobertura: PacienteCobertura | null, pacienteId: string }
  ) {
    this.isEdit = !!data.cobertura;
    this.pacienteId = data.pacienteId;
    this.form = this.fb.group({
      id: [data.cobertura?.id],
      pacienteId: [this.pacienteId],
      financiadorId: [data.cobertura?.financiadorId, Validators.required],
      planId: [data.cobertura?.planId],
      numeroAfiliado: [data.cobertura?.numeroAfiliado],
      principal: [data.cobertura?.principal ?? true],
      activo: [data.cobertura?.activo ?? true]
    });
  }

  ngOnInit() {
    this.service.getFinanciadores(this.consultorioId).subscribe((data: FinanciadorSalud[]) => this.financiadores = data.filter(f => f.activo));
    if (this.isEdit && this.data.cobertura?.financiadorId) {
      this.onFinanciadorChange(this.data.cobertura.financiadorId);
    }
  }

  onFinanciadorChange(financiadorId: string) {
    this.service.getPlanesByFinanciador(financiadorId).subscribe((data: PlanFinanciador[]) => this.planes = data.filter(p => p.activo));
  }

  onSave() {
    if (this.form.invalid) return;
    this.isSaving = true;
    this.service.createPacienteCobertura(this.form.value).subscribe({
      next: (res: PacienteCobertura) => { this.isSaving = false; this.dialogRef.close(res); },
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
