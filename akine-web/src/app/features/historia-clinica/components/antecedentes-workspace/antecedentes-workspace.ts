import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import {
  AntecedenteCatalogCategory,
  AntecedenteCatalogItem,
  AntecedenteCatalogOption,
} from '../../../consultorios/models/antecedente-catalog.models';
import { HistoriaClinicaAntecedenteItem } from '../../models/historia-clinica.models';

type WorkspaceContext = 'create' | 'edit';
type WorkspaceFilter = 'all' | 'frequent' | 'selected' | 'critical';
type AntecedenteUxMode = 'simple' | 'detail' | 'form';
type AntecedenteEditorSchema = 'detail' | 'allergy' | 'medication' | 'surgery' | 'uncatalogued';
type AntecedenteCardState = 'selected' | 'requires_complete' | 'complete';

type WorkspaceCategoryView = AntecedenteCatalogCategory & {
  selectedCount: number;
  items: AntecedenteCatalogItem[];
};

type SelectedAntecedenteCard = {
  index: number;
  label: string;
  categoryName: string;
  detail: string | null;
  notesPreview: string | null;
  critical: boolean;
  state: AntecedenteCardState;
  stateLabel: string;
  mode: AntecedenteUxMode;
  modeLabel: string;
  descriptor: AntecedenteDescriptor;
  trackKey: string;
};

type AntecedenteDescriptor = {
  mode: AntecedenteUxMode;
  schema: AntecedenteEditorSchema;
  modeLabel: string;
};

type EditorState = {
  index: number;
  category: AntecedenteCatalogCategory | null;
  item: AntecedenteCatalogItem | null;
  descriptor: AntecedenteDescriptor;
  isNew: boolean;
};

const FREQUENT_ITEM_CODES = new Set([
  'APP_HTA',
  'APP_DIABETES',
  'APP_OSTEOPOROSIS',
  'MED_GRUPOS',
  'TRAU_FRACTURAS',
  'HAB_ACT_FISICA',
  'HAB_SEDENTARISMO',
  'HAB_TABACO',
  'HAB_ALCOHOL',
  'ALG_TIPOS',
]);

const CRITICAL_ITEM_CODES = new Set([
  'APP_HTA',
  'APP_DIABETES',
  'APP_CARDIO',
  'APP_ACV',
  'APP_RESP',
  'APP_CANCER',
  'MED_GRUPOS',
  'ALG_TIPOS',
]);

