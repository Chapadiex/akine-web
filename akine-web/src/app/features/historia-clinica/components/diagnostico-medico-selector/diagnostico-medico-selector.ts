import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DiagnosticoMedicoCategoria,
  DiagnosticoMedicoItem,
  DiagnosticoMedicoTipo,
} from '../../../consultorios/models/diagnosticos-medicos.models';

@Component({
  selector: 'app-diagnostico-medico-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section
      class="selector"
      [class.selector--multiple]="multiple()"
      [class.selector--picked-side]="multiple() && pickedLayout() === 'side'"
      [class.selector--invalid]="invalid()"
    >
      <div class="selector-field">
        <input
          type="search"
          [ngModel]="search()"
          (ngModelChange)="onSearchChange($event)"
          (focus)="isOpen.set(true)"
          (blur)="closeDropdown()"
          [placeholder]="placeholder()"
        />

        @if (showDropdown()) {
          <div class="selector-dropdown">
            @for (item of visibleDiagnosticos(); track item.codigoInterno) {
              <button
                type="button"
                class="selector-option"
                [class.selector-option--selected]="isSelected(item.codigoInterno)"
                (mousedown)="$event.preventDefault()"
                (click)="selectDiagnostico(item.codigoInterno)"
              >
                @if (multiple()) {
                  <span class="selector-option__check">
                    <input type="checkbox" [checked]="isSelected(item.codigoInterno)" tabindex="-1" />
                  </span>
                }
                <span class="selector-option__copy">
                  <strong>{{ item.nombre }}</strong>
                  <small>{{ categoriaLabel(item.categoriaCodigo) }}</small>
                </span>
              </button>
            } @empty {
              <div class="selector-empty">No se encontraron diagnósticos.</div>
            }
          </div>
        }
      </div>

      @if (multiple() && showPickedSummary()) {
        <div class="selector-picked">
          <span class="selector-picked__label">Diagnósticos seleccionados</span>
          <div class="selector-picked__list">
            @for (item of selectedItems(); track item.codigoInterno) {
              <button type="button" class="selector-chip" (click)="removeDiagnostico(item.codigoInterno)">
                <span class="selector-chip__copy">
                  <strong>{{ item.nombre }}</strong>
                  <small>{{ categoriaLabel(item.categoriaCodigo) }}</small>
                </span>
                <strong>&times;</strong>
              </button>
            } @empty {
              <span class="selector-picked__empty">Sin diagnósticos seleccionados.</span>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .selector { display: grid; gap: 10px; }
    .selector--multiple { height: 100%; grid-template-rows: auto 1fr; min-height: 0; }
    .selector--picked-side {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: none;
      align-items: start;
      gap: 16px;
    }
    .selector-field { position: relative; }
    .selector-field input {
      width: 100%;
      min-height: 48px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0 12px;
      background: var(--white);
      color: var(--text);
    }
    .selector--invalid .selector-field input {
      border-color: color-mix(in srgb, var(--error) 78%, var(--border));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--error) 12%, transparent);
    }
    .selector-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      z-index: 6;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      box-shadow: 0 8px 24px rgb(15 23 42 / 0.12);
      max-height: 280px;
      overflow: auto;
    }
    .selector-option {
      width: 100%;
      border: 0;
      border-bottom: 1px solid var(--border);
      background: transparent;
      padding: 10px 12px;
      text-align: left;
      cursor: pointer;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: start;
    }
    .selector-option:last-child { border-bottom: 0; }
    .selector-option--selected { background: color-mix(in srgb, var(--primary) 8%, white); }
    .selector-option__check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding-top: 2px;
    }
    .selector-option__copy {
      display: grid;
      gap: 2px;
    }
    .selector-option__copy strong {
      font-size: 0.92rem;
      color: var(--text);
    }
    .selector-option__copy small {
      color: var(--text-muted);
      font-size: 0.76rem;
    }
    .selector-picked {
      display: grid;
      gap: 8px;
      align-content: start;
      min-height: 0;
      align-self: start;
      padding-top: 0;
    }
    .selector-picked__label {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .selector-picked__list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .selector-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--white) 94%, var(--bg));
      color: var(--text);
      cursor: pointer;
    }
    .selector-chip__copy {
      display: grid;
      gap: 1px;
      text-align: left;
      min-width: 0;
    }
    .selector-chip__copy strong,
    .selector-chip__copy small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .selector-chip__copy strong {
      font-size: 0.82rem;
      color: var(--text);
    }
    .selector-chip__copy small {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .selector-chip strong {
      font-size: 0.9rem;
      line-height: 1;
      color: var(--text-muted);
    }
    .selector-picked__empty,
    .selector-empty {
      color: var(--text-muted);
      font-size: 0.82rem;
    }
    .selector-empty {
      padding: 14px 12px;
    }
    @media (max-width: 820px) {
      .selector--picked-side {
        grid-template-columns: 1fr;
        gap: 10px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticoMedicoSelectorComponent {
  readonly diagnosticos = input<DiagnosticoMedicoItem[]>([]);
  readonly categorias = input<DiagnosticoMedicoCategoria[]>([]);
  readonly tipos = input<DiagnosticoMedicoTipo[]>([]);
  readonly placeholder = input('Buscar diagnóstico médico...');
  readonly multiple = input(false);
  readonly pickedLayout = input<'stack' | 'side'>('stack');
  readonly showPickedSummary = input(true);
  readonly invalid = input(false);
  readonly selectedCode = model('');
  readonly selectedCodes = model<string[]>([]);

  readonly search = model('');
  readonly isOpen = signal(false);

  readonly filteredDiagnosticos = computed(() => {
    const query = this.normalize(this.search());
    return this.diagnosticos()
      .filter((item) => item.activo)
      .filter((item) => {
        if (!query) return true;
        return this.normalize(
          `${item.nombre} ${item.codigoInterno} ${item.categoriaCodigo} ${this.categoriaLabel(item.categoriaCodigo)} ${item.subcategoria ?? ''} ${item.keywords.join(' ')}`,
        ).includes(query);
      })
      .slice(0, 8);
  });

  readonly visibleDiagnosticos = computed(() => (this.showDropdown() ? this.filteredDiagnosticos() : []));
  readonly selectedItems = computed(() =>
    this.selectedCodes()
      .map((code) => this.diagnosticos().find((item) => item.codigoInterno === code))
      .filter((item): item is DiagnosticoMedicoItem => !!item),
  );

  readonly showDropdown = computed(() => this.isOpen() && (this.search().trim().length > 0 || !this.multiple()));

  onSearchChange(value: string): void {
    this.search.set(value);
    this.isOpen.set(true);
  }

  closeDropdown(): void {
    queueMicrotask(() => this.isOpen.set(false));
  }

  selectDiagnostico(code: string): void {
    if (this.multiple()) {
      if (this.selectedCodes().includes(code)) {
        this.search.set('');
        this.isOpen.set(false);
        return;
      }
      const nextCodes = [...this.selectedCodes(), code];
      this.selectedCodes.set(nextCodes);
      this.selectedCode.set(nextCodes[0] ?? '');
      this.search.set('');
      this.isOpen.set(true);
      return;
    }

    this.selectedCode.set(code);
    this.search.set('');
    this.isOpen.set(false);
  }

  removeDiagnostico(code: string): void {
    const nextCodes = this.selectedCodes().filter((item) => item !== code);
    this.selectedCodes.set(nextCodes);
    this.selectedCode.set(nextCodes[0] ?? '');
  }

  isSelected(code: string): boolean {
    return this.multiple() ? this.selectedCodes().includes(code) : this.selectedCode() === code;
  }

  categoriaLabel(codigo: string): string {
    return this.categorias().find((item) => item.codigo === codigo)?.nombre ?? codigo;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
