import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  DiagnosticoMedicoItem,
  DiagnosticoMedicoTipo,
  DiagnosticosMedicos,
} from '../../models/diagnosticos-medicos.models';
import { DiagnosticosMedicosService } from '../../services/diagnosticos-medicos.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-diagnosticos-medicos-page',
  standalone: true,
  imports: [FormsModule, ConfirmDialog, PageSectionHeaderComponent],
  template: `
    <div class="page">
      <app-page-section-header
        title="Diagnósticos médicos"
        description="Maestro clasificado por tipo y categoría para historia clínica y prescripciones."
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
        <button header-actions class="btn-primary" type="button" (click)="openCreate()">+ Agregar diagnóstico</button>
      </app-page-section-header>

      @if (loading()) {
        <div class="empty">Cargando diagnosticos medicos...</div>
      } @else if (maestro(); as current) {
        @if (filtersExpanded()) {
          <div class="filters-panel">
            <div class="filters-main">
              <input
                type="search"
                [ngModel]="search()"
                (ngModelChange)="search.set($event)"
                placeholder="Buscar por nombre, codigo o keyword"
              />
              <select [ngModel]="selectedTipo()" (ngModelChange)="selectedTipo.set($event)">
                <option value="">Todos los tipos</option>
                @for (tipo of current.tipos; track tipo) {
                  <option [value]="tipo">{{ tipoLabel(tipo) }}</option>
                }
              </select>
              <select [ngModel]="selectedCategoria()" (ngModelChange)="selectedCategoria.set($event)">
                <option value="">Todas las categorias</option>
                @for (categoria of current.categorias; track categoria.codigo) {
                  <option [value]="categoria.codigo">{{ categoria.nombre }}</option>
                }
              </select>
            </div>
            <div class="filters-actions">
              <button class="btn-secondary" type="button" (click)="restoreMissing()">Agregar faltantes</button>
              <button class="btn-danger" type="button" (click)="restoreResetConfirm.set(true)">Restaurar por defecto</button>
            </div>
          </div>
        }

        <div class="table-wrap">
          <table class="table app-data-table">
            <thead>
              <tr>
                <th class="col-text">Diagnostico</th>
                <th class="col-text">Clasificacion</th>
                <th class="col-text">Region / ICD</th>
                <th class="col-text-short">Reglas</th>
                <th class="col-status">Estado</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredDiagnosticos(); track item.codigoInterno) {
                <tr>
                  <td class="col-text">
                    <strong>{{ item.nombre }}</strong>
                    <div class="meta">{{ item.codigoInterno }}</div>
                  </td>
                  <td class="col-text">
                    <div>{{ tipoLabel(item.tipo) }}</div>
                    <div class="meta">{{ categoriaLabel(item.categoriaCodigo) }}{{ item.subcategoria ? ' · ' + item.subcategoria : '' }}</div>
                  </td>
                  <td class="col-text">
                    <div>{{ item.regionAnatomica }}</div>
                    <div class="meta">{{ item.codigoIcd10Exacto || item.grupoIcd10 || 'Sin ICD' }}</div>
                  </td>
                  <td class="col-text-short">
                    <div class="meta-list">
                      @if (item.lateralidadAplica) { <span>Lateralidad</span> }
                      @if (item.requiereOrdenMedica) { <span>Requiere orden</span> }
                    </div>
                  </td>
                  <td class="col-status">
                    <span class="badge" [class.badge--active]="item.activo">
                      {{ item.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="col-actions row-actions">
                    <button class="table-row-action" (click)="openEdit(item)">Editar</button>
                    <button class="table-row-action table-row-action--danger" (click)="askToggle(item)">
                      {{ item.activo ? 'Inactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty">No hay diagnosticos para el filtro actual.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (editorOpen() && editingItem()) {
      <div class="drawer-backdrop" (click)="closeEditor()"></div>
      <aside class="drawer">
        <h4>{{ creating() ? 'Nuevo diagnostico medico' : 'Editar diagnostico medico' }}</h4>

        <label class="field">
          <span>Nombre</span>
          <input type="text" [(ngModel)]="editingItem()!.nombre" />
        </label>
        <div class="grid-two">
          <label class="field">
            <span>Codigo interno</span>
            <input type="text" [(ngModel)]="editingItem()!.codigoInterno" [disabled]="!creating()" />
          </label>
          <label class="field">
            <span>Tipo</span>
            <select [(ngModel)]="editingItem()!.tipo">
              @for (tipo of maestro()?.tipos ?? []; track tipo) {
                <option [value]="tipo">{{ tipoLabel(tipo) }}</option>
              }
            </select>
          </label>
        </div>

        <div class="grid-two">
          <label class="field">
            <span>Categoria</span>
            <select [(ngModel)]="editingItem()!.categoriaCodigo">
              @for (categoria of maestro()?.categorias ?? []; track categoria.codigo) {
                <option [value]="categoria.codigo">{{ categoria.nombre }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span>Subcategoria</span>
            <input type="text" [(ngModel)]="editingItem()!.subcategoria" />
          </label>
        </div>

        <div class="grid-two">
          <label class="field">
            <span>Region anatomica</span>
            <input type="text" [(ngModel)]="editingItem()!.regionAnatomica" />
          </label>
          <label class="field">
            <span>Grupo ICD-10</span>
            <input type="text" [(ngModel)]="editingItem()!.grupoIcd10" />
          </label>
        </div>

        <div class="grid-two">
          <label class="field">
            <span>ICD-10 exacto</span>
            <input type="text" [(ngModel)]="editingItem()!.codigoIcd10Exacto" />
          </label>
          <label class="field">
            <span>Keywords</span>
            <input type="text" [ngModel]="keywordsText()" (ngModelChange)="keywordsText.set($event)" placeholder="Separadas por coma" />
          </label>
        </div>

        <div class="grid-two">
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.lateralidadAplica" /> Lateralidad aplica</label>
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.requiereOrdenMedica" /> Requiere orden medica</label>
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.activo" /> Activo</label>
        </div>

        <div class="drawer-actions">
          <button class="btn-primary" (click)="saveEditor()">Guardar</button>
          <button class="btn-secondary" (click)="closeEditor()">Cancelar</button>
        </div>
      </aside>
    }

    @if (toggleTarget(); as target) {
      <app-confirm-dialog
        [title]="target.activo ? 'Inactivar diagnostico medico' : 'Activar diagnostico medico'"
        [message]="'Se actualizara el estado de ' + target.nombre + '.'"
        (confirmed)="confirmToggle()"
        (cancelled)="toggleTarget.set(null)"
      />
    }

    @if (restoreResetConfirm()) {
      <app-confirm-dialog
        title="Restaurar diagnosticos medicos"
        message="Se restaurara el maestro por defecto del consultorio."
        (confirmed)="confirmRestoreReset()"
        (cancelled)="restoreResetConfirm.set(false)"
      />
    }
  `,
  styles: [`
    .page { display: grid; gap: 16px; }
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
    .row-actions, .drawer-actions, .meta-list { display: flex; gap: 8px; flex-wrap: wrap; }
    .filters-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: .85rem;
      align-items: start;
      padding: .85rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--white) 92%, var(--bg));
    }
    .filters-main,
    .filters-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .filters-main { align-items: center; }
    .filters-main input, .filters-main select, .field input, .field select {
      min-height: 40px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px;
      background: var(--white); color: var(--text);
    }
    .filters-main input { flex: 1; min-width: 260px; }
    .table-wrap { border: 1px solid var(--border); border-radius: 12px; background: var(--white); overflow: auto; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; font-size: .84rem; }
    .table th { color: var(--text-muted); font-weight: 600; }
    .meta { color: var(--text-muted); font-size: .76rem; }
    .badge { display: inline-flex; padding: 3px 9px; border-radius: 999px; background: var(--surface-soft, #f3f4f6); color: var(--text-muted); }
    .badge--active { background: var(--success-bg); color: var(--success); }
    .empty { padding: 20px; text-align: center; color: var(--text-muted); }
    .btn-primary, .btn-secondary, .btn-danger, .btn-sm {
      min-height: 36px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px;
      background: var(--white); cursor: pointer;
    }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
    .btn-danger, .btn-warn { color: var(--error); }
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, .28); z-index: 1000; }
    .drawer {
      position: fixed; top: 0; right: 0; width: min(720px, 95vw); height: 100vh; z-index: 1001;
      background: var(--white); border-left: 1px solid var(--border); padding: 16px; overflow: auto; display: grid; gap: 12px;
    }
    .field { display: grid; gap: 6px; }
    .field span { font-size: .8rem; color: var(--text-muted); }
    .grid-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .check { display: inline-flex; gap: 8px; align-items: center; min-height: 40px; }
    @media (max-width: 920px) {
      .btn-primary { flex: 1 1 auto; text-align: center; }
      .filters-panel { grid-template-columns: 1fr; }
      .filters-main { flex-direction: column; align-items: stretch; }
      .grid-two { grid-template-columns: 1fr; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticosMedicosPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(DiagnosticosMedicosService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly loading = signal(true);
  readonly maestro = signal<DiagnosticosMedicos | null>(null);
  readonly search = signal('');
  readonly selectedTipo = signal('');
  readonly selectedCategoria = signal('');
  readonly filtersExpanded = signal(false);
  readonly editorOpen = signal(false);
  readonly creating = signal(false);
  readonly editingItem = signal<DiagnosticoMedicoItem | null>(null);
  readonly toggleTarget = signal<DiagnosticoMedicoItem | null>(null);
  readonly restoreResetConfirm = signal(false);
  readonly keywordsText = signal('');

  private consultorioId = '';
  private originalCodigo = '';

  readonly filteredDiagnosticos = computed(() => {
    const maestro = this.maestro();
    if (!maestro) return [];
    const query = this.normalize(this.search());
    return maestro.diagnosticos
      .filter((item) => !this.selectedTipo() || item.tipo === this.selectedTipo())
      .filter((item) => !this.selectedCategoria() || item.categoriaCodigo === this.selectedCategoria())
      .filter((item) => {
        if (!query) return true;
        return this.normalize(
          `${item.nombre} ${item.codigoInterno} ${item.subcategoria ?? ''} ${item.keywords.join(' ')}`,
        ).includes(query);
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
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

  tipoLabel(tipo: DiagnosticoMedicoTipo): string {
    switch (tipo) {
      case 'DIAGNOSTICO_MEDICO':
        return 'Diagnostico medico';
      case 'MOTIVO_DERIVACION':
        return 'Motivo de derivacion';
      case 'FUNCIONAL':
        return 'Funcional';
      case 'POSTQUIRURGICO':
        return 'Postquirurgico';
    }
  }

  categoriaLabel(codigo: string): string {
    return this.maestro()?.categorias.find((item) => item.codigo === codigo)?.nombre ?? codigo;
  }

  toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  openCreate(): void {
    const draft: DiagnosticoMedicoItem = {
      id: `DXNEW_${Date.now()}`,
      codigoInterno: `DX_${Date.now()}`,
      nombre: '',
      categoriaCodigo: this.selectedCategoria() || this.maestro()?.categorias[0]?.codigo || '',
      subcategoria: '',
      tipo: (this.selectedTipo() as DiagnosticoMedicoTipo) || this.maestro()?.tipos[0] || 'DIAGNOSTICO_MEDICO',
      regionAnatomica: '',
      grupoIcd10: '',
      codigoIcd10Exacto: null,
      lateralidadAplica: false,
      requiereOrdenMedica: false,
      activo: true,
      origenesHabituales: [],
      keywords: [],
    };
    this.creating.set(true);
    this.originalCodigo = draft.codigoInterno;
    this.editingItem.set(structuredClone(draft));
    this.keywordsText.set('');
    this.editorOpen.set(true);
  }

  openEdit(item: DiagnosticoMedicoItem): void {
    this.creating.set(false);
    this.originalCodigo = item.codigoInterno;
    this.editingItem.set(structuredClone(item));
    this.keywordsText.set(item.keywords.join(', '));
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingItem.set(null);
    this.creating.set(false);
    this.originalCodigo = '';
    this.keywordsText.set('');
  }

  saveEditor(): void {
    const maestro = this.maestro();
    const draft = this.editingItem();
    if (!maestro || !draft) return;
    draft.nombre = draft.nombre.trim();
    draft.codigoInterno = draft.codigoInterno.trim();
    draft.regionAnatomica = draft.regionAnatomica.trim();
    draft.subcategoria = draft.subcategoria?.trim() || null;
    draft.grupoIcd10 = draft.grupoIcd10?.trim() || null;
    draft.codigoIcd10Exacto = draft.codigoIcd10Exacto?.trim() || null;
    draft.keywords = this.keywordsText()
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!draft.nombre || !draft.codigoInterno || !draft.categoriaCodigo || !draft.regionAnatomica) {
      this.toast.error('Nombre, codigo, categoria y region anatomica son obligatorios.');
      return;
    }
    const duplicate = maestro.diagnosticos.some(
      (item) => item.codigoInterno === draft.codigoInterno && item.codigoInterno !== this.originalCodigo,
    );
    if (duplicate) {
      this.toast.error('Ya existe un diagnostico con ese codigo interno.');
      return;
    }

    const next = structuredClone(maestro);
    const index = next.diagnosticos.findIndex((item) => item.codigoInterno === this.originalCodigo);
    if (index >= 0) {
      next.diagnosticos[index] = structuredClone(draft);
    } else {
      next.diagnosticos.push(structuredClone(draft));
    }
    this.persist(next, this.creating() ? 'Diagnostico medico agregado.' : 'Diagnostico medico actualizado.');
    this.closeEditor();
  }

  askToggle(item: DiagnosticoMedicoItem): void {
    this.toggleTarget.set(item);
  }

  confirmToggle(): void {
    const maestro = this.maestro();
    const target = this.toggleTarget();
    this.toggleTarget.set(null);
    if (!maestro || !target) return;
    const next = structuredClone(maestro);
    const item = next.diagnosticos.find((entry) => entry.codigoInterno === target.codigoInterno);
    if (!item) return;
    item.activo = !item.activo;
    this.persist(next, item.activo ? 'Diagnostico medico activado.' : 'Diagnostico medico inactivado.');
  }

  restoreMissing(): void {
    this.service.restoreDefaults(this.consultorioId, 'ADD_MISSING').subscribe({
      next: (maestro) => {
        this.maestro.set(maestro);
        this.toast.success('Diagnosticos medicos faltantes agregados.');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  confirmRestoreReset(): void {
    this.restoreResetConfirm.set(false);
    this.service.restoreDefaults(this.consultorioId, 'RESET').subscribe({
      next: (maestro) => {
        this.maestro.set(maestro);
        this.toast.success('Diagnosticos medicos restaurados.');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service.get(this.consultorioId).subscribe({
      next: (maestro) => {
        this.maestro.set(maestro);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }

  private persist(maestro: DiagnosticosMedicos, successMessage: string): void {
    this.service
      .upsert(this.consultorioId, {
        version: maestro.version,
        pais: maestro.pais,
        idioma: maestro.idioma,
        tipos: maestro.tipos,
        categorias: maestro.categorias,
        diagnosticos: maestro.diagnosticos,
      })
      .subscribe({
        next: (saved) => {
          this.maestro.set(saved);
          this.toast.success(successMessage);
        },
        error: (err) => this.toast.error(this.errMap.toMessage(err)),
      });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