@Component({
  selector: 'app-antecedentes-workspace',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './antecedentes-workspace.html',
  styleUrl: './antecedentes-workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AntecedentesWorkspaceComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly context = input<WorkspaceContext>('edit');
  readonly categories = input<AntecedenteCatalogCategory[]>([]);
  readonly formArray = input.required<FormArray<FormGroup>>();
  readonly emptySelectionMessage = input('No hay antecedentes cargados todavia.');

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly quickFilter = signal<WorkspaceFilter>('all');
  readonly activeCategoryCode = signal('');
  readonly showSelectedPanel = signal(true);
  readonly editor = signal<EditorState | null>(null);

  readonly editorForm = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    detail: new FormControl('', { nonNullable: true }),
    detailMulti: new FormControl<string[]>([], { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    critical: new FormControl(false, { nonNullable: true }),
    substance: new FormControl('', { nonNullable: true }),
    reaction: new FormControl('', { nonNullable: true }),
    severity: new FormControl('', { nonNullable: true }),
    medication: new FormControl('', { nonNullable: true }),
    dose: new FormControl('', { nonNullable: true }),
    frequency: new FormControl('', { nonNullable: true }),
    procedure: new FormControl('', { nonNullable: true }),
    approxDate: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    observations: new FormControl('', { nonNullable: true }),
  });

  private readonly searchTerm = signal('');
  private readonly formVersion = signal(0);
  private readonly editorVersion = signal(0);

  readonly filterOptions = computed(() => {
    this.formVersion();
    const selectedCount = this.selectedCards().length;
    const criticalCount = this.selectedCards().filter((card) => card.critical).length;
    const frequentCount = this.visibleCatalogItemCount('frequent');
    const criticalCatalogCount = this.visibleCatalogItemCount('critical');
    return [
      { value: 'all' as const, label: 'Todos', count: this.visibleCatalogItemCount('all') },
      { value: 'frequent' as const, label: 'Frecuentes', count: frequentCount },
      { value: 'selected' as const, label: 'Seleccionados', count: selectedCount },
      { value: 'critical' as const, label: 'Criticos', count: Math.max(criticalCount, criticalCatalogCount) },
    ];
  });

  readonly visibleCategories = computed<WorkspaceCategoryView[]>(() => {
    this.formVersion();
    const query = this.normalize(this.searchTerm());
    const filter = this.quickFilter();
    const selectedKeys = this.selectedKeySet();
    const criticalLabels = new Set(
      this.selectedCards()
        .filter((card) => card.critical)
        .map((card) => this.normalize(card.label)),
    );

    return [...this.categories()]
      .filter((category) => category.active)
      .sort((a, b) => a.order - b.order)
      .map((category) => {
        const items = [...category.items]
          .filter((item) => item.active)
          .sort((a, b) => a.order - b.order)
          .filter((item) => {
            const haystack = `${item.label} ${category.name}`;
            if (query && !this.normalize(haystack).includes(query)) {
              return false;
            }
            if (filter === 'frequent') {
              return FREQUENT_ITEM_CODES.has(item.code);
            }
            if (filter === 'selected') {
              return selectedKeys.has(this.catalogKey(category.code, item.code));
            }
            if (filter === 'critical') {
              return CRITICAL_ITEM_CODES.has(item.code) || criticalLabels.has(this.normalize(item.label));
            }
            return true;
          });

        return {
          ...category,
          items,
          selectedCount: this.selectedCards().filter((card) => card.categoryName === category.name).length,
        };
      })
      .filter((category) => category.items.length || category.selectedCount > 0);
  });

  readonly activeCategory = computed<WorkspaceCategoryView | null>(() => {
    const categories = this.visibleCategories();
    const current = this.activeCategoryCode();
    return categories.find((category) => category.code === current) ?? categories[0] ?? null;
  });

  readonly selectedCards = computed<SelectedAntecedenteCard[]>(() => {
    this.formVersion();
    return this.formArray().controls.map((control, index) => {
      const item = control.getRawValue() as HistoriaClinicaAntecedenteItem;
      const catalogEntry = this.findCatalogEntry(item.categoryCode ?? '', item.catalogItemCode ?? '');
      const descriptor = this.describeAntecedente(catalogEntry?.item ?? null, item);
      const state = this.resolveCardState(item, descriptor);
      return {
        index,
        label: item.label || 'Antecedente',
        categoryName: catalogEntry?.category.name ?? 'Sin categoria',
        detail: this.primaryPreview(item),
        notesPreview: this.secondaryPreview(item, descriptor.schema),
        critical: !!item.critical,
        state,
        stateLabel:
          state === 'requires_complete'
            ? 'Requiere completar'
            : state === 'complete'
              ? 'Completo'
              : 'Seleccionado',
        mode: descriptor.mode,
        modeLabel: descriptor.modeLabel,
        descriptor,
        trackKey: `${item.categoryCode ?? 'libre'}::${item.catalogItemCode ?? item.label ?? index}::${index}`,
      };
    });
  });

  readonly activeOptions = computed<AntecedenteCatalogOption[]>(() => {
    const item = this.editor()?.item;
    if (!item?.options?.length) {
      return [];
    }
    return [...item.options].filter((option) => option.active).sort((a, b) => a.order - b.order);
  });

  constructor() {
    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.searchTerm.set(value);
    });

    this.editorForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.editorVersion.update((version) => version + 1);
    });

    effect((onCleanup) => {
      const array = this.formArray();
      this.formVersion.update((version) => version + 1);
      const subscription = merge(array.valueChanges, array.statusChanges).subscribe(() => {
        this.formVersion.update((version) => version + 1);
      });
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const categories = this.visibleCategories();
      const current = this.activeCategoryCode();
      if (!categories.length) {
        if (current) {
          this.activeCategoryCode.set('');
        }
        return;
      }
      if (!categories.some((category) => category.code === current)) {
        this.activeCategoryCode.set(categories[0].code);
      }
    });
  }

  setQuickFilter(filter: WorkspaceFilter): void {
    this.quickFilter.set(filter);
  }

  selectCategory(categoryCode: string): void {
    this.activeCategoryCode.set(categoryCode);
  }

  toggleSelectedPanel(): void {
    this.showSelectedPanel.update((value) => !value);
  }

  onCatalogItemClick(category: AntecedenteCatalogCategory, item: AntecedenteCatalogItem): void {
    const existingIndex = this.findSelectedIndex(category.code, item.code);
    const descriptor = this.describeAntecedente(item, {
      categoryCode: category.code,
      catalogItemCode: item.code,
      label: item.label,
    });

    if (existingIndex >= 0) {
      this.openEditor(existingIndex, category, item, false);
      return;
    }

    const initialGroup = this.createAntecedenteGroup({
      categoryCode: category.code,
      catalogItemCode: item.code,
      label: item.label,
      valueText: '',
      critical: false,
      notes: '',
    });
    this.formArray().push(initialGroup);
    this.bumpFormVersion();

    const createdIndex = this.formArray().length - 1;
    if (descriptor.mode === 'simple') {
      return;
    }
    this.openEditor(createdIndex, category, item, true);
  }

  addFreeAntecedente(): void {
    this.formArray().push(
      this.createAntecedenteGroup({
        categoryCode: '',
        catalogItemCode: '',
        label: '',
        valueText: '',
        critical: false,
        notes: '',
      }),
    );
    this.bumpFormVersion();
    this.openEditor(this.formArray().length - 1, null, null, true);
  }

  editSelected(index: number): void {
    const item = this.formArray().at(index)?.getRawValue() as HistoriaClinicaAntecedenteItem | undefined;
    if (!item) {
      return;
    }
    const catalogEntry = this.findCatalogEntry(item.categoryCode ?? '', item.catalogItemCode ?? '');
    this.openEditor(index, catalogEntry?.category ?? null, catalogEntry?.item ?? null, false);
  }

  removeSelected(index: number): void {
    this.formArray().removeAt(index);
    const editor = this.editor();
    if (!editor) {
      this.bumpFormVersion();
      return;
    }
    if (editor.index === index) {
      this.closeEditor();
    } else if (editor.index > index) {
      this.editor.set({ ...editor, index: editor.index - 1 });
    }
    this.bumpFormVersion();
  }

  closeEditor(): void {
    const editor = this.editor();
    if (!editor) {
      return;
    }
    const item = this.formArray().at(editor.index)?.getRawValue() as HistoriaClinicaAntecedenteItem | undefined;
    if (
      editor.isNew &&
      item &&
      !item.label.trim() &&
      !item.valueText?.trim() &&
      !item.notes?.trim() &&
      !item.critical
    ) {
      this.formArray().removeAt(editor.index);
      this.bumpFormVersion();
    }
    this.editor.set(null);
    this.editorForm.reset(
      {
        label: '',
        detail: '',
        detailMulti: [],
        notes: '',
        critical: false,
        substance: '',
        reaction: '',
        severity: '',
        medication: '',
        dose: '',
        frequency: '',
        procedure: '',
        approxDate: '',
        category: '',
        observations: '',
      },
      { emitEvent: false },
    );
  }

  toggleMultiOption(optionLabel: string): void {
    const current = [...this.editorForm.controls.detailMulti.value];
    const exists = current.includes(optionLabel);
    this.editorForm.controls.detailMulti.setValue(
      exists ? current.filter((value) => value !== optionLabel) : [...current, optionLabel],
    );
  }

  isMultiOptionSelected(optionLabel: string): boolean {
    return this.editorForm.controls.detailMulti.value.includes(optionLabel);
  }

  canSaveEditor(): boolean {
    this.editorVersion();
    const editor = this.editor();
    if (!editor) {
      return false;
    }
    const raw = this.editorForm.getRawValue();
    switch (editor.descriptor.schema) {
      case 'allergy':
        return !!raw.substance.trim() && !!raw.reaction.trim() && !!raw.severity.trim();
      case 'medication':
        return !!raw.medication.trim() && !!raw.dose.trim() && !!raw.frequency.trim();
      case 'surgery':
        return !!raw.procedure.trim();
      case 'uncatalogued':
        return !!raw.label.trim() && !!raw.category.trim();
      case 'detail':
      default:
        if (editor.descriptor.mode === 'simple') {
          return !!raw.label.trim();
        }
        if (editor.item?.valueType === 'ENUM_MULTI') {
          return raw.detailMulti.length > 0;
        }
        return !!raw.detail.trim();
    }
  }

  saveEditor(): void {
    const editor = this.editor();
    if (!editor) {
      return;
    }
    const group = this.formArray().at(editor.index) as FormGroup | undefined;
    if (!group || !this.canSaveEditor()) {
      return;
    }

    const raw = this.editorForm.getRawValue();
    const current = group.getRawValue() as HistoriaClinicaAntecedenteItem;
    const baseValue = {
      categoryCode: current.categoryCode ?? '',
      catalogItemCode: current.catalogItemCode ?? '',
      label: current.label ?? '',
    };

    if (editor.descriptor.schema === 'allergy') {
      group.patchValue({
        ...baseValue,
        valueText: [raw.substance, raw.reaction, raw.severity].filter(Boolean).join(' · '),
        critical: raw.critical,
        notes: this.composeStructuredNotes([
          ['Sustancia', raw.substance],
          ['Reaccion', raw.reaction],
          ['Severidad', raw.severity],
          ['Notas', raw.notes],
        ]),
      });
    } else if (editor.descriptor.schema === 'medication') {
      group.patchValue({
        ...baseValue,
        valueText: [raw.medication, raw.dose, raw.frequency].filter(Boolean).join(' · '),
        critical: raw.critical,
        notes: this.composeStructuredNotes([
          ['Medicacion', raw.medication],
          ['Dosis', raw.dose],
          ['Frecuencia', raw.frequency],
          ['Notas', raw.notes],
        ]),
      });
    } else if (editor.descriptor.schema === 'surgery') {
      group.patchValue({
        ...baseValue,
        valueText: [raw.procedure, raw.approxDate].filter(Boolean).join(' · '),
        critical: raw.critical,
        notes: this.composeStructuredNotes([
          ['Procedimiento', raw.procedure],
          ['Fecha aproximada', raw.approxDate],
          ['Observaciones', raw.notes],
        ]),
      });
    } else if (editor.descriptor.schema === 'uncatalogued') {
      group.patchValue({
        categoryCode: '',
        catalogItemCode: '',
        label: raw.label.trim(),
        valueText: raw.category.trim(),
        critical: raw.critical,
        notes: this.composeStructuredNotes([
          ['Categoria', raw.category],
          ['Observaciones', raw.observations || raw.notes],
        ]),
      });
    } else {
      const detail =
        editor.item?.valueType === 'ENUM_MULTI' ? raw.detailMulti.join(', ') : raw.detail.trim();
      group.patchValue({
        ...baseValue,
        label: editor.item ? current.label : raw.label.trim(),
        valueText: detail,
        critical: raw.critical,
        notes: raw.notes.trim(),
      });
    }

    group.markAsDirty();
    group.markAsTouched();
    this.bumpFormVersion();
    this.closeEditor();
  }

  actionLabelForCategoryItem(categoryCode: string, itemCode: string): string {
    const index = this.findSelectedIndex(categoryCode, itemCode);
    if (index < 0) {
      const category = this.categories().find((entry) => entry.code === categoryCode) ?? null;
      const item = category?.items.find((entry) => entry.code === itemCode) ?? null;
      const descriptor = this.describeAntecedente(item, {
        categoryCode,
        catalogItemCode: itemCode,
        label: item?.label ?? '',
      });
      return descriptor.mode === 'simple' ? 'Agregar' : 'Completar';
    }
    return 'Editar';
  }

  isCategoryItemSelected(categoryCode: string, itemCode: string): boolean {
    return this.findSelectedIndex(categoryCode, itemCode) >= 0;
  }

  isCategoryItemPending(categoryCode: string, itemCode: string): boolean {
    const index = this.findSelectedIndex(categoryCode, itemCode);
    if (index < 0) {
      return false;
    }
    return this.selectedCards()[index]?.state === 'requires_complete';
  }

  private openEditor(
    index: number,
    category: AntecedenteCatalogCategory | null,
    item: AntecedenteCatalogItem | null,
    isNew: boolean,
  ): void {
    const current = this.formArray().at(index)?.getRawValue() as HistoriaClinicaAntecedenteItem | undefined;
    if (!current) {
      return;
    }
    const descriptor = this.describeAntecedente(item, current);
    const parsed = this.parseCurrentValue(current, descriptor.schema);
    const multiValue =
      item?.valueType === 'ENUM_MULTI'
        ? (current.valueText ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [];

    this.editorForm.reset(
      {
        label: current.label ?? '',
        detail: descriptor.mode === 'simple' && item?.valueType === 'BOOLEAN' ? '' : current.valueText ?? '',
        detailMulti: multiValue,
        notes: parsed.notes ?? current.notes ?? '',
        critical: !!current.critical,
        substance: parsed.substance ?? '',
        reaction: parsed.reaction ?? '',
        severity: parsed.severity ?? '',
        medication: parsed.medication ?? '',
        dose: parsed.dose ?? '',
        frequency: parsed.frequency ?? '',
        procedure: parsed.procedure ?? '',
        approxDate: parsed.approxDate ?? '',
        category: parsed.category ?? '',
        observations: parsed.observations ?? '',
      },
      { emitEvent: false },
    );
    this.editor.set({ index, category, item, descriptor, isNew });
    this.editorVersion.update((version) => version + 1);
    this.showSelectedPanel.set(true);
  }

  private findSelectedIndex(categoryCode: string, itemCode: string): number {
    return this.formArray().controls.findIndex((control) => {
      const value = control.getRawValue() as HistoriaClinicaAntecedenteItem;
      return value.categoryCode === categoryCode && value.catalogItemCode === itemCode;
    });
  }

  private visibleCatalogItemCount(filter: WorkspaceFilter): number {
    const query = this.normalize(this.searchTerm());
    const selectedKeys = this.selectedKeySet();
    const criticalLabels = new Set(
      this.selectedCards()
        .filter((card) => card.critical)
        .map((card) => this.normalize(card.label)),
    );

    return this.categories()
      .filter((category) => category.active)
      .flatMap((category) =>
        category.items
          .filter((item) => item.active)
          .filter((item) => {
            const haystack = `${item.label} ${category.name}`;
            if (query && !this.normalize(haystack).includes(query)) {
              return false;
            }
            if (filter === 'frequent') {
              return FREQUENT_ITEM_CODES.has(item.code);
            }
            if (filter === 'critical') {
              return CRITICAL_ITEM_CODES.has(item.code) || criticalLabels.has(this.normalize(item.label));
            }
            if (filter === 'selected') {
              return selectedKeys.has(this.catalogKey(category.code, item.code));
            }
            return true;
          }),
      ).length;
  }

  private selectedKeySet(): Set<string> {
    return new Set(
      this.formArray().controls
        .map((control) => control.getRawValue() as HistoriaClinicaAntecedenteItem)
        .filter((item) => !!item.categoryCode && !!item.catalogItemCode)
        .map((item) => this.catalogKey(item.categoryCode!, item.catalogItemCode!)),
    );
  }

  private catalogKey(categoryCode: string, itemCode: string): string {
    return `${categoryCode}::${itemCode}`;
  }

  private findCatalogEntry(
    categoryCode: string,
    itemCode: string,
  ): { category: AntecedenteCatalogCategory; item: AntecedenteCatalogItem } | null {
    const category = this.categories().find((entry) => entry.code === categoryCode);
    if (!category) {
      return null;
    }
    const item = category.items.find((entry) => entry.code === itemCode);
    return item ? { category, item } : null;
  }

  private describeAntecedente(
    item: AntecedenteCatalogItem | null,
    current: Partial<HistoriaClinicaAntecedenteItem>,
  ): AntecedenteDescriptor {
    const code = current.catalogItemCode ?? item?.code ?? '';
    const categoryCode = current.categoryCode ?? '';

    if (!code) {
      return { mode: 'form', schema: 'uncatalogued', modeLabel: 'Libre' };
    }
    if (code === 'ALG_TIPOS') {
      return { mode: 'form', schema: 'allergy', modeLabel: 'Formulario clinico' };
    }
    if (code === 'MED_GRUPOS') {
      return { mode: 'form', schema: 'medication', modeLabel: 'Formulario clinico' };
    }
    if (categoryCode === 'AQX' || item?.valueType === 'REPEATABLE') {
      return { mode: 'form', schema: 'surgery', modeLabel: 'Formulario clinico' };
    }
    if (
      code === 'APP_DIABETES' ||
      code === 'APP_CANCER' ||
      code === 'TRAU_FRACTURAS' ||
      code === 'TRAU_LUXACIONES' ||
      code === 'TRAU_DEPORTIVAS' ||
      code === 'HAB_TRABAJO' ||
      code === 'HAB_ACT_FISICA'
    ) {
      return { mode: 'detail', schema: 'detail', modeLabel: 'Detalle corto' };
    }
    if (code === 'HAB_TABACO' || code === 'HAB_ALCOHOL') {
      return { mode: 'simple', schema: 'detail', modeLabel: 'Seleccion simple' };
    }
    if (item?.valueType === 'ENUM' || item?.valueType === 'ENUM_MULTI' || item?.valueType === 'TEXT') {
      return { mode: 'detail', schema: 'detail', modeLabel: 'Detalle corto' };
    }
    return { mode: 'simple', schema: 'detail', modeLabel: 'Seleccion simple' };
  }

  private resolveCardState(
    item: HistoriaClinicaAntecedenteItem,
    descriptor: AntecedenteDescriptor,
  ): AntecedenteCardState {
    const hasDetail = !!item.valueText?.trim();
    if (descriptor.mode !== 'simple' && !hasDetail) {
      return 'requires_complete';
    }
    if (descriptor.mode === 'simple' && !hasDetail) {
      return 'selected';
    }
    return 'complete';
  }

  private primaryPreview(item: HistoriaClinicaAntecedenteItem): string | null {
    return item.valueText?.trim() || null;
  }

  private secondaryPreview(item: HistoriaClinicaAntecedenteItem, schema: AntecedenteEditorSchema): string | null {
    if (!item.notes?.trim()) {
      return null;
    }
    const parsed = this.parseStructuredLines(item.notes);
    if (!parsed.size) {
      return item.notes.trim();
    }
    if (schema === 'uncatalogued') {
      return parsed.get('Observaciones') ?? null;
    }
    if (schema === 'surgery') {
      return parsed.get('Observaciones') ?? null;
    }
    if (schema === 'allergy' || schema === 'medication') {
      return parsed.get('Notas') ?? null;
    }
    return item.notes.trim();
  }

  private parseCurrentValue(item: HistoriaClinicaAntecedenteItem, schema: AntecedenteEditorSchema) {
    const lines = this.parseStructuredLines(item.notes ?? '');
    const parts = (item.valueText ?? '')
      .split('·')
      .map((value) => value.trim())
      .filter(Boolean);

    if (schema === 'allergy') {
      return {
        substance: lines.get('Sustancia') ?? parts[0] ?? '',
        reaction: lines.get('Reaccion') ?? parts[1] ?? '',
        severity: lines.get('Severidad') ?? parts[2] ?? '',
        notes: lines.get('Notas') ?? '',
      };
    }
    if (schema === 'medication') {
      return {
        medication: lines.get('Medicacion') ?? parts[0] ?? '',
        dose: lines.get('Dosis') ?? parts[1] ?? '',
        frequency: lines.get('Frecuencia') ?? parts[2] ?? '',
        notes: lines.get('Notas') ?? '',
      };
    }
    if (schema === 'surgery') {
      return {
        procedure: lines.get('Procedimiento') ?? parts[0] ?? '',
        approxDate: lines.get('Fecha aproximada') ?? parts[1] ?? '',
        notes: lines.get('Observaciones') ?? '',
      };
    }
    if (schema === 'uncatalogued') {
      return {
        category: lines.get('Categoria') ?? item.valueText ?? '',
        observations: lines.get('Observaciones') ?? '',
        notes: lines.get('Observaciones') ?? '',
      };
    }
    return {
      notes: item.notes ?? '',
    };
  }

  private parseStructuredLines(raw: string): Map<string, string> {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce((acc, line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) {
          return acc;
        }
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (key && value) {
          acc.set(key, value);
        }
        return acc;
      }, new Map<string, string>());
  }

  private composeStructuredNotes(entries: Array<[string, string]>): string {
    return entries
      .map(([label, value]) => [label, value.trim()] as const)
      .filter(([, value]) => !!value)
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n');
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private createAntecedenteGroup(item?: Partial<HistoriaClinicaAntecedenteItem>): FormGroup {
    return new FormGroup({
      categoryCode: new FormControl(item?.categoryCode ?? '', { nonNullable: true }),
      catalogItemCode: new FormControl(item?.catalogItemCode ?? '', { nonNullable: true }),
      label: new FormControl(item?.label ?? '', { nonNullable: true }),
      valueText: new FormControl(item?.valueText ?? '', { nonNullable: true }),
      critical: new FormControl(item?.critical ?? false, { nonNullable: true }),
      notes: new FormControl(item?.notes ?? '', { nonNullable: true }),
    });
  }

  private bumpFormVersion(): void {
    this.formVersion.update((version) => version + 1);
  }
}
