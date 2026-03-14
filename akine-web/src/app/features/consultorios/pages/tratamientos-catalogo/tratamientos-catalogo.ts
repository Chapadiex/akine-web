import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageSectionHeaderComponent } from '../../../../shared/ui/page-section-header/page-section-header';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  TratamientoCatalog,
  TratamientoCatalogItem,
  TratamientoCatalogModalidad,
  TratamientoCatalogTipo,
} from '../../models/tratamiento-catalog.models';
import { TratamientoCatalogService } from '../../services/tratamiento-catalog.service';
import { resolveConsultorioId } from '../../utils/route-utils';

@Component({
  selector: 'app-tratamientos-catalogo-page',
  standalone: true,
  imports: [FormsModule, ConfirmDialog, PageSectionHeaderComponent],
  template: `
    <div class="page">
      <app-page-section-header
        title="Tratamientos"
        description="Maestro operativo por consultorio para planes terapéuticos, autorizaciones y configuración clínica."
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
        <button header-actions class="btn-primary" type="button" (click)="openCreate()">+ Agregar tratamiento</button>
      </app-page-section-header>

      @if (loading()) {
        <div class="empty">Cargando tratamientos...</div>
      } @else if (maestro(); as current) {
        @if (filtersExpanded()) {
          <div class="filters-panel">
            <div class="filters-main">
              <input
                type="search"
                [ngModel]="search()"
                (ngModelChange)="search.set($event)"
                placeholder="Buscar por nombre, codigo, descripcion o modalidad"
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
                <th class="col-text">Tratamiento</th>
                <th class="col-text">Clasificacion</th>
                <th class="col-text-short">Operacion</th>
                <th class="col-text">Modalidades</th>
                <th class="col-status">Estado</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredTratamientos(); track item.codigoInterno) {
                <tr>
                  <td class="col-text">
                    <strong>{{ item.nombre }}</strong>
                    <div class="meta">{{ item.codigoInterno }}</div>
                    <div class="meta">{{ item.descripcion }}</div>
                  </td>
                  <td class="col-text">
                    <div>{{ tipoLabel(item.tipo) }}</div>
                    <div class="meta">{{ categoriaLabel(item.categoriaCodigo) }}</div>
                  </td>
                  <td class="col-text-short">
                    <div class="meta-list">
                      @if (item.facturable) { <span>Facturable</span> }
                      @if (item.requierePrescripcionMedica) { <span>Con prescripcion</span> }
                      @if (item.requiereAutorizacion) { <span>Con autorizacion</span> }
                    </div>
                    <div class="meta">{{ item.duracionSugeridaMinutos }} min sugeridos</div>
                  </td>
                  <td class="col-text">
                    <div class="meta-list">
                      @for (modalidad of item.modalidades; track modalidad) {
                        <span>{{ modalidadLabel(modalidad) }}</span>
                      }
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
                  <td colspan="6" class="empty">No hay tratamientos para el filtro actual.</td>
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
        <h4>{{ creating() ? 'Nuevo tratamiento' : 'Editar tratamiento' }}</h4>

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
            <span>Duracion sugerida (minutos)</span>
            <input type="number" min="1" [(ngModel)]="durationText" />
          </label>
        </div>

        <label class="field">
          <span>Descripcion</span>
          <textarea rows="3" [(ngModel)]="editingItem()!.descripcion"></textarea>
        </label>

        <div class="grid-two">
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.facturable" /> Facturable</label>
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.requierePrescripcionMedica" /> Requiere prescripcion</label>
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.requiereAutorizacion" /> Requiere autorizacion</label>
          <label class="check"><input type="checkbox" [(ngModel)]="editingItem()!.activo" /> Activo</label>
        </div>

        <label class="field">
          <span>Modalidades</span>
          <div class="meta-list">
            @for (modalidad of availableModalidades; track modalidad) {
              <label class="check">
                <input
                  type="checkbox"
                  [checked]="editingItem()!.modalidades.includes(modalidad)"
                  (change)="toggleModalidad(modalidad, $any($event.target).checked)"
                />
                {{ modalidadLabel(modalidad) }}
              </label>
            }
          </div>
        </label>

        <div class="drawer-actions">
          <button class="btn-primary" (click)="saveEditor()">Guardar</button>
          <button class="btn-secondary" (click)="closeEditor()">Cancelar</button>
        </div>
      </aside>
    }

    @if (toggleTarget(); as target) {
      <app-confirm-dialog
        [title]="target.activo ? 'Inactivar tratamiento' : 'Activar tratamiento'"
        [message]="'Se actualizara el estado de ' + target.nombre + '.'"
        (confirmed)="confirmToggle()"
        (cancelled)="toggleTarget.set(null)"
      />
    }

    @if (restoreResetConfirm()) {
      <app-confirm-dialog
        title="Restaurar tratamientos"
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
    .filters-main input, .filters-main select, .field input, .field select, .field textarea {
      min-height: 40px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px;
      background: var(--white); color: var(--text);
    }
    .field textarea { min-height: 96px; padding: 12px; }
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
export class TratamientosCatalogoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(TratamientoCatalogService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly loading = signal(true);
  readonly maestro = signal<TratamientoCatalog | null>(null);
  readonly search = signal('');
  readonly selectedTipo = signal('');
  readonly selectedCategoria = signal('');
  readonly filtersExpanded = signal(false);
  readonly editorOpen = signal(false);
  readonly creating = signal(false);
  readonly editingItem = signal<TratamientoCatalogItem | null>(null);
  readonly toggleTarget = signal<TratamientoCatalogItem | null>(null);
  readonly restoreResetConfirm = signal(false);
  durationText = 45;

  readonly availableModalidades: ReadonlyArray<TratamientoCatalogModalidad> = [
    'CONSULTORIO',
    'DOMICILIO',
    'PILETA',
    'INTERNACION',
    'INSTITUCION',
  ];

  private consultorioId = '';
  private originalCodigo = '';

  readonly filteredTratamientos = computed(() => {
    const maestro = this.maestro();
    if (!maestro) return [];
    const query = this.normalize(this.search());
    return maestro.tratamientos
      .filter((item) => !this.selectedTipo() || item.tipo === this.selectedTipo())
      .filter((item) => !this.selectedCategoria() || item.categoriaCodigo === this.selectedCategoria())
      .filter((item) => {
        if (!query) return true;
        return this.normalize(
          `${item.nombre} ${item.codigoInterno} ${item.descripcion} ${item.modalidades.join(' ')}`,
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

  tipoLabel(tipo: TratamientoCatalogTipo): string {
    return tipo === 'PRINCIPAL' ? 'Prestacion principal' : 'Tecnica / componente';
  }

  modalidadLabel(modalidad: TratamientoCatalogModalidad): string {
    switch (modalidad) {
      case 'CONSULTORIO': return 'Consultorio';
      case 'DOMICILIO': return 'Domicilio';
      case 'PILETA': return 'Pileta';
      case 'INTERNACION': return 'Internacion';
      case 'INSTITUCION': return 'Institucion';
    }
  }

  categoriaLabel(codigo: string): string {
    return this.maestro()?.categorias.find((item) => item.codigo === codigo)?.nombre ?? codigo;
  }

  toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  openCreate(): void {
    const draft: TratamientoCatalogItem = {
      id: `TRNEW_${Date.now()}`,
      codigoInterno: `TR_${Date.now()}`,
      nombre: '',
      categoriaCodigo: this.selectedCategoria() || this.maestro()?.categorias[0]?.codigo || '',
      tipo: (this.selectedTipo() as TratamientoCatalogTipo) || this.maestro()?.tipos[0] || 'PRINCIPAL',
      descripcion: '',
      facturable: true,
      requierePrescripcionMedica: false,
      requiereAutorizacion: false,
      duracionSugeridaMinutos: 45,
      modalidades: ['CONSULTORIO'],
      activo: true,
      precioReferencia: null,
      codigosFinanciador: [],
    };
    this.creating.set(true);
    this.originalCodigo = draft.codigoInterno;
    this.editingItem.set(structuredClone(draft));
    this.durationText = draft.duracionSugeridaMinutos;
    this.editorOpen.set(true);
  }

  openEdit(item: TratamientoCatalogItem): void {
    this.creating.set(false);
    this.originalCodigo = item.codigoInterno;
    this.editingItem.set(structuredClone(item));
    this.durationText = item.duracionSugeridaMinutos;
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editingItem.set(null);
    this.creating.set(false);
    this.originalCodigo = '';
    this.durationText = 45;
  }

  toggleModalidad(modalidad: TratamientoCatalogModalidad, checked: boolean): void {
    const current = this.editingItem();
    if (!current) return;
    current.modalidades = checked
      ? Array.from(new Set([...current.modalidades, modalidad]))
      : current.modalidades.filter((item) => item !== modalidad);
    this.editingItem.set(structuredClone(current));
  }

  saveEditor(): void {
    const maestro = this.maestro();
    const draft = this.editingItem();
    if (!maestro || !draft) return;
    draft.nombre = draft.nombre.trim();
    draft.codigoInterno = draft.codigoInterno.trim();
    draft.descripcion = draft.descripcion.trim();
    draft.duracionSugeridaMinutos = Number(this.durationText || 0);

    if (!draft.nombre || !draft.codigoInterno || !draft.categoriaCodigo || !draft.descripcion) {
      this.toast.error('Nombre, codigo, categoria y descripcion son obligatorios.');
      return;
    }
    if (!draft.duracionSugeridaMinutos || draft.duracionSugeridaMinutos < 1) {
      this.toast.error('La duracion sugerida debe ser mayor a cero.');
      return;
    }
    if (!draft.modalidades.length) {
      this.toast.error('Debes seleccionar al menos una modalidad.');
      return;
    }
    const duplicate = maestro.tratamientos.some(
      (item) => item.codigoInterno === draft.codigoInterno && item.codigoInterno !== this.originalCodigo,
    );
    if (duplicate) {
      this.toast.error('Ya existe un tratamiento con ese codigo interno.');
      return;
    }

    const next = structuredClone(maestro);
    const index = next.tratamientos.findIndex((item) => item.codigoInterno === this.originalCodigo);
    if (index >= 0) {
      next.tratamientos[index] = structuredClone(draft);
    } else {
      next.tratamientos.push(structuredClone(draft));
    }
    this.persist(next, this.creating() ? 'Tratamiento agregado.' : 'Tratamiento actualizado.');
    this.closeEditor();
  }

  askToggle(item: TratamientoCatalogItem): void {
    this.toggleTarget.set(item);
  }

  confirmToggle(): void {
    const maestro = this.maestro();
    const target = this.toggleTarget();
    this.toggleTarget.set(null);
    if (!maestro || !target) return;
    const next = structuredClone(maestro);
    const item = next.tratamientos.find((entry) => entry.codigoInterno === target.codigoInterno);
    if (!item) return;
    item.activo = !item.activo;
    this.persist(next, item.activo ? 'Tratamiento activado.' : 'Tratamiento inactivado.');
  }

  restoreMissing(): void {
    this.service.restoreDefaults(this.consultorioId, 'ADD_MISSING').subscribe({
      next: (maestro) => {
        this.maestro.set(maestro);
        this.toast.success('Tratamientos faltantes agregados.');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  confirmRestoreReset(): void {
    this.restoreResetConfirm.set(false);
    this.service.restoreDefaults(this.consultorioId, 'RESET').subscribe({
      next: (maestro) => {
        this.maestro.set(maestro);
        this.toast.success('Tratamientos restaurados.');
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

  private persist(maestro: TratamientoCatalog, successMessage: string): void {
    this.service
      .upsert(this.consultorioId, {
        version: maestro.version,
        monedaNomenclador: maestro.monedaNomenclador,
        pais: maestro.pais,
        observaciones: maestro.observaciones,
        tipos: maestro.tipos,
        categorias: maestro.categorias,
        tratamientos: maestro.tratamientos,
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
