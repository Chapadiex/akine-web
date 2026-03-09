import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
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
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancel.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <header class="panel-head">
          <div class="panel-copy">
            <h2>{{ editItem() ? 'Editar obra social' : 'Nueva obra social' }}</h2>
            <p>Definí datos administrativos, planes y reglas base de cobertura para el consultorio.</p>
          </div>

          <div class="panel-summary">
            <article class="summary-chip">
              <span>Estado</span>
              <strong>{{ step1Form.controls.estado.value === 'ACTIVE' ? 'Activa' : 'Inactiva' }}</strong>
            </article>
            <article class="summary-chip">
              <span>Planes</span>
              <strong>{{ planes().length }}</strong>
            </article>
          </div>
        </header>

        <mat-stepper linear>
          <mat-step [stepControl]="step1Form">
            <ng-template matStepLabel>Datos administrativos</ng-template>

            <form [formGroup]="step1Form" class="step-grid">
              <section class="form-section-card">
                <div class="section-title">
                  <h3>Identificación</h3>
                  <p>Datos visibles para la operación y conciliación de convenios.</p>
                </div>

                <div class="form-grid">
                  <mat-form-field>
                    <mat-label>Acrónimo</mat-label>
                    <input matInput formControlName="acronimo" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Nombre completo</mat-label>
                    <input matInput formControlName="nombreCompleto" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>CUIT</mat-label>
                    <input matInput formControlName="cuit" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Estado</mat-label>
                    <mat-select formControlName="estado">
                      <mat-option value="ACTIVE">Activa</mat-option>
                      <mat-option value="INACTIVE">Inactiva</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </section>

              <section class="form-section-card">
                <div class="section-title">
                  <h3>Contacto</h3>
                  <p>Se requiere al menos un canal principal para la gestión administrativa.</p>
                </div>

                <div class="form-grid">
                  <mat-form-field>
                    <mat-label>Email</mat-label>
                    <input matInput formControlName="email" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Teléfono</mat-label>
                    <input matInput formControlName="telefono" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Teléfono alternativo</mat-label>
                    <input matInput formControlName="telefonoAlternativo" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Representante</mat-label>
                    <input matInput formControlName="representante" />
                  </mat-form-field>
                  <mat-form-field class="full">
                    <mat-label>Dirección</mat-label>
                    <input matInput formControlName="direccionLinea" />
                  </mat-form-field>
                  <mat-form-field class="full">
                    <mat-label>Observaciones internas</mat-label>
                    <textarea matInput rows="3" formControlName="observacionesInternas"></textarea>
                  </mat-form-field>
                </div>
              </section>

              @if (nombreWarning() || step1ContactError()) {
                <div class="warning-stack">
                  @if (nombreWarning()) {
                    <p class="inline-message inline-message--warn">Ya existe una obra social con el mismo nombre visible en este consultorio.</p>
                  }
                  @if (step1ContactError()) {
                    <p class="inline-message inline-message--error">Debés cargar email o teléfono antes de continuar.</p>
                  }
                </div>
              }

              <footer class="actions">
                <button mat-button type="button" (click)="cancel.emit()">Cancelar</button>
                <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="!canContinueStep1()">Siguiente</button>
              </footer>
            </form>
          </mat-step>

          <mat-step>
            <ng-template matStepLabel>Planes</ng-template>

            <section class="plans-step">
              <header class="section-head">
                <div>
                  <h3>Planes y reglas base</h3>
                  <p>Definí cobertura, coseguro y prestaciones sin autorización para cada plan.</p>
                </div>
                <button mat-stroked-button type="button" (click)="addPlan()">Agregar plan</button>
              </header>

              @if (planes().length === 0) {
                <div class="empty-block">
                  <strong>No hay planes cargados.</strong>
                  <p>La obra social no se puede guardar sin al menos un plan activo de referencia.</p>
                </div>
              } @else {
                <ul class="plan-list">
                  @for (plan of planes(); track plan.id ?? plan.nombreCorto; let i = $index) {
                    <li class="plan-card">
                      <div class="plan-card__head">
                        <div>
                          <strong>{{ plan.nombreCorto }}</strong>
                          <p>{{ plan.nombreCompleto }}</p>
                        </div>
                        <span class="status-badge" [class.status-badge--ok]="plan.activo">{{ plan.activo ? 'Activo' : 'Inactivo' }}</span>
                      </div>

                      <dl class="plan-grid">
                        <div>
                          <dt>Cobertura</dt>
                          <dd>{{ formatCoverage(plan) }}</dd>
                        </div>
                        <div>
                          <dt>Coseguro</dt>
                          <dd>{{ formatCopay(plan) }}</dd>
                        </div>
                        <div>
                          <dt>Sin autorización</dt>
                          <dd>{{ plan.prestacionesSinAutorizacion }}</dd>
                        </div>
                      </dl>

                      @if (plan.observaciones) {
                        <p class="plan-note">{{ plan.observaciones }}</p>
                      }

                      <div class="plan-actions">
                        <button mat-stroked-button type="button" (click)="editPlan(i)">Editar</button>
                        <button mat-stroked-button type="button" (click)="duplicatePlan(i)">Duplicar</button>
                        <button mat-stroked-button type="button" (click)="removePlan(i)">Eliminar</button>
                      </div>
                    </li>
                  }
                </ul>
              }

              <p class="support-note">Estos valores son referenciales. Si el consultorio define un convenio puntual, puede sobreescribir la regla base del plan.</p>

              <footer class="actions">
                <button mat-button type="button" matStepperPrevious>Atrás</button>
                <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="planes().length === 0">Siguiente</button>
              </footer>
            </section>
          </mat-step>

          <mat-step>
            <ng-template matStepLabel>Resumen</ng-template>

            <section class="review-step">
              <div class="review-grid">
                <article class="review-card">
                  <h3>Obra social</h3>
                  <dl>
                    <div><dt>Acrónimo</dt><dd>{{ step1Form.value.acronimo }}</dd></div>
                    <div><dt>Nombre</dt><dd>{{ step1Form.value.nombreCompleto }}</dd></div>
                    <div><dt>CUIT</dt><dd>{{ step1Form.value.cuit }}</dd></div>
                    <div><dt>Estado</dt><dd>{{ step1Form.value.estado === 'ACTIVE' ? 'Activa' : 'Inactiva' }}</dd></div>
                  </dl>
                </article>

                <article class="review-card">
                  <h3>Contacto</h3>
                  <dl>
                    <div><dt>Email</dt><dd>{{ step1Form.value.email || '—' }}</dd></div>
                    <div><dt>Teléfono</dt><dd>{{ step1Form.value.telefono || '—' }}</dd></div>
                    <div><dt>Representante</dt><dd>{{ step1Form.value.representante || '—' }}</dd></div>
                    <div><dt>Dirección</dt><dd>{{ step1Form.value.direccionLinea || '—' }}</dd></div>
                  </dl>
                </article>
              </div>

              <section class="review-plans">
                <div class="section-title">
                  <h3>Planes definidos</h3>
                  <p>{{ planes().length }} configurados para la obra social.</p>
                </div>

                <ul class="plan-list">
                  @for (plan of planes(); track plan.id ?? plan.nombreCorto; let i = $index) {
                    <li class="plan-card">
                      <div class="plan-card__head">
                        <div>
                          <strong>{{ plan.nombreCorto }}</strong>
                          <p>{{ plan.nombreCompleto }}</p>
                        </div>
                        <button mat-button type="button" (click)="editPlan(i)">Editar</button>
                      </div>
                      <dl class="plan-grid">
                        <div>
                          <dt>Cobertura</dt>
                          <dd>{{ formatCoverage(plan) }}</dd>
                        </div>
                        <div>
                          <dt>Coseguro</dt>
                          <dd>{{ formatCopay(plan) }}</dd>
                        </div>
                        <div>
                          <dt>Sin autorización</dt>
                          <dd>{{ plan.prestacionesSinAutorizacion }}</dd>
                        </div>
                      </dl>
                    </li>
                  }
                </ul>
              </section>

              <footer class="actions">
                <button mat-button type="button" matStepperPrevious>Atrás</button>
                <button mat-button type="button" (click)="cancel.emit()">Cancelar</button>
                <button mat-flat-button color="primary" type="button" (click)="submit()">Guardar</button>
              </footer>
            </section>
          </mat-step>
        </mat-stepper>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / .42);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      z-index: 1200;
    }
    .panel {
      background: var(--white);
      width: min(1040px, 96vw);
      max-height: 92vh;
      overflow: auto;
      border-radius: 14px;
      padding: 1.1rem 1.15rem;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      display: grid;
      gap: 1rem;
    }
    .panel-head,
    .section-head,
    .actions,
    .plan-card__head,
    .plan-actions {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: .75rem;
    }
    .panel-copy h2,
    .section-title h3,
    .section-head h3,
    .review-card h3 {
      margin: 0;
      color: var(--text);
    }
    .panel-copy p,
    .section-title p,
    .section-head p,
    .support-note,
    .plan-card__head p,
    .plan-note,
    .empty-block p {
      margin: .2rem 0 0;
      color: var(--text-muted);
    }
    .panel-summary {
      display: inline-flex;
      gap: .6rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .summary-chip,
    .form-section-card,
    .review-card,
    .plan-card,
    .empty-block {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
    }
    .summary-chip {
      min-width: 120px;
      padding: .55rem .7rem;
      display: grid;
      gap: .12rem;
    }
    .summary-chip span,
    .review-card dt,
    .plan-grid dt {
      color: var(--text-muted);
      font-size: .72rem;
      text-transform: uppercase;
      letter-spacing: .03em;
      font-weight: 700;
    }
    .summary-chip strong {
      color: var(--text);
      font-size: .92rem;
    }
    .step-grid,
    .plans-step,
    .review-step {
      display: grid;
      gap: 1rem;
      padding-top: .85rem;
    }
    .form-section-card,
    .review-card {
      padding: .95rem;
      display: grid;
      gap: .85rem;
    }
    .form-grid,
    .review-grid,
    .plan-grid {
      display: grid;
      gap: .75rem;
    }
    .form-grid,
    .review-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .full {
      grid-column: 1 / -1;
    }
    .warning-stack {
      display: grid;
      gap: .5rem;
    }
    .inline-message {
      margin: 0;
      padding: .7rem .8rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      font-size: .85rem;
    }
    .inline-message--warn {
      color: color-mix(in srgb, var(--warning) 86%, var(--text));
      border-color: color-mix(in srgb, var(--warning) 24%, var(--border));
      background: color-mix(in srgb, var(--warning) 10%, var(--white));
    }
    .inline-message--error {
      color: var(--error);
      border-color: var(--error-border);
      background: var(--error-bg);
    }
    .plan-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: .75rem;
    }
    .plan-card {
      padding: .85rem;
      display: grid;
      gap: .75rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      padding: .15rem .55rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: .72rem;
      font-weight: 700;
      background: var(--white);
      white-space: nowrap;
    }
    .status-badge--ok {
      color: var(--success);
      border-color: var(--success-border);
      background: var(--success-bg);
    }
    .plan-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .plan-grid dd,
    .review-card dd {
      margin: .15rem 0 0;
      color: var(--text);
    }
    .plan-note {
      border-top: 1px solid var(--border);
      padding-top: .65rem;
      font-size: .82rem;
    }
    .plan-actions {
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .support-note {
      font-size: .82rem;
    }
    .empty-block {
      padding: .9rem;
      display: grid;
      gap: .25rem;
    }
    .review-card dl {
      margin: 0;
      display: grid;
      gap: .65rem;
    }
    @media (max-width: 820px) {
      .panel-head,
      .section-head,
      .actions,
      .plan-card__head {
        flex-direction: column;
      }
      .panel-summary {
        justify-content: flex-start;
      }
      .form-grid,
      .review-grid,
      .plan-grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 560px) {
      .panel {
        padding: .95rem;
      }
      .actions button,
      .plan-actions button {
        width: 100%;
      }
      .plan-actions {
        flex-direction: column;
      }
    }
  `],
})
export class ObraSocialWizard {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);

  readonly editItem = input<ObraSocial | null>(null);
  readonly existingNames = input<string[]>([]);
  readonly save = output<ObraSocialUpsertRequest>();
  readonly cancel = output<void>();

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
    return !!value && this.existingNames().some((name) => name.toLowerCase() === value);
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
    this.dialog.open(PlanEditorDialog, { width: '760px', data: {} }).afterClosed().subscribe((plan?: Plan) => {
      if (!plan || this.existsShortName(plan.nombreCorto)) return;
      this.planes.update((current) => [...current, plan]);
    });
  }

  editPlan(index: number): void {
    const current = this.planes()[index];
    this.dialog.open(PlanEditorDialog, { width: '760px', data: { plan: current } }).afterClosed().subscribe((plan?: Plan) => {
      if (!plan || this.existsShortName(plan.nombreCorto, index)) return;
      this.planes.update((currentPlans) => currentPlans.map((item, i) => (i === index ? plan : item)));
    });
  }

  duplicatePlan(index: number): void {
    const source = this.planes()[index];
    const copyName = `${source.nombreCorto} copia`;
    if (this.existsShortName(copyName)) return;
    this.planes.update((current) => [...current, { ...source, id: undefined, nombreCorto: copyName }]);
  }

  removePlan(index: number): void {
    this.planes.update((current) => current.filter((_, i) => i !== index));
  }

  submit(): void {
    if (!this.canContinueStep1() || this.planes().length === 0) return;
    const value = this.step1Form.getRawValue();
    this.save.emit({
      acronimo: value.acronimo,
      nombreCompleto: value.nombreCompleto,
      cuit: value.cuit,
      estado: value.estado,
      email: value.email || undefined,
      telefono: value.telefono || undefined,
      telefonoAlternativo: value.telefonoAlternativo || undefined,
      representante: value.representante || undefined,
      observacionesInternas: value.observacionesInternas || undefined,
      direccionLinea: value.direccionLinea || undefined,
      planes: this.planes(),
    });
  }

  formatCoverage(plan: Plan): string {
    return this.formatValue(plan.tipoCobertura, plan.valorCobertura);
  }

  formatCopay(plan: Plan): string {
    if (plan.tipoCoseguro === 'SIN_COSEGURO') return 'Sin coseguro';
    return this.formatValue(plan.tipoCoseguro, plan.valorCoseguro);
  }

  private existsShortName(name: string, ignoreIndex?: number): boolean {
    const normalized = name.trim().toLowerCase();
    return this.planes().some((plan, index) => index !== ignoreIndex && plan.nombreCorto.trim().toLowerCase() === normalized);
  }

  private formatValue(type: string, value: number): string {
    if (type === 'PORCENTAJE') return `${value}%`;
    if (type === 'MIXTO') return `${value}% + monto variable`;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
