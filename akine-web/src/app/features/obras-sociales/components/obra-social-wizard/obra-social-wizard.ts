import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PlanEditorDialog } from '../plan-editor-dialog/plan-editor-dialog';
import { ObraSocial, ObraSocialUpsertRequest, Plan } from '../../models/obra-social.models';

@Component({
  selector: 'app-obra-social-wizard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancel.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h2>{{ editItem() ? 'Editar Obra Social' : 'Nueva Obra Social' }}</h2>

        <mat-stepper linear>
          <mat-step [stepControl]="step1Form">
            <form [formGroup]="step1Form" class="grid">
              <ng-template matStepLabel>Datos de Obra Social</ng-template>
              <mat-form-field><mat-label>Acrónimo</mat-label><input matInput formControlName="acronimo" /></mat-form-field>
              <mat-form-field><mat-label>Nombre completo</mat-label><input matInput formControlName="nombreCompleto" /></mat-form-field>
              <mat-form-field><mat-label>CUIT</mat-label><input matInput formControlName="cuit" /></mat-form-field>
              <mat-form-field>
                <mat-label>Estado</mat-label>
                <mat-select formControlName="estado">
                  <mat-option value="ACTIVE">Activa</mat-option>
                  <mat-option value="INACTIVE">Inactiva</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email" /></mat-form-field>
              <mat-form-field><mat-label>Teléfono</mat-label><input matInput formControlName="telefono" /></mat-form-field>
              <mat-form-field><mat-label>Teléfono alternativo</mat-label><input matInput formControlName="telefonoAlternativo" /></mat-form-field>
              <mat-form-field><mat-label>Representante</mat-label><input matInput formControlName="representante" /></mat-form-field>
              <mat-form-field class="full"><mat-label>Dirección</mat-label><input matInput formControlName="direccionLinea" /></mat-form-field>
              <mat-form-field class="full"><mat-label>Observaciones</mat-label><textarea matInput rows="2" formControlName="observacionesInternas"></textarea></mat-form-field>

              @if (nombreWarning()) {
                <p class="warn">Existe una OS con nombre similar. Verificá antes de guardar.</p>
              }
              @if (step1ContactError()) {
                <p class="error">Debés cargar email o teléfono.</p>
              }

              <div class="actions">
                <button mat-button type="button" (click)="cancel.emit()">Cancelar</button>
                <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="!canContinueStep1()">Siguiente</button>
              </div>
            </form>
          </mat-step>

          <mat-step>
            <ng-template matStepLabel>Planes</ng-template>
            <div class="step-actions">
              <button mat-stroked-button type="button" (click)="addPlan()">+ Agregar plan</button>
            </div>
            <table mat-table [dataSource]="planes()" class="full-table">
              <ng-container matColumnDef="nombreCorto"><th mat-header-cell *matHeaderCellDef>Nombre</th><td mat-cell *matCellDef="let p">{{ p.nombreCorto }}</td></ng-container>
              <ng-container matColumnDef="nombreCompleto"><th mat-header-cell *matHeaderCellDef>Nombre completo</th><td mat-cell *matCellDef="let p">{{ p.nombreCompleto }}</td></ng-container>
              <ng-container matColumnDef="cobertura"><th mat-header-cell *matHeaderCellDef>Cobertura</th><td mat-cell *matCellDef="let p">{{ p.tipoCobertura }} {{ p.valorCobertura }}</td></ng-container>
              <ng-container matColumnDef="coseguro"><th mat-header-cell *matHeaderCellDef>Coseguro</th><td mat-cell *matCellDef="let p">{{ p.tipoCoseguro }} {{ p.valorCoseguro }}</td></ng-container>
              <ng-container matColumnDef="prestaciones"><th mat-header-cell *matHeaderCellDef>Sin autorización</th><td mat-cell *matCellDef="let p">{{ p.prestacionesSinAutorizacion }}</td></ng-container>
              <ng-container matColumnDef="activo"><th mat-header-cell *matHeaderCellDef>Activo</th><td mat-cell *matCellDef="let p">{{ p.activo ? 'Sí' : 'No' }}</td></ng-container>
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let p; let i = index">
                  <button mat-icon-button type="button" (click)="editPlan(i)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" (click)="duplicatePlan(i)"><mat-icon>content_copy</mat-icon></button>
                  <button mat-icon-button type="button" (click)="removePlan(i)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="planCols"></tr>
              <tr mat-row *matRowDef="let row; columns: planCols"></tr>
            </table>

            <p class="hint">Estos valores son referenciales del plan. Si el consultorio define un convenio, puede sobreescribirlos.</p>
            @if (planes().length === 0) {
              <p class="error">Debés cargar al menos 1 plan.</p>
            }

            <div class="actions">
              <button mat-button type="button" matStepperPrevious>Atrás</button>
              <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="planes().length === 0">Siguiente</button>
            </div>
          </mat-step>

          <mat-step>
            <ng-template matStepLabel>Resumen</ng-template>
            <div class="summary">
              <p><b>Acrónimo:</b> {{ step1Form.value.acronimo }}</p>
              <p><b>Nombre:</b> {{ step1Form.value.nombreCompleto }}</p>
              <p><b>CUIT:</b> {{ step1Form.value.cuit }}</p>
              <p><b>Contacto:</b> {{ step1Form.value.email || step1Form.value.telefono || '—' }}</p>
              <p><b>Dirección:</b> {{ step1Form.value.direccionLinea || '—' }}</p>
              <p><b>Estado:</b> {{ step1Form.value.estado === 'ACTIVE' ? 'Activa' : 'Inactiva' }}</p>
            </div>

            <table mat-table [dataSource]="planes()" class="full-table">
              <ng-container matColumnDef="nombreCorto"><th mat-header-cell *matHeaderCellDef>Nombre</th><td mat-cell *matCellDef="let p">{{ p.nombreCorto }}</td></ng-container>
              <ng-container matColumnDef="nombreCompleto"><th mat-header-cell *matHeaderCellDef>Nombre completo</th><td mat-cell *matCellDef="let p">{{ p.nombreCompleto }}</td></ng-container>
              <ng-container matColumnDef="cobertura"><th mat-header-cell *matHeaderCellDef>Cobertura</th><td mat-cell *matCellDef="let p">{{ p.tipoCobertura }} {{ p.valorCobertura }}</td></ng-container>
              <ng-container matColumnDef="coseguro"><th mat-header-cell *matHeaderCellDef>Coseguro</th><td mat-cell *matCellDef="let p">{{ p.tipoCoseguro }} {{ p.valorCoseguro }}</td></ng-container>
              <ng-container matColumnDef="acciones"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let _; let i = index"><button mat-button type="button" (click)="editPlan(i)">Editar</button></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="summaryCols"></tr>
              <tr mat-row *matRowDef="let row; columns: summaryCols"></tr>
            </table>

            <div class="actions">
              <button mat-button type="button" matStepperPrevious>Atrás</button>
              <button mat-button type="button" (click)="cancel.emit()">Cancelar</button>
              <button mat-flat-button color="primary" type="button" (click)="submit()">Guardar</button>
            </div>
          </mat-step>
        </mat-stepper>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / .45); display: flex; justify-content: center; align-items: center; z-index: 1200; }
    .panel { background: var(--white); width: min(1000px, 95vw); max-height: 92vh; overflow: auto; border-radius: 12px; padding: 1.25rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .full { grid-column: 1 / -1; }
    .full-table { width: 100%; margin-top: .75rem; }
    .step-actions { margin: .5rem 0; }
    .actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: .25rem .75rem; margin-bottom: 1rem; }
    .hint { font-size: .85rem; color: var(--text-muted); margin-top: .75rem; }
    .warn { color: var(--warning); font-size: .85rem; }
    .error { color: var(--error); font-size: .85rem; }
  `],
})
export class ObraSocialWizard {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  editItem = input<ObraSocial | null>(null);
  existingNames = input<string[]>([]);
  save = output<ObraSocialUpsertRequest>();
  cancel = output<void>();

  readonly planCols = ['nombreCorto', 'nombreCompleto', 'cobertura', 'coseguro', 'prestaciones', 'activo', 'acciones'];
  readonly summaryCols = ['nombreCorto', 'nombreCompleto', 'cobertura', 'coseguro', 'acciones'];

  readonly planes = signal<Plan[]>([]);

  readonly step1Form = this.fb.nonNullable.group({
    acronimo: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    cuit: ['', [Validators.required, Validators.maxLength(13)]],
    estado: ['ACTIVE' as 'ACTIVE' | 'INACTIVE'],
    email: ['', Validators.email],
    telefono: [''],
    telefonoAlternativo: [''],
    representante: [''],
    observacionesInternas: [''],
    direccionLinea: [''],
  });

  readonly nombreWarning = computed(() => {
    const value = (this.step1Form.controls.nombreCompleto.value ?? '').trim().toLowerCase();
    return !!value && this.existingNames().some((n) => n.toLowerCase() === value);
  });

  constructor() {
    effect(() => {
      const item = this.editItem();
      if (!item) {
        this.step1Form.reset({
          acronimo: '',
          nombreCompleto: '',
          cuit: '',
          estado: 'ACTIVE',
          email: '',
          telefono: '',
          telefonoAlternativo: '',
          representante: '',
          observacionesInternas: '',
          direccionLinea: '',
        });
        this.planes.set([]);
        return;
      }
      this.step1Form.patchValue({
        acronimo: item.acronimo,
        nombreCompleto: item.nombreCompleto,
        cuit: item.cuit,
        estado: item.estado,
        email: item.email ?? '',
        telefono: item.telefono ?? '',
        telefonoAlternativo: item.telefonoAlternativo ?? '',
        representante: item.representante ?? '',
        observacionesInternas: item.observacionesInternas ?? '',
        direccionLinea: item.direccionLinea ?? '',
      });
      this.planes.set(item.planes ?? []);
    });
  }

  step1ContactError(): boolean {
    const email = this.step1Form.controls.email.value?.trim();
    const tel = this.step1Form.controls.telefono.value?.trim();
    return !email && !tel;
  }

  canContinueStep1(): boolean {
    return this.step1Form.valid && !this.step1ContactError();
  }

  addPlan(): void {
    this.dialog.open(PlanEditorDialog, { width: '720px', data: {} }).afterClosed().subscribe((plan?: Plan) => {
      if (!plan) return;
      if (this.existsShortName(plan.nombreCorto)) return;
      this.planes.update((curr) => [...curr, plan]);
    });
  }

  editPlan(index: number): void {
    const current = this.planes()[index];
    this.dialog.open(PlanEditorDialog, { width: '720px', data: { plan: current } }).afterClosed().subscribe((plan?: Plan) => {
      if (!plan) return;
      if (this.existsShortName(plan.nombreCorto, index)) return;
      this.planes.update((curr) => curr.map((p, i) => (i === index ? plan : p)));
    });
  }

  duplicatePlan(index: number): void {
    const source = this.planes()[index];
    const copyName = `${source.nombreCorto} copia`;
    if (this.existsShortName(copyName)) return;
    this.planes.update((curr) => [...curr, { ...source, id: undefined, nombreCorto: copyName }]);
  }

  removePlan(index: number): void {
    this.planes.update((curr) => curr.filter((_, i) => i !== index));
  }

  submit(): void {
    if (!this.canContinueStep1() || this.planes().length === 0) return;
    const v = this.step1Form.getRawValue();
    this.save.emit({
      acronimo: v.acronimo,
      nombreCompleto: v.nombreCompleto,
      cuit: v.cuit,
      estado: v.estado,
      email: v.email || undefined,
      telefono: v.telefono || undefined,
      telefonoAlternativo: v.telefonoAlternativo || undefined,
      representante: v.representante || undefined,
      observacionesInternas: v.observacionesInternas || undefined,
      direccionLinea: v.direccionLinea || undefined,
      planes: this.planes(),
    });
  }

  private existsShortName(name: string, ignoreIndex?: number): boolean {
    const normalized = name.trim().toLowerCase();
    return this.planes().some((p, i) => i !== ignoreIndex && p.nombreCorto.trim().toLowerCase() === normalized);
  }
}
