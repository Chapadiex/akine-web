import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { Plan, TipoCobertura, TipoCoseguro } from '../../models/obra-social.models';

@Component({
  selector: 'app-plan-editor-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.plan ? 'Editar plan' : 'Nuevo plan' }}</h2>
    <div mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field>
          <mat-label>Nombre corto</mat-label>
          <input matInput formControlName="nombreCorto" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombreCompleto" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Tipo cobertura</mat-label>
          <mat-select formControlName="tipoCobertura">
            <mat-option value="PORCENTAJE">Porcentaje</mat-option>
            <mat-option value="MONTO">Monto</mat-option>
            <mat-option value="MIXTO">Mixto</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Valor cobertura</mat-label>
          <input matInput type="number" formControlName="valorCobertura" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Tipo coseguro</mat-label>
          <mat-select formControlName="tipoCoseguro">
            <mat-option value="MONTO">Monto</mat-option>
            <mat-option value="PORCENTAJE">Porcentaje</mat-option>
            <mat-option value="SIN_COSEGURO">Sin coseguro</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Valor coseguro</mat-label>
          <input matInput type="number" formControlName="valorCoseguro" [disabled]="sinCoseguro()" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Prestaciones sin autorización</mat-label>
          <input matInput type="number" formControlName="prestacionesSinAutorizacion" />
        </mat-form-field>

        <mat-form-field class="full-width">
          <mat-label>Observaciones</mat-label>
          <textarea matInput rows="2" formControlName="observaciones"></textarea>
        </mat-form-field>

        <mat-slide-toggle formControlName="activo">Activo</mat-slide-toggle>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Guardar</button>
    </div>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .full-width { grid-column: 1 / -1; }
  `],
})
export class PlanEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<PlanEditorDialog>);
  readonly data = inject<{ plan?: Plan }>(MAT_DIALOG_DATA);

  form = this.fb.nonNullable.group({
    nombreCorto: [this.data.plan?.nombreCorto ?? '', [Validators.required, Validators.maxLength(60)]],
    nombreCompleto: [this.data.plan?.nombreCompleto ?? '', [Validators.required, Validators.maxLength(120)]],
    tipoCobertura: [this.data.plan?.tipoCobertura ?? ('PORCENTAJE' as TipoCobertura), Validators.required],
    valorCobertura: [this.data.plan?.valorCobertura ?? 0, [Validators.required, Validators.min(0)]],
    tipoCoseguro: [this.data.plan?.tipoCoseguro ?? ('MONTO' as TipoCoseguro), Validators.required],
    valorCoseguro: [this.data.plan?.valorCoseguro ?? 0, [Validators.required, Validators.min(0)]],
    prestacionesSinAutorizacion: [this.data.plan?.prestacionesSinAutorizacion ?? 0, [Validators.required, Validators.min(0)]],
    observaciones: [this.data.plan?.observaciones ?? '', Validators.maxLength(1000)],
    activo: [this.data.plan?.activo ?? true],
  });

  constructor() {
    this.form.controls.tipoCoseguro.valueChanges.subscribe((tipo) => {
      if (tipo === 'SIN_COSEGURO') {
        this.form.controls.valorCoseguro.setValue(0);
      }
    });
  }

  sinCoseguro(): boolean {
    return this.form.controls.tipoCoseguro.value === 'SIN_COSEGURO';
  }

  close(): void {
    this.ref.close();
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if ((v.tipoCobertura === 'PORCENTAJE' || v.tipoCobertura === 'MIXTO') && v.valorCobertura > 100) {
      this.form.controls.valorCobertura.setErrors({ max: true });
      return;
    }
    if (v.tipoCoseguro === 'PORCENTAJE' && v.valorCoseguro > 100) {
      this.form.controls.valorCoseguro.setErrors({ max: true });
      return;
    }

    this.ref.close({
      ...this.data.plan,
      ...v,
      valorCoseguro: v.tipoCoseguro === 'SIN_COSEGURO' ? 0 : Number(v.valorCoseguro),
      valorCobertura: Number(v.valorCobertura),
      prestacionesSinAutorizacion: Number(v.prestacionesSinAutorizacion),
      activo: !!v.activo,
    } satisfies Plan);
  }
}

