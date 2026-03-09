import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TratamientoCatalogCategoria,
  TratamientoCatalogItem,
  TratamientoCatalogTipo,
} from '../../../consultorios/models/tratamiento-catalog.models';

@Component({
  selector: 'app-tratamiento-catalog-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="selector">
      <div class="selector-field">
        <input
          type="search"
          [ngModel]="search()"
          (ngModelChange)="onSearchChange($event)"
          (keydown)="onInputKeydown($event)"
          (focus)="isOpen.set(true)"
          (blur)="closeDropdown()"
          [placeholder]="placeholder()"
          autocomplete="off"
          role="combobox"
          [attr.aria-expanded]="showDropdown()"
          aria-autocomplete="list"
        />

        @if (showDropdown()) {
          <div class="selector-dropdown" role="listbox">
            @for (item of visibleTratamientos(); track item.codigoInterno; let index = $index) {
              <button
                type="button"
                class="selector-option"
                [class.selector-option--active]="isActiveOption(index)"
                [class.selector-option--selected]="selectedCode() === item.codigoInterno"
                (mousedown)="$event.preventDefault()"
                (mouseenter)="activeIndex.set(index)"
                (click)="selectTratamiento(item.codigoInterno)"
                role="option"
                [attr.aria-selected]="isActiveOption(index)"
              >
                <span class="selector-option__copy">
                  <strong>{{ item.nombre }}</strong>
                  <small>{{ categoriaLabel(item.categoriaCodigo) }} · {{ tipoLabel(item.tipo) }}</small>
                </span>
                @if (item.duracionSugeridaMinutos) {
                  <span class="selector-option__meta">{{ item.duracionSugeridaMinutos }} min</span>
                }
              </button>
            } @empty {
              <div class="selector-empty">No se encontraron tratamientos.</div>
            }
          </div>
        }
      </div>

    </section>
  `,
  styles: [`
    .selector { display: grid; gap: 8px; }
    .selector-field { position: relative; }
    .selector-field input {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0 11px;
      background: var(--white);
      color: var(--text);
      font-size: 0.92rem;
    }
    .selector-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 6;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--white);
      box-shadow: 0 8px 20px rgb(15 23 42 / 0.1);
      max-height: 240px;
      overflow: auto;
    }
    .selector-option {
      width: 100%;
      border: 0;
      border-bottom: 1px solid var(--border);
      background: transparent;
      padding: 9px 11px;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 10px;
    }
    .selector-option:last-child { border-bottom: 0; }
    .selector-option--active,
    .selector-option--selected { background: color-mix(in srgb, var(--primary) 8%, white); }
    .selector-option__copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    .selector-option__copy strong {
      font-size: 0.88rem;
      color: var(--text);
    }
    .selector-option__copy small,
    .selector-option__meta {
      color: var(--text-muted);
      font-size: 0.74rem;
    }
    .selector-empty {
      padding: 12px 11px;
      color: var(--text-muted);
      font-size: 0.78rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TratamientoCatalogSelectorComponent {
  readonly tratamientos = input<TratamientoCatalogItem[]>([]);
  readonly categorias = input<TratamientoCatalogCategoria[]>([]);
  readonly tipos = input<TratamientoCatalogTipo[]>([]);
  readonly excludedCodes = input<string[]>([]);
  readonly placeholder = input('Buscar tratamiento...');
  readonly selectedCode = model('');

  readonly search = model('');
  readonly isOpen = signal(false);
  readonly activeIndex = signal(0);

  readonly visibleTratamientos = computed(() => {
    if (!this.showDropdown()) {
      return [];
    }
    const query = this.normalize(this.search());
    const excluded = new Set(this.excludedCodes());
    return this.tratamientos()
      .filter((item) => item.activo && !excluded.has(item.codigoInterno))
      .filter((item) => {
        if (!query) return true;
        return this.normalize(
          `${item.nombre} ${item.codigoInterno} ${item.categoriaCodigo} ${this.categoriaLabel(item.categoriaCodigo)} ${item.descripcion ?? ''} ${item.modalidades.join(' ')}`,
        ).includes(query);
      })
      .slice(0, 8);
  });

  readonly selectedItem = computed(
    () => this.tratamientos().find((item) => item.codigoInterno === this.selectedCode()) ?? null,
  );
  readonly showDropdown = computed(() => this.isOpen() && this.search().trim().length > 0);

  onSearchChange(value: string): void {
    this.search.set(value);
    this.isOpen.set(true);
    this.activeIndex.set(0);
  }

  closeDropdown(): void {
    queueMicrotask(() => this.isOpen.set(false));
  }

  onInputKeydown(event: KeyboardEvent): void {
    const items = this.visibleTratamientos();
    if (event.key === 'Escape') {
      this.isOpen.set(false);
      return;
    }
    if (!items.length) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.isOpen.set(true);
      this.activeIndex.set(Math.min(this.activeIndex() + 1, items.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.isOpen.set(true);
      this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.selectTratamiento(items[this.clampedActiveIndex(items.length)].codigoInterno);
    }
  }

  selectTratamiento(code: string): void {
    this.selectedCode.set(code);
    this.search.set('');
    this.isOpen.set(false);
    this.activeIndex.set(0);
  }

  isActiveOption(index: number): boolean {
    return this.clampedActiveIndex(this.visibleTratamientos().length) === index;
  }

  categoriaLabel(codigo: string): string {
    return this.categorias().find((item) => item.codigo === codigo)?.nombre ?? codigo;
  }

  tipoLabel(tipo: TratamientoCatalogTipo | string | null | undefined): string {
    return tipo === 'TECNICA' ? 'Tecnica' : 'Prestacion principal';
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private clampedActiveIndex(length: number): number {
    if (length <= 0) {
      return 0;
    }
    return Math.min(this.activeIndex(), length - 1);
  }
}
