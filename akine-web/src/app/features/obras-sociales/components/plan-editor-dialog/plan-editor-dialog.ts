import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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

    <div mat-dialog-content class="content">
      <p class="intro">Configurá la regla base de cobertura, coseguro y validación administrativa para este plan.</p>

      <form [formGroup]="form" class="form-grid">
        <section class="section-card">
          <h3>Identificación</h3>
          <div class="section-grid">
            <mat-form-field>
              <mat-label>Nombre corto</mat-label>
              <input matInput formControlName="nombreCorto" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Nombre completo</mat-label>
              <input matInput formControlName="nombreCompleto" />
            </mat-form-field>
          </div>
        </section>

        <section class="section-card">
          <h3>Cobertura y coseguro</h3>
          <div class="section-grid">
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
          </div>
        </section>

        <section class="section-card">
          <h3>Operación</h3>
          <div class="section-grid">
            <mat-form-field>
              <mat-label>Prestaciones sin autorización</mat-label>
              <input matInput type="number" formControlName="prestacionesSinAutorizacion" />
            </mat-form-field>
            <div class="toggle-wrap">
              <mat-slide-toggle formControlName="activo">Plan activo</mat-slide-toggle>
            </div>
            <mat-form-field class="full-width">
              <mat-label>Observaciones</mat-label>
              <textarea matInput rows="3" formControlName="observaciones"></textarea>
            </mat-form-field>
          </div>
        </section>
      </form>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="save()">Guardar</button>
    </div>
  `,
  styles: [`
    .content {
      display: grid;
      gap: .9rem;
      padding-top: .25rem;
    }
    .intro {
      margin: 0;
      color: var(--text-muted);
      font-size: .9rem;
    }
    .form-grid,
    .section-grid {
      display: grid;
      gap: .8rem;
    }
    .section-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: .9rem;
      background: var(--white);
      display: grid;
      gap: .8rem;
    }
    .section-card h3 {
      margin: 0;
      color: var(--text);
      font-size: .95rem;
    }
    .section-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .toggle-wrap {
      display: flex;
      align-items: center;
      min-height: 56px;
      padding: 0 .25rem;
    }
    @media (max-width: 640px) {
      .section-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .toggle-wrap {
        min-height: auto;
        padding: .2rem 0;
      }
    }
  `],
})
export class PlanEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<PlanEditorDialog>);
  readonly data = inject<{ plan?: Plan }>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
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

    const value = this.form.getRawValue();
    if ((value.tipoCobertura === 'PORCENTAJE' || value.tipoCobertura === 'MIXTO') && value.valorCobertura > 100) {
      this.form.controls.valorCobertura.setErrors({ max: true });
      return;
    }
    if (value.tipoCoseguro === 'PORCENTAJE' && value.valorCoseguro > 100) {
      this.form.controls.valorCoseguro.setErrors({ max: true });
      return;
    }

    this.ref.close({
      ...this.data.plan,
      ...value,
      valorCoseguro: value.tipoCoseguro === 'SIN_COSEGURO' ? 0 : Number(value.valorCoseguro),
      valorCobertura: Number(value.valorCobertura),
      prestacionesSinAutorizacion: Number(value.prestacionesSinAutorizacion),
      activo: !!value.activo,
    } satisfies Plan);
  }
}
