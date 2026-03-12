import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

/* ─── Local interfaces (UI only) ─── */
interface RangoEntry {
  articulacion: string;
  tipo: 'ACTIVO' | 'PASIVO' | 'AMBOS' | '';
  doloroso: boolean;
  limitado: boolean;
  grados: string;
  nota: string;
}

interface FuerzaEntry {
  grupo: string;
  escala: number | null;
  dolor: boolean;
  nota: string;
}

interface TestEntry {
  test: string;
  valorPrevio: string;
  valorActual: string;
  unidad: string;
  interpretacion: string;
}

function emptyRango(): RangoEntry {
  return { articulacion: '', tipo: '', doloroso: false, limitado: false, grados: '', nota: '' };
}
function emptyFuerza(): FuerzaEntry {
  return { grupo: '', escala: null, dolor: false, nota: '' };
}
function emptyTest(): TestEntry {
  return { test: '', valorPrevio: '', valorActual: '', unidad: '', interpretacion: '' };
}
function tryParseJson<T>(json: string | null | undefined, fallback: T[]): T[] {
  if (!json) return fallback;
  try { return JSON.parse(json) as T[]; } catch { return fallback; }
}

/* ─── Component ─── */
@Component({
  selector: 'app-bloque-examen-fisico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bloque bloque-examen">
      <h3 class="bloque__title">Examen físico</h3>

      <div class="examen-grid" [formGroup]="form()">

        <!-- ── Rango de movimiento ── -->
        <details class="sub-block" open>
          <summary class="sub-block__title">📐 Rango de movimiento</summary>
          <div class="sub-content">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Articulación</th>
                  <th>Tipo</th>
                  <th class="col-check">Dolor</th>
                  <th class="col-check">Limitado</th>
                  <th>Grados / ROM</th>
                  <th>Nota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rangoEntries(); track $index) {
                  <tr>
                    <td><input [(ngModel)]="row.articulacion" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncRango()" class="cell-input" placeholder="Ej: hombro D" /></td>
                    <td>
                      <select [(ngModel)]="row.tipo" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncRango()" class="cell-select">
                        <option value="">—</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="PASIVO">Pasivo</option>
                        <option value="AMBOS">Ambos</option>
                      </select>
                    </td>
                    <td class="col-check"><input type="checkbox" [(ngModel)]="row.doloroso" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncRango()" /></td>
                    <td class="col-check"><input type="checkbox" [(ngModel)]="row.limitado" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncRango()" /></td>
                    <td><input [(ngModel)]="row.grados" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncRango()" class="cell-input cell-input--sm" placeholder="Ej: 120°" /></td>
                    <td><input [(ngModel)]="row.nota" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncRango()" class="cell-input" placeholder="Observación" /></td>
                    <td><button type="button" class="row-del" (click)="removeRango($index)">✕</button></td>
                  </tr>
                }
              </tbody>
            </table>
            <button type="button" class="add-row-btn" (click)="addRango()">+ Agregar articulación</button>
          </div>
        </details>

        <!-- ── Fuerza muscular ── -->
        <details class="sub-block">
          <summary class="sub-block__title">💪 Fuerza muscular</summary>
          <div class="sub-content">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Grupo muscular</th>
                  <th>Escala (0–5)</th>
                  <th class="col-check">Dolor</th>
                  <th>Nota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of fuerzaEntries(); track $index; let rowIdx = $index) {
                  <tr>
                    <td><input [(ngModel)]="row.grupo" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncFuerza()" class="cell-input" placeholder="Ej: cuádriceps D" /></td>
                    <td>
                      <div class="escala-btns">
                        @for (n of [0,1,2,3,4,5]; track n) {
                          <button
                            type="button"
                            class="escala-btn"
                            [class.escala-btn--active]="row.escala === n"
                            (click)="setEscala(rowIdx, n)"
                          >{{ n }}</button>
                        }
                      </div>
                    </td>
                    <td class="col-check"><input type="checkbox" [(ngModel)]="row.dolor" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncFuerza()" /></td>
                    <td><input [(ngModel)]="row.nota" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncFuerza()" class="cell-input" placeholder="Observación" /></td>
                    <td><button type="button" class="row-del" (click)="removeFuerza(rowIdx)">✕</button></td>
                  </tr>
                }
              </tbody>
            </table>
            <button type="button" class="add-row-btn" (click)="addFuerza()">+ Agregar grupo</button>
          </div>
        </details>

        <!-- ── Funcionalidad ── -->
        <details class="sub-block">
          <summary class="sub-block__title">🚶 Funcionalidad</summary>
          <div class="sub-content">
            <div class="func-chips">
              @for (op of funcOpciones; track op.value) {
                <button
                  type="button"
                  class="chip"
                  [class.chip--active]="isFuncActive(op.value)"
                  (click)="toggleFunc(op.value)"
                >{{ op.label }}</button>
              }
            </div>
            <textarea
              formControlName="funcionalidadNota"
              class="field-textarea"
              rows="2"
              placeholder="Detalle adicional de funcionalidad..."
              (input)="changed.emit()"
            ></textarea>
          </div>
        </details>

        <!-- ── Balance / marcha ── -->
        <details class="sub-block">
          <summary class="sub-block__title">⚖️ Balance / marcha / transferencias</summary>
          <div class="sub-content">
            <div class="func-chips">
              @for (op of marchaOpciones; track op.value) {
                <button
                  type="button"
                  class="chip"
                  [class.chip--active]="isMarchaActive(op.value)"
                  (click)="toggleMarcha(op.value)"
                >{{ op.label }}</button>
              }
            </div>
            <textarea
              formControlName="marchaBalanceNota"
              class="field-textarea"
              rows="2"
              placeholder="Detalle de marcha, equilibrio y transferencias..."
              (input)="changed.emit()"
            ></textarea>
          </div>
        </details>

        <!-- ── Signos relevantes ── -->
        <details class="sub-block">
          <summary class="sub-block__title">🔍 Signos relevantes</summary>
          <div class="sub-content">
            <div class="func-chips">
              @for (s of signosOpciones; track s) {
                <button
                  type="button"
                  class="chip"
                  [class.chip--active]="signoActivo(s)"
                  (click)="toggleSigno(s)"
                >{{ s }}</button>
              }
            </div>
            <textarea
              formControlName="signosInflamatorios"
              class="field-textarea"
              rows="2"
              placeholder="Descripción detallada de signos..."
              (input)="changed.emit()"
            ></textarea>
          </div>
        </details>

        <!-- ── Neuro / respiratorio ── -->
        <details class="sub-block">
          <summary class="sub-block__title">🧠 Observaciones neuro / respiratorias</summary>
          <div class="sub-content">
            <div class="func-chips">
              @for (op of neuroOpciones; track op) {
                <button
                  type="button"
                  class="chip"
                  [class.chip--active]="isNeuroActive(op)"
                  (click)="toggleNeuro(op)"
                >{{ op }}</button>
              }
            </div>
            <textarea
              formControlName="observacionesNeuroResp"
              class="field-textarea"
              rows="2"
              placeholder="Parestesias, coordinación, patrón respiratorio..."
              (input)="changed.emit()"
            ></textarea>
          </div>
        </details>

        <!-- ── Tests y medidas ── -->
        <details class="sub-block">
          <summary class="sub-block__title">📊 Tests y medidas</summary>
          <div class="sub-content">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Test / escala</th>
                  <th>Valor previo</th>
                  <th>Valor actual</th>
                  <th>Unidad</th>
                  <th>Interpretación</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of testsEntries(); track $index) {
                  <tr>
                    <td><input [(ngModel)]="row.test" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncTests()" class="cell-input" placeholder="Ej: Escala Tinetti" /></td>
                    <td><input [(ngModel)]="row.valorPrevio" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncTests()" class="cell-input cell-input--sm" placeholder="Ant." /></td>
                    <td><input [(ngModel)]="row.valorActual" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncTests()" class="cell-input cell-input--sm" placeholder="Hoy" /></td>
                    <td><input [(ngModel)]="row.unidad" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncTests()" class="cell-input cell-input--sm" placeholder="m, pts…" /></td>
                    <td><input [(ngModel)]="row.interpretacion" [ngModelOptions]="{standalone:true}" (ngModelChange)="syncTests()" class="cell-input" placeholder="Normal / alterado..." /></td>
                    <td><button type="button" class="row-del" (click)="removeTest($index)">✕</button></td>
                  </tr>
                }
              </tbody>
            </table>
            <button type="button" class="add-row-btn" (click)="addTest()">+ Agregar test</button>
          </div>
        </details>

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
      border-bottom: 2px solid #f59e0b;
    }
    .examen-grid { display: flex; flex-direction: column; gap: 8px; }

    .sub-block {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
    }
    .sub-block__title {
      padding: 9px 12px;
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--text, #0f172a);
      cursor: pointer;
      user-select: none;
      background: #f8fafc;
      list-style: none;
    }
    .sub-block__title:hover { background: #f1f5f9; }
    .sub-block[open] .sub-block__title { border-bottom: 1px solid var(--border, #e2e8f0); }

    .sub-content { padding: 12px; display: flex; flex-direction: column; gap: 10px; }

    /* Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    .data-table th {
      text-align: left;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      padding: 4px 6px;
      border-bottom: 1px solid var(--border, #e2e8f0);
      white-space: nowrap;
    }
    .data-table td { padding: 4px 4px; vertical-align: middle; }
    .col-check { width: 54px; text-align: center; }
    .col-check input { cursor: pointer; }

    .cell-input {
      width: 100%;
      padding: 5px 7px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 4px;
      font-size: 0.82rem;
      color: var(--text, #0f172a);
      background: var(--white, #fff);
      box-sizing: border-box;
    }
    .cell-input:focus { outline: none; border-color: var(--primary, #0f766e); }
    .cell-input--sm { max-width: 80px; }

    .cell-select {
      padding: 5px 6px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 4px;
      font-size: 0.82rem;
      background: var(--white, #fff);
      color: var(--text, #0f172a);
    }

    .row-del {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .row-del:hover { background: #fee2e2; color: #dc2626; }

    .add-row-btn {
      align-self: flex-start;
      padding: 5px 12px;
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px dashed var(--border, #e2e8f0);
      border-radius: 4px;
      background: none;
      color: var(--text-muted, #64748b);
      cursor: pointer;
    }
    .add-row-btn:hover { border-color: var(--primary, #0f766e); color: var(--primary, #0f766e); }

    /* Escala fuerza */
    .escala-btns { display: flex; gap: 3px; }
    .escala-btn {
      width: 28px;
      height: 26px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      background: var(--white, #fff);
      color: var(--text-muted, #64748b);
      cursor: pointer;
    }
    .escala-btn--active { background: var(--primary, #0f766e); color: #fff; border-color: var(--primary, #0f766e); }

    /* Chips */
    .func-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 500;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--white, #fff);
      cursor: pointer;
      transition: all 0.15s;
      color: var(--text, #0f172a);
    }
    .chip:hover { border-color: var(--primary, #0f766e); }
    .chip--active { background: var(--primary, #0f766e); color: #fff; border-color: var(--primary, #0f766e); }

    /* Textarea */
    .field-textarea {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      font-size: 0.85rem;
      color: var(--text, #0f172a);
      resize: vertical;
      box-sizing: border-box;
      font-family: inherit;
      background: var(--white, #fff);
    }
    .field-textarea:focus { outline: none; border-color: var(--primary, #0f766e); }
  `,
})
export class BloqueExamenFisicoComponent {
  readonly form = input.required<FormGroup>();
  readonly changed = output<void>();

  readonly rangoEntries = signal<RangoEntry[]>([]);
  readonly fuerzaEntries = signal<FuerzaEntry[]>([]);
  readonly testsEntries = signal<TestEntry[]>([]);

  constructor() {
    effect(() => {
      const f = this.form();
      this.rangoEntries.set(tryParseJson<RangoEntry>(f.get('rangoMovimientoJson')?.value, []));
      this.fuerzaEntries.set(tryParseJson<FuerzaEntry>(f.get('fuerzaMuscularJson')?.value, []));
      this.testsEntries.set(tryParseJson<TestEntry>(f.get('testsMedidasJson')?.value, []));
    }, { allowSignalWrites: true });
  }

  /* ── Opciones ── */
  readonly funcOpciones = [
    { value: 'independiente', label: 'Independiente' },
    { value: 'supervisado', label: 'Supervisado' },
    { value: 'asistido_parcial', label: 'Asistido parcial' },
    { value: 'dependiente', label: 'Dependiente' },
    { value: 'usa_ortesis', label: 'Usa ortesis' },
    { value: 'usa_baston', label: 'Usa bastón/muleta' },
    { value: 'usa_silla', label: 'Usa silla de ruedas' },
  ];
  readonly marchaOpciones = [
    { value: 'marcha_normal', label: 'Marcha normal' },
    { value: 'marcha_alterada', label: 'Marcha alterada' },
    { value: 'equilibrio_ok', label: 'Equilibrio conservado' },
    { value: 'equilibrio_alterado', label: 'Equilibrio alterado' },
    { value: 'transfiere_solo', label: 'Transfiere solo' },
    { value: 'transfiere_asistido', label: 'Transfiere asistido' },
    { value: 'sube_escaleras', label: 'Sube escaleras' },
  ];
  readonly signosOpciones = ['Edema', 'Rigidez matutina', 'Inflamación', 'Espasmo', 'Cicatriz', 'Sensibilidad alterada', 'Crepitación', 'Hematoma'];
  readonly neuroOpciones = ['Parestesias', 'Irradiación', 'Hormigueo', 'Debilidad distal', 'Coordinación alterada', 'Disnea esfuerzo', 'Fatiga precoz', 'Reflejo alterado'];

  /* ── Rango ── */
  addRango() { this.rangoEntries.update(r => [...r, emptyRango()]); this.syncRango(); }
  removeRango(i: number) { this.rangoEntries.update(r => r.filter((_, idx) => idx !== i)); this.syncRango(); }
  syncRango() {
    this.form().get('rangoMovimientoJson')?.setValue(JSON.stringify(this.rangoEntries()));
    this.changed.emit();
  }

  /* ── Fuerza ── */
  addFuerza() { this.fuerzaEntries.update(f => [...f, emptyFuerza()]); this.syncFuerza(); }
  removeFuerza(i: number) { this.fuerzaEntries.update(f => f.filter((_, idx) => idx !== i)); this.syncFuerza(); }
  setEscala(i: number, n: number) {
    this.fuerzaEntries.update(rows => {
      const copy = [...rows];
      copy[i] = { ...copy[i], escala: copy[i].escala === n ? null : n };
      return copy;
    });
    this.syncFuerza();
  }
  syncFuerza() {
    this.form().get('fuerzaMuscularJson')?.setValue(JSON.stringify(this.fuerzaEntries()));
    this.changed.emit();
  }

  /* ── Tests ── */
  addTest() { this.testsEntries.update(t => [...t, emptyTest()]); this.syncTests(); }
  removeTest(i: number) { this.testsEntries.update(t => t.filter((_, idx) => idx !== i)); this.syncTests(); }
  syncTests() {
    this.form().get('testsMedidasJson')?.setValue(JSON.stringify(this.testsEntries()));
    this.changed.emit();
  }

  /* ── Funcionalidad chips ── */
  isFuncActive(v: string): boolean {
    return (this.form().get('funcionalidadNota')?.value ?? '').includes(v);
  }
  toggleFunc(v: string) { this.appendToField('funcionalidadNota', v); }

  /* ── Marcha chips ── */
  isMarchaActive(v: string): boolean {
    return (this.form().get('marchaBalanceNota')?.value ?? '').includes(v);
  }
  toggleMarcha(v: string) { this.appendToField('marchaBalanceNota', v); }

  /* ── Signos chips ── */
  signoActivo(s: string): boolean {
    return (this.form().get('signosInflamatorios')?.value ?? '').includes(s);
  }
  toggleSigno(s: string) { this.appendToField('signosInflamatorios', s); }

  /* ── Neuro chips ── */
  isNeuroActive(op: string): boolean {
    return (this.form().get('observacionesNeuroResp')?.value ?? '').includes(op);
  }
  toggleNeuro(op: string) { this.appendToField('observacionesNeuroResp', op); }

  /* ── Helper chip toggle ── */
  private appendToField(controlName: string, term: string): void {
    const ctrl = this.form().get(controlName);
    if (!ctrl) return;
    const current: string = ctrl.value ?? '';
    if (current.includes(term)) {
      ctrl.setValue(current.replace(term, '').replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '').trim());
    } else {
      ctrl.setValue(current ? `${current}, ${term}` : term);
    }
    this.changed.emit();
  }
}
