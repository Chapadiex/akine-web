import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import {
  AntecedenteCatalog,
  AntecedenteCatalogCategory,
  AntecedenteCatalogField,
  AntecedenteCatalogItem,
  AntecedenteCatalogOption,
  AntecedenteValueType,
  RepeatableFieldType,
} from '../../models/antecedente-catalog.models';
import { AntecedenteCatalogService } from '../../services/antecedente-catalog.service';
import { resolveConsultorioId } from '../../utils/route-utils';

const VALUE_TYPES: AntecedenteValueType[] = ['BOOLEAN', 'ENUM', 'ENUM_MULTI', 'REPEATABLE', 'TEXT'];
const FIELD_TYPES: RepeatableFieldType[] = ['TEXT', 'NUMBER', 'BOOLEAN'];

@Component({
  selector: 'app-antecedentes-catalogo',
  standalone: true,
  imports: [FormsModule, ConfirmDialog, PageSectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-page-section-header
        title="Antecedentes"
        description="Maestro configurable por categoría para historia clínica y relevamiento inicial del consultorio."
        titleLevel="h3"
      >
        <button
          header-actions
          class="btn-icon"
          type="button"
          aria-label="Mostrar u ocultar filtros"
          [attr.aria-expanded]="filtersExpanded()"
          (click)="toggleFilters()"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button header-actions class="btn-primary" type="button" (click)="openCreate()">+ Agregar antecedente</button>
      </app-page-section-header>

      @if (filtersExpanded()) {
        <div class="filters-panel">
          <div class="filters-main">
            <input
              type="text"
              placeholder="Buscar por nombre o código"
              [ngModel]="search()"
              (ngModelChange)="search.set($event)"
            />
          </div>
          <div class="filters-actions">
            <button class="btn-secondary" type="button" (click)="restoreMissing()">Agregar defaults faltantes</button>
            <button class="btn-danger" type="button" (click)="askRestoreReset()">Restaurar valores por defecto</button>
          </div>
        </div>
      }

      @if (loading()) {
        <p class="empty">Cargando catálogo...</p>
      } @else if (catalog()) {
        <div class="layout">
          <aside class="categories">
            @for (category of orderedCategories(); track category.code) {
              <button
                class="category"
                [class.active]="selectedCategoryCode() === category.code"
                (click)="selectCategory(category.code)"
              >
                <span>{{ category.name }}</span>
                <small>{{ category.items.length }}</small>
              </button>
            }
          </aside>

          <section class="content">
            @if (selectedCategory(); as category) {
              <table class="table app-data-table">
                <thead>
                  <tr>
                    <th class="col-text">Nombre</th>
                    <th class="col-text-short">Tipo</th>
                    <th class="col-text">Opciones / Fields</th>
                    <th class="col-status">Activo</th>
                    <th class="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of filteredItems(); track item.code) {
                    <tr
                      draggable="true"
                      (dragstart)="onDragStart(item.code)"
                      (dragover)="onDragOver($event)"
                      (drop)="onDrop(item.code)"
                    >
                      <td class="col-text">
                        <strong>{{ item.label }}</strong>
                      </td>
                      <td class="col-text-short">{{ displayValueType(item.valueType) }}</td>
                      <td class="col-text">{{ summarize(item) }}</td>
                      <td class="col-status">
                        <span [class.badge-active]="item.active" class="badge">
                          {{ item.active ? 'Sí' : 'No' }}
                        </span>
                      </td>
                      <td class="col-actions row-actions">
                        <button class="table-row-action" (click)="moveUp(item.code)">Up</button>
                        <button class="table-row-action" (click)="moveDown(item.code)">Down</button>
                        <button class="table-row-action" (click)="openEdit(item)">Editar</button>
                        <button class="table-row-action table-row-action--danger" (click)="askInactivate(item)">
                          Inactivar
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="empty">No hay ítems para el filtro actual.</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>
        </div>
      }
    </div>

    @if (editorOpen() && editingItem()) {
      <div class="drawer-backdrop" (click)="closeEditor()"></div>
      <aside class="drawer">
        <h4>{{ creating() ? 'Nuevo antecedente' : 'Editar antecedente' }}</h4>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" [(ngModel)]="editingItem()!.label" />
        </div>
        <div class="form-group">
          <label>Código</label>
          <input type="text" [(ngModel)]="editingItem()!.code" [disabled]="!creating()" />
        </div>
        <div class="form-group">
          <label>Tipo de captura</label>
          <select [(ngModel)]="editingItem()!.valueType" (ngModelChange)="onValueTypeChanged($event)">
            @for (vt of valueTypes; track vt) {
              <option [value]="vt">{{ vt }}</option>
            }
          </select>
        </div>
        <div class="inline-group">
          <div class="form-group">
            <label>Orden</label>
            <input type="number" min="1" [(ngModel)]="editingItem()!.order" />
          </div>
          <div class="form-group check">
            <label>
              <input type="checkbox" [(ngModel)]="editingItem()!.active" />
              Activo
            </label>
          </div>
        </div>

        @if (editingItem()!.valueType === 'ENUM' || editingItem()!.valueType === 'ENUM_MULTI') {
          <div class="subsection">
            <h5>Opciones</h5>
            @for (opt of editingItem()!.options ?? []; track opt.code; let i = $index) {
              <div class="inline-edit">
                <input type="text" [(ngModel)]="opt.label" placeholder="Label" />
                <input type="text" [(ngModel)]="opt.code" placeholder="Código" />
                <input type="number" min="1" [(ngModel)]="opt.order" />
                <label><input type="checkbox" [(ngModel)]="opt.active" /> Activa</label>
                <button class="btn-sm btn-warn" (click)="removeOption(i)">Quitar</button>
              </div>
            }
            <button class="btn-secondary" (click)="addOption()">+ Agregar opción</button>
          </div>
        }

        @if (editingItem()!.valueType === 'REPEATABLE') {
          <div class="subsection">
            <h5>Subcampos</h5>
            @for (field of editingItem()!.fields ?? []; track field.code; let i = $index) {
              <div class="inline-edit">
                <input type="text" [(ngModel)]="field.label" placeholder="Label" />
                <input type="text" [(ngModel)]="field.code" placeholder="Código" />
                <select [(ngModel)]="field.type">
                  @for (ft of fieldTypes; track ft) {
                    <option [value]="ft">{{ ft }}</option>
                  }
                </select>
                <button class="btn-sm btn-warn" (click)="removeField(i)">Quitar</button>
              </div>
            }
            <button class="btn-secondary" (click)="addField()">+ Agregar subcampo</button>
          </div>
        }

        <div class="drawer-actions">
          <button class="btn-primary" (click)="saveEditor()">Guardar</button>
          <button class="btn-secondary" (click)="closeEditor()">Cancelar</button>
        </div>
      </aside>
    }

    @if (restoreResetConfirm()) {
      <app-confirm-dialog
        title="Restaurar valores por defecto"
        message="Se sobrescribirá el catálogo actual. Esta acción no se puede deshacer."
        (confirmed)="confirmRestoreReset()"
        (cancelled)="restoreResetConfirm.set(false)"
      />
    }
    @if (inactivateTarget(); as target) {
      <app-confirm-dialog
        title="Inactivar antecedente"
        [message]="'¿Inactivar ' + target.label + '?'"
        (confirmed)="confirmInactivate()"
        (cancelled)="inactivateTarget.set(null)"
      />
    }
  `,
  styles: [`
    .page { display: grid; gap: 1rem; }
    .btn-primary {
      min-height: 2.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 .95rem;
      white-space: nowrap;
    }
    .btn-icon {
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      color: var(--text);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color .18s ease, background-color .18s ease, color .18s ease;
    }
    .btn-icon[aria-expanded='true'] {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, white);
      color: var(--primary);
    }
    .filters-panel {
      display: grid;
      grid-template-columns: minmax(260px, 1.4fr) auto;
      gap: .8rem;
      align-items: start;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: calc(var(--radius-lg, 16px) - 2px);
      background: color-mix(in srgb, var(--white) 92%, var(--bg));
    }
    .filters-main input {
      width: 100%;
      min-height: 40px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0 .75rem;
      background: var(--white);
    }
    .filters-actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: flex-end; }
    .layout { display: grid; grid-template-columns: 240px 1fr; gap: 1rem; min-height: 560px; }
    .categories {
      border: 1px solid var(--border); border-radius: var(--radius); padding: .5rem;
      display: flex; flex-direction: column; gap: .35rem; background: var(--surface, var(--white));
    }
    .category {
      border: 1px solid transparent; border-radius: var(--radius); padding: .55rem .6rem;
      text-align: left; background: transparent; cursor: pointer; display: flex; justify-content: space-between;
      color: var(--text); font-size: .87rem;
    }
    .category:hover { border-color: var(--border); background: var(--bg); }
    .category.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 9%, white); }
    .content {
      border: 1px solid var(--border); border-radius: var(--radius); padding: .8rem;
      background: var(--surface, var(--white)); display: flex; flex-direction: column; gap: .8rem;
    }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: .55rem; border-bottom: 1px solid var(--border); font-size: .84rem; vertical-align: top; }
    .table th { color: var(--text-muted); text-align: left; font-weight: 600; }
    .row-actions { white-space: nowrap; display: flex; gap: .35rem; }
    .badge { padding: .2rem .55rem; border-radius: 999px; background: var(--bg); color: var(--text-muted); font-size: .73rem; }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .empty { text-align: center; color: var(--text-muted); padding: 1rem; }
    .btn-primary, .btn-secondary, .btn-danger, .btn-sm {
      border: 1px solid var(--border); border-radius: var(--radius); padding: .45rem .7rem;
      cursor: pointer; background: var(--white); font-size: .82rem;
    }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
    .btn-danger { color: var(--error); background: var(--error-bg, #fef2f2); border-color: color-mix(in srgb, var(--error) 30%, white); }
    .btn-warn { color: var(--error); }
    .drawer-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, .25); z-index: 1000;
    }
    .drawer {
      position: fixed; top: 0; right: 0; width: min(640px, 95vw); height: 100vh; z-index: 1001;
      background: var(--white); border-left: 1px solid var(--border); padding: 1rem; overflow: auto;
      display: grid; align-content: start; gap: .8rem;
    }
    .form-group { display: grid; gap: .3rem; }
    .form-group input, .form-group select {
      border: 1px solid var(--border); border-radius: var(--radius); padding: .5rem .6rem;
    }
    .inline-group { display: grid; grid-template-columns: 140px 1fr; gap: .6rem; align-items: end; }
    .form-group.check { display: flex; align-items: center; }
    .subsection { border-top: 1px solid var(--border); padding-top: .7rem; display: grid; gap: .5rem; }
    .subsection h5 { margin: 0; font-size: .9rem; }
    .inline-edit { display: grid; gap: .45rem; grid-template-columns: 1.2fr 1fr 100px auto auto; align-items: center; }
    .inline-edit input, .inline-edit select { border: 1px solid var(--border); border-radius: var(--radius); padding: .4rem .5rem; }
    .drawer-actions { display: flex; justify-content: flex-end; gap: .5rem; padding-top: .7rem; border-top: 1px solid var(--border); }

    @media (max-width: 1040px) {
      .layout { grid-template-columns: 1fr; }
      .categories { flex-direction: row; flex-wrap: wrap; }
      .category { width: auto; }
    }
    @media (max-width: 720px) {
      .btn-primary { flex: 1 1 auto; text-align: center; }
      .filters-panel { grid-template-columns: 1fr; }
      .filters-actions { justify-content: flex-start; }
    }
  `],
})
export class AntecedentesCatalogoPage implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(AntecedenteCatalogService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  readonly loading = signal(true);
  readonly backendUnsupported = signal(false);
  readonly catalog = signal<AntecedenteCatalog | null>(null);
  readonly selectedCategoryCode = signal('');
  readonly search = signal('');
  readonly filtersExpanded = signal(false);

  readonly editorOpen = signal(false);
  readonly creating = signal(false);
  readonly editingItem = signal<AntecedenteCatalogItem | null>(null);
  readonly inactivateTarget = signal<AntecedenteCatalogItem | null>(null);
  readonly restoreResetConfirm = signal(false);

  readonly valueTypes = VALUE_TYPES;
  readonly fieldTypes = FIELD_TYPES;

  private consultorioId = '';
  private draggingCode = '';
  private originalCode = '';

  readonly orderedCategories = computed(() =>
    [...(this.catalog()?.categories ?? [])].sort((a, b) => a.order - b.order),
  );

  readonly selectedCategory = computed(() =>
    this.catalog()?.categories.find((c) => c.code === this.selectedCategoryCode()) ?? null,
  );

  readonly filteredItems = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];
    const query = this.search().trim().toLowerCase();
    const base = [...category.items].sort((a, b) => a.order - b.order);
    if (!query) return base;
    return base.filter(
      (item) =>
        item.label.toLowerCase().includes(query) || item.code.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.consultorioId = resolveConsultorioId(this.route) ?? '';
    if (!this.consultorioId) {
      this.loading.set(false);
      this.toast.error('No se pudo resolver el consultorio activo.');
      return;
    }
    this.load();
  }

  selectCategory(code: string): void {
    this.selectedCategoryCode.set(code);
  }

  toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  summarize(item: AntecedenteCatalogItem): string {
    if (item.valueType === 'ENUM' || item.valueType === 'ENUM_MULTI') {
      return `${item.options?.length ?? 0} opciones`;
    }
    if (item.valueType === 'REPEATABLE') {
      return `${item.fields?.length ?? 0} subcampos`;
    }
    return '-';
  }

  displayValueType(valueType: AntecedenteValueType): string {
    if (valueType === 'BOOLEAN') return 'Verdadero / Falso';
    if (valueType === 'ENUM') return 'Una opción';
    if (valueType === 'ENUM_MULTI') return 'Múltiples opciones';
    if (valueType === 'REPEATABLE') return 'Repetible';
    return 'Texto libre';
  }

  openCreate(): void {
    const category = this.selectedCategory();
    if (!category) return;
    const nextOrder = (Math.max(0, ...category.items.map((i) => i.order)) || 0) + 10;
    const prefix = category.code;
    const now = Date.now().toString().slice(-6);
    const item: AntecedenteCatalogItem = {
      code: `${prefix}_NEW_${now}`,
      label: '',
      valueType: 'BOOLEAN',
      active: true,
      order: nextOrder,
    };
    this.creating.set(true);
    this.originalCode = item.code;
    this.editingItem.set(item);
    this.editorOpen.set(true);
  }

  openEdit(item: AntecedenteCatalogItem): void {
    this.creating.set(false);
    this.originalCode = item.code;
    this.editingItem.set(this.deepClone(item));
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingItem.set(null);
    this.creating.set(false);
    this.originalCode = '';
  }

  onValueTypeChanged(valueType: AntecedenteValueType): void {
    const item = this.editingItem();
    if (!item) return;
    item.valueType = valueType;
    if (valueType === 'ENUM' || valueType === 'ENUM_MULTI') {
      item.options = item.options?.length ? item.options : [this.newOption(10)];
      item.fields = undefined;
    } else if (valueType === 'REPEATABLE') {
      item.fields = item.fields?.length ? item.fields : [this.newField()];
      item.options = undefined;
    } else {
      item.options = undefined;
      item.fields = undefined;
    }
    this.editingItem.set({ ...item });
  }

  addOption(): void {
    const item = this.editingItem();
    if (!item) return;
    const order = (Math.max(0, ...(item.options ?? []).map((o) => o.order)) || 0) + 10;
    const options = [...(item.options ?? []), this.newOption(order)];
    this.editingItem.set({ ...item, options });
  }

  removeOption(index: number): void {
    const item = this.editingItem();
    if (!item?.options) return;
    const options = item.options.filter((_, i) => i !== index);
    this.editingItem.set({ ...item, options });
  }

  addField(): void {
    const item = this.editingItem();
    if (!item) return;
    const fields = [...(item.fields ?? []), this.newField()];
    this.editingItem.set({ ...item, fields });
  }

  removeField(index: number): void {
    const item = this.editingItem();
    if (!item?.fields) return;
    const fields = item.fields.filter((_, i) => i !== index);
    this.editingItem.set({ ...item, fields });
  }

  saveEditor(): void {
    const category = this.selectedCategory();
    const catalog = this.catalog();
    const draft = this.editingItem();
    if (!category || !catalog || !draft) return;

    if (!draft.label.trim()) {
      this.toast.error('El label es obligatorio');
      return;
    }
    if (!draft.code.trim()) {
      this.toast.error('El código es obligatorio');
      return;
    }
    if ((draft.valueType === 'ENUM' || draft.valueType === 'ENUM_MULTI') && !draft.options?.length) {
      this.toast.error('El tipo ENUM requiere opciones');
      return;
    }
    if (draft.valueType === 'REPEATABLE' && !draft.fields?.length) {
      this.toast.error('El tipo REPEATABLE requiere subcampos');
      return;
    }

    const duplicateCode = category.items.some(
      (i) => i.code === draft.code && i.code !== this.originalCode,
    );
    if (duplicateCode) {
      this.toast.error('Ya existe un antecedente con ese código en la categoría');
      return;
    }

    const updatedCatalog = this.deepClone(catalog);
    const targetCategory = updatedCatalog.categories.find((c) => c.code === category.code);
    if (!targetCategory) return;

    const idx = targetCategory.items.findIndex((i) => i.code === this.originalCode);
    if (idx >= 0) {
      targetCategory.items[idx] = this.deepClone(draft);
    } else {
      targetCategory.items.push(this.deepClone(draft));
    }
    this.normalizeOrder(targetCategory.items);
    this.persist(updatedCatalog, this.creating() ? 'Antecedente agregado' : 'Antecedente actualizado');
    this.closeEditor();
  }

  askInactivate(item: AntecedenteCatalogItem): void {
    this.inactivateTarget.set(item);
  }

  confirmInactivate(): void {
    const catalog = this.catalog();
    const category = this.selectedCategory();
    const target = this.inactivateTarget();
    this.inactivateTarget.set(null);
    if (!catalog || !category || !target) return;

    const updatedCatalog = this.deepClone(catalog);
    const targetCategory = updatedCatalog.categories.find((c) => c.code === category.code);
    const item = targetCategory?.items.find((i) => i.code === target.code);
    if (!item) return;
    item.active = false;
    this.persist(updatedCatalog, 'Antecedente inactivado');
  }

  moveUp(code: string): void {
    this.reorderByRelative(code, -1);
  }

  moveDown(code: string): void {
    this.reorderByRelative(code, 1);
  }

  onDragStart(code: string): void {
    this.draggingCode = code;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(targetCode: string): void {
    if (!this.draggingCode || this.draggingCode === targetCode) return;
    const category = this.selectedCategory();
    const catalog = this.catalog();
    if (!category || !catalog) return;

    const ordered = [...category.items].sort((a, b) => a.order - b.order);
    const from = ordered.findIndex((i) => i.code === this.draggingCode);
    const to = ordered.findIndex((i) => i.code === targetCode);
    if (from < 0 || to < 0) return;

    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);

    const updatedCatalog = this.deepClone(catalog);
    const targetCategory = updatedCatalog.categories.find((c) => c.code === category.code);
    if (!targetCategory) return;
    targetCategory.items = ordered;
    this.normalizeOrder(targetCategory.items);
    this.persist(updatedCatalog, 'Orden actualizado');
    this.draggingCode = '';
  }

  restoreMissing(): void {
    if (!this.consultorioId) return;
    if (this.backendUnsupported()) {
      this.applyLocalDefaultsMerge();
      return;
    }
    this.service.restoreDefaults(this.consultorioId, 'ADD_MISSING').subscribe({
      next: (rawCatalog) => {
        const catalog = this.normalizeCatalog(rawCatalog);
        if (!catalog) {
          this.toast.error('Respuesta inválida al agregar defaults');
          return;
        }
        this.catalog.set(catalog);
        this.setInitialCategory(catalog.categories);
        this.toast.success('Defaults faltantes agregados');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  askRestoreReset(): void {
    this.restoreResetConfirm.set(true);
  }

  confirmRestoreReset(): void {
    this.restoreResetConfirm.set(false);
    if (!this.consultorioId) return;
    if (this.backendUnsupported()) {
      this.applyLocalDefaultsReset();
      return;
    }
    this.service.restoreDefaults(this.consultorioId, 'RESET').subscribe({
      next: (rawCatalog) => {
        const catalog = this.normalizeCatalog(rawCatalog);
        if (!catalog) {
          this.toast.error('Respuesta inválida al restaurar defaults');
          return;
        }
        this.catalog.set(catalog);
        this.setInitialCategory(catalog.categories);
        this.toast.success('Catálogo restaurado a valores por defecto');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private load(): void {
    if (!this.consultorioId) return;
    this.loading.set(true);
    this.service.get(this.consultorioId).subscribe({
      next: (rawCatalog) => {
        const catalog = this.normalizeCatalog(rawCatalog);
        if (!catalog) {
          this.toast.error('Respuesta inválida del catálogo de antecedentes');
          this.loading.set(false);
          return;
        }

        if (!catalog.categories.length) {
          this.seedDefaultsIfNeeded();
          return;
        }

        this.catalog.set(catalog);
        this.setInitialCategory(catalog.categories);
        this.loading.set(false);
      },
      error: (err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.loadFallbackDefaults();
          return;
        }
        this.toast.error(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }

  private reorderByRelative(code: string, delta: -1 | 1): void {
    const category = this.selectedCategory();
    const catalog = this.catalog();
    if (!category || !catalog) return;
    const ordered = [...category.items].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((i) => i.code === code);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    const [item] = ordered.splice(index, 1);
    ordered.splice(next, 0, item);
    const updatedCatalog = this.deepClone(catalog);
    const targetCategory = updatedCatalog.categories.find((c) => c.code === category.code);
    if (!targetCategory) return;
    targetCategory.items = ordered;
    this.normalizeOrder(targetCategory.items);
    this.persist(updatedCatalog, 'Orden actualizado');
  }

  private persist(catalog: AntecedenteCatalog, successMessage: string): void {
    if (!this.consultorioId) return;
    if (this.backendUnsupported()) {
      this.catalog.set(catalog);
      this.setInitialCategory(catalog.categories);
      this.saveLocalCatalog(catalog);
      this.toast.success(successMessage);
      return;
    }
    this.service
      .upsert(this.consultorioId, {
        version: catalog.version || '1.0.0',
        categories: catalog.categories,
      })
      .subscribe({
        next: (rawSaved) => {
          const saved = this.normalizeCatalog(rawSaved);
          if (!saved) {
            this.toast.error('No se pudo interpretar la respuesta del catálogo');
            return;
          }
          this.catalog.set(saved);
          this.setInitialCategory(saved.categories);
          this.toast.success(successMessage);
        },
        error: (err) => this.toast.error(this.errMap.toMessage(err)),
      });
  }

  private normalizeOrder(items: AntecedenteCatalogItem[]): void {
    [...items]
      .sort((a, b) => a.order - b.order)
      .forEach((item, index) => {
        item.order = (index + 1) * 10;
      });
  }

  private setInitialCategory(categories: AntecedenteCatalogCategory[]): void {
    if (!categories.length) {
      this.selectedCategoryCode.set('');
      return;
    }
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const current = this.selectedCategoryCode();
    const exists = sorted.some((c) => c.code === current);
    this.selectedCategoryCode.set(exists ? current : sorted[0].code);
  }

  private newOption(order: number): AntecedenteCatalogOption {
    const suffix = Date.now().toString().slice(-4);
    return { code: `OPT_${suffix}`, label: '', active: true, order };
  }

  private newField(): AntecedenteCatalogField {
    const suffix = Date.now().toString().slice(-4);
    return { code: `field_${suffix}`, label: '', type: 'TEXT' };
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private seedDefaultsIfNeeded(): void {
    if (this.backendUnsupported()) {
      this.applyLocalDefaultsMerge();
      this.loading.set(false);
      return;
    }
    this.service.restoreDefaults(this.consultorioId, 'ADD_MISSING').subscribe({
      next: (rawCatalog) => {
        const catalog = this.normalizeCatalog(rawCatalog);
        if (!catalog) {
        this.toast.error('No se pudieron cargar defaults de antecedentes');
          this.loading.set(false);
          return;
        }
        this.catalog.set(catalog);
        this.setInitialCategory(catalog.categories);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('El catálogo está vacío y no se pudieron agregar defaults');
        this.loading.set(false);
      },
    });
  }

  private normalizeCatalog(raw: unknown): AntecedenteCatalog | null {
    if (!raw || typeof raw !== 'object') return null;
    const source = raw as Record<string, unknown>;

    let categories = source['categories'];
    let version = typeof source['version'] === 'string' ? source['version'] : '1.0.0';

    // Compatibilidad: algunos backends pueden devolver categories anidado.
    if (!Array.isArray(categories) && categories && typeof categories === 'object') {
      const nested = categories as Record<string, unknown>;
      if (Array.isArray(nested['categories'])) {
        categories = nested['categories'];
        if (typeof nested['version'] === 'string' && nested['version']) {
          version = nested['version'];
        }
      }
    }

    if (!Array.isArray(categories)) return null;

    return {
      consultorioId:
        typeof source['consultorioId'] === 'string'
          ? source['consultorioId']
          : this.consultorioId,
      version,
      categories: categories as AntecedenteCatalogCategory[],
      createdAt: typeof source['createdAt'] === 'string' ? source['createdAt'] : '',
      createdBy: typeof source['createdBy'] === 'string' ? source['createdBy'] : '',
      updatedAt: typeof source['updatedAt'] === 'string' ? source['updatedAt'] : '',
      updatedBy: typeof source['updatedBy'] === 'string' ? source['updatedBy'] : '',
    };
  }

  private loadFallbackDefaults(): void {
    const cached = this.loadLocalCatalog();
    if (cached) {
      this.catalog.set(cached);
      this.setInitialCategory(cached.categories);
      this.backendUnsupported.set(true);
      this.toast.success('Catálogo local cargado (modo offline).');
      this.loading.set(false);
      return;
    }

    fetch('/consultorio-antecedentes.catalog.json')
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('No se pudo cargar defaults locales')),
      )
      .then((defaultsRaw) => {
        const defaults = defaultsRaw as Record<string, unknown>;
        const categories = Array.isArray(defaults['categories'])
          ? (defaults['categories'] as AntecedenteCatalogCategory[])
          : [];
        this.catalog.set({
          consultorioId: this.consultorioId,
          version: typeof defaults['version'] === 'string' ? defaults['version'] : '1.0.0',
          categories,
          createdAt: '',
          createdBy: 'system',
          updatedAt: '',
          updatedBy: 'system',
        });
        this.setInitialCategory(categories);
        this.backendUnsupported.set(true);
        this.saveLocalCatalog(this.catalog()!);
        this.toast.success('Backend sin endpoint. Se habilitó modo local para gestionar catálogo.');
      })
      .catch(() => this.toast.error('No se pudo cargar catálogo ni defaults locales'))
      .finally(() => this.loading.set(false));
  }

  private applyLocalDefaultsReset(): void {
    this.fetchDefaultsFromPublic()
      .then((defaults) => {
        this.catalog.set(defaults);
        this.setInitialCategory(defaults.categories);
        this.saveLocalCatalog(defaults);
        this.toast.success('Catálogo restaurado a valores por defecto');
      })
      .catch(() => this.toast.error('No se pudieron cargar defaults locales'));
  }

  private applyLocalDefaultsMerge(): void {
    this.fetchDefaultsFromPublic()
      .then((defaults) => {
        const current = this.catalog() ?? defaults;
        const merged = this.mergeCatalogAddMissing(current, defaults);
        this.catalog.set(merged);
        this.setInitialCategory(merged.categories);
        this.saveLocalCatalog(merged);
        this.toast.success('Defaults faltantes agregados');
      })
      .catch(() => this.toast.error('No se pudieron cargar defaults locales'));
  }

  private fetchDefaultsFromPublic(): Promise<AntecedenteCatalog> {
    return fetch('/consultorio-antecedentes.catalog.json')
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('No se pudo cargar defaults locales')),
      )
      .then((defaultsRaw) => {
        const defaults = defaultsRaw as Record<string, unknown>;
        const categories = Array.isArray(defaults['categories'])
          ? (defaults['categories'] as AntecedenteCatalogCategory[])
          : [];
        return {
          consultorioId: this.consultorioId,
          version: typeof defaults['version'] === 'string' ? defaults['version'] : '1.0.0',
          categories,
          createdAt: '',
          createdBy: 'system',
          updatedAt: '',
          updatedBy: 'system',
        } satisfies AntecedenteCatalog;
      });
  }

  private mergeCatalogAddMissing(
    current: AntecedenteCatalog,
    defaults: AntecedenteCatalog,
  ): AntecedenteCatalog {
    const currentMap = new Map(current.categories.map((c) => [c.code, this.deepClone(c)]));
    const mergedCategories: AntecedenteCatalogCategory[] = [];

    for (const defaultCategory of defaults.categories) {
      const existingCategory = currentMap.get(defaultCategory.code);
      if (!existingCategory) {
        mergedCategories.push(this.deepClone(defaultCategory));
        continue;
      }

      const existingItemMap = new Map(existingCategory.items.map((i) => [i.code, this.deepClone(i)]));
      for (const defaultItem of defaultCategory.items) {
        const existingItem = existingItemMap.get(defaultItem.code);
        if (!existingItem) {
          existingCategory.items.push(this.deepClone(defaultItem));
          continue;
        }

        if (defaultItem.options?.length) {
          const optionMap = new Map((existingItem.options ?? []).map((o) => [o.code, this.deepClone(o)]));
          for (const defaultOption of defaultItem.options) {
            if (!optionMap.has(defaultOption.code)) {
              (existingItem.options ??= []).push(this.deepClone(defaultOption));
            }
          }
        }

        if (defaultItem.fields?.length) {
          const fieldMap = new Map((existingItem.fields ?? []).map((f) => [f.code, this.deepClone(f)]));
          for (const defaultField of defaultItem.fields) {
            if (!fieldMap.has(defaultField.code)) {
              (existingItem.fields ??= []).push(this.deepClone(defaultField));
            }
          }
        }
      }

      this.normalizeOrder(existingCategory.items);
      mergedCategories.push(existingCategory);
    }

    for (const c of current.categories) {
      if (!mergedCategories.some((m) => m.code === c.code)) {
        mergedCategories.push(this.deepClone(c));
      }
    }

    return {
      ...current,
      categories: mergedCategories.sort((a, b) => a.order - b.order),
    };
  }

  private localStorageKey(): string {
    return `akine.antecedentes.catalog.${this.consultorioId}`;
  }

  private saveLocalCatalog(catalog: AntecedenteCatalog): void {
    localStorage.setItem(this.localStorageKey(), JSON.stringify(catalog));
  }

  private loadLocalCatalog(): AntecedenteCatalog | null {
    const raw = localStorage.getItem(this.localStorageKey());
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AntecedenteCatalog;
    } catch {
      return null;
    }
  }
}




