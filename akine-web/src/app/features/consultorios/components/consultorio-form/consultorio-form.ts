import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Consultorio, ConsultorioRequest } from '../../models/consultorio.models';

interface GeocodeHit {
  lat: string;
  lon: string;
  display_name?: string;
}

@Component({
  selector: 'app-consultorio-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <h3 class="panel-title">{{ editItem() ? 'Editar' : 'Nuevo' }} Consultorio</h3>

        <nav class="tabs" aria-label="Secciones del formulario">
          <button
            type="button"
            class="tab"
            [class.tab-active]="activeTab() === 'datos'"
            (click)="activeTab.set('datos')"
          >
            Datos del consultorio
          </button>
          <button
            type="button"
            class="tab"
            [class.tab-active]="activeTab() === 'ubicacion'"
            (click)="activeTab.set('ubicacion')"
          >
            Localizacion Google Maps
          </button>
        </nav>

        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (activeTab() === 'datos') {
            <section class="tab-pane">
              <div class="field">
                <label>Nombre *</label>
                <input formControlName="name" placeholder="Ej: Consultorio Central" />
              </div>
              <div class="field">
                <label>CUIT</label>
                <input formControlName="cuit" placeholder="20-12345678-9" />
              </div>
              <div class="field">
                <label>Telefono</label>
                <input formControlName="phone" placeholder="1155550000" />
              </div>
              <div class="field">
                <label>Email</label>
                <input formControlName="email" type="email" placeholder="info@consultorio.com" />
              </div>
            </section>
          }

          @if (activeTab() === 'ubicacion') {
            <section class="tab-pane">
              <div class="field field-search">
                <label>Buscar ubicacion en mapa</label>
                <div class="inline-input">
                  <input
                    [value]="mapSearchQuery()"
                    (input)="onMapQueryInput($event)"
                    placeholder="Ej: Av. Siempreviva 123, Buenos Aires"
                  />
                  <button
                    type="button"
                    class="btn-link"
                    (click)="searchMapLocations()"
                    [disabled]="isSearchingLocations() || !mapSearchQuery().trim()"
                  >
                    {{ isSearchingLocations() ? 'Buscando...' : 'Buscar ubicacion' }}
                  </button>
                </div>
              </div>

              @if (searchError()) {
                <p class="search-error">{{ searchError() }}</p>
              }

              @if (locationResults().length > 0) {
                <div class="location-results" role="listbox" aria-label="Resultados de ubicacion">
                  @for (hit of locationResults(); track hit.lat + ',' + hit.lon + '-' + $index) {
                    <button type="button" class="location-result" (click)="selectLocation(hit)">
                      <span class="location-result-title">{{ hit.display_name || 'Ubicacion encontrada' }}</span>
                      <span class="location-result-cta">Seleccionar ubicacion</span>
                    </button>
                  }
                </div>
              }

              @if (selectedLocationLabel()) {
                <p class="selected-location">Ubicacion seleccionada: {{ selectedLocationLabel() }}</p>
              }

              <div class="map-preview-card">
                @if (mapPreviewUrl()) {
                  <iframe
                    class="map-frame"
                    [src]="mapPreviewUrl()"
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                    title="Mapa embebido del consultorio"
                  ></iframe>
                } @else {
                  <div class="map-placeholder">Busca una ubicacion para ver el mapa.</div>
                }
              </div>
            </section>
          }

          <div class="actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-save" [disabled]="form.invalid">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 3vh;
      z-index: 900;
    }

    .panel {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: 1.2rem;
      width: min(860px, 96vw);
      max-height: 92vh;
      overflow: auto;
      box-shadow: var(--shadow-lg);
    }

    .panel-title {
      font-size: 1.9rem;
      font-weight: 800;
      margin-bottom: .9rem;
      letter-spacing: -.01em;
    }

    .tabs {
      display: flex;
      gap: .45rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: .95rem;
      padding-bottom: .55rem;
    }

    .tab {
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--white);
      color: var(--text-muted);
      font-size: .85rem;
      font-weight: 700;
      padding: .42rem .82rem;
      cursor: pointer;
    }

    .tab:hover {
      color: var(--text);
      background: var(--bg);
    }

    .tab-active {
      color: var(--primary);
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      background: color-mix(in srgb, var(--primary) 10%, var(--white));
    }

    .tab-pane {
      min-height: 0;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: .35rem;
      margin-bottom: .8rem;
    }

    .field label {
      font-size: .85rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .field input {
      padding: .6rem .85rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: .95rem;
      outline: none;
    }

    .field input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-ring);
    }

    .field-search {
      margin-bottom: .55rem;
    }

    .inline-input {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: .55rem;
      align-items: center;
    }

    .btn-link {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      color: var(--text);
      cursor: pointer;
      font-size: .86rem;
      font-weight: 700;
      padding: .52rem .8rem;
      white-space: nowrap;
    }

    .btn-link:hover {
      background: var(--bg);
    }

    .btn-link:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    .search-error {
      margin: -.2rem 0 .55rem;
      color: var(--error);
      font-size: .82rem;
      font-weight: 600;
    }

    .location-results {
      margin: -.1rem 0 .55rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      max-height: 140px;
      overflow: auto;
    }

    .location-result {
      width: 100%;
      border: 0;
      border-bottom: 1px solid var(--border);
      background: var(--white);
      text-align: left;
      padding: .58rem .72rem;
      cursor: pointer;
      display: grid;
      gap: .18rem;
    }

    .location-result:last-child {
      border-bottom: 0;
    }

    .location-result:hover {
      background: color-mix(in srgb, var(--border) 12%, var(--white));
    }

    .location-result-title {
      color: var(--text);
      font-size: .84rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .location-result-cta {
      color: var(--primary);
      font-size: .78rem;
      font-weight: 700;
    }

    .selected-location {
      margin: 0 0 .52rem;
      color: var(--text-muted);
      font-size: .8rem;
      font-weight: 600;
    }

    .map-preview-card {
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      background: var(--bg);
    }

    .map-frame {
      width: 100%;
      height: 250px;
      border: 0;
      display: block;
      background: #eef2f7;
    }

    .map-placeholder {
      min-height: 250px;
      display: grid;
      place-items: center;
      color: var(--text-muted);
      font-size: .84rem;
      padding: .8rem;
      text-align: center;
    }

    .actions {
      display: flex;
      gap: .75rem;
      justify-content: flex-end;
      margin-top: .9rem;
    }

    .btn-cancel {
      padding: .5rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--white);
      cursor: pointer;
    }

    .btn-save {
      padding: .5rem 1.25rem;
      border: none;
      border-radius: var(--radius);
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-save:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    @media (max-width: 760px) {
      .panel {
        padding: 1rem;
        max-height: 94vh;
      }

      .panel-title {
        font-size: 1.4rem;
        margin-bottom: .75rem;
      }

      .tabs {
        flex-wrap: wrap;
      }

      .tab-pane {
        min-height: auto;
      }

      .inline-input {
        grid-template-columns: 1fr;
      }

      .btn-link {
        width: 100%;
      }

      .map-frame,
      .map-placeholder {
        min-height: 210px;
        height: 210px;
      }
    }
  `],
})
export class ConsultorioForm implements OnInit {
  editItem = input<Consultorio | null>(null);
  saved = output<ConsultorioRequest>();
  cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<'datos' | 'ubicacion'>('datos');
  readonly mapPreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly isSearchingLocations = signal(false);
  readonly mapSearchQuery = signal('');
  readonly locationResults = signal<GeocodeHit[]>([]);
  readonly searchError = signal('');
  readonly selectedLocationLabel = signal('');

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    cuit: [''],
    address: [''],
    phone: [''],
    email: ['', Validators.email],
    mapLatitude: ['', [this.decimalRangeValidator(-90, 90)]],
    mapLongitude: ['', [this.decimalRangeValidator(-180, 180)]],
    googleMapsUrl: [''],
  });

  ngOnInit(): void {
    const item = this.editItem();
    if (item) {
      this.form.patchValue({
        name: item.name,
        cuit: item.cuit ?? '',
        address: item.address ?? '',
        phone: item.phone ?? '',
        email: item.email ?? '',
        mapLatitude: item.mapLatitude != null ? String(item.mapLatitude) : '',
        mapLongitude: item.mapLongitude != null ? String(item.mapLongitude) : '',
        googleMapsUrl: item.googleMapsUrl ?? '',
      });
    }

    const initialQuery = this.form.controls.address.value?.trim() || '';
    this.mapSearchQuery.set(initialQuery);
    this.selectedLocationLabel.set(this.form.controls.address.value?.trim() || '');

    this.form.valueChanges
      .pipe(debounceTime(220), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshMapPreview());

    this.refreshMapPreview();
  }

  onMapQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.mapSearchQuery.set(value);
    this.searchError.set('');
  }

  async searchMapLocations(): Promise<void> {
    const query =
      this.mapSearchQuery().trim() ||
      this.form.controls.address.value?.trim() ||
      '';

    if (!query) {
      this.searchError.set('Ingresa una ubicacion para buscar.');
      return;
    }

    this.isSearchingLocations.set(true);
    this.searchError.set('');

    try {
      const rows = await this.fetchGeocode(query, 5);
      this.locationResults.set(rows);
      if (rows.length === 0) {
        this.searchError.set('No se encontraron resultados para esa busqueda.');
      }
    } catch {
      this.locationResults.set([]);
      this.searchError.set('No se pudo buscar ubicaciones en este momento.');
    } finally {
      this.isSearchingLocations.set(false);
    }
  }

  selectLocation(hit: GeocodeHit): void {
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      this.searchError.set('No se pudo usar la ubicacion seleccionada.');
      return;
    }

    this.form.patchValue({
      mapLatitude: lat.toFixed(6),
      mapLongitude: lng.toFixed(6),
    });

    const label = hit.display_name?.trim() || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    this.form.patchValue({ address: label });
    this.selectedLocationLabel.set(label);
    this.mapSearchQuery.set(label);
    this.locationResults.set([]);
    this.refreshMapPreview();
  }

  submit(): void {
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    this.saved.emit({
      name: values.name,
      cuit: values.cuit || undefined,
      address: this.resolveAddressForSave(values.address),
      phone: values.phone || undefined,
      email: values.email || undefined,
      mapLatitude: this.toNumberOrUndefined(values.mapLatitude),
      mapLongitude: this.toNumberOrUndefined(values.mapLongitude),
      googleMapsUrl: this.editItem()?.googleMapsUrl,
    });
  }

  private refreshMapPreview(): void {
    const lat = this.toNumberOrUndefined(this.form.controls.mapLatitude.value);
    const lng = this.toNumberOrUndefined(this.form.controls.mapLongitude.value);

    let query = '';
    if (lat != null && lng != null) {
      query = `${lat},${lng}`;
    } else {
      query =
        this.form.controls.address.value?.trim() || '';
    }

    if (!query) {
      this.mapPreviewUrl.set(null);
      return;
    }

    const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
    this.mapPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(src));
  }

  private async fetchGeocode(query: string, limit: number): Promise<GeocodeHit[]> {
    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&q=${encodeURIComponent(query)}`;
    const response = await fetch(endpoint, {
      headers: {
        'Accept-Language': 'es',
      },
    });

    if (!response.ok) {
      throw new Error('No se pudo consultar el geocodificador');
    }

    return (await response.json()) as GeocodeHit[];
  }

  private decimalRangeValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      const raw = control.value?.trim();
      if (!raw) return null;
      const parsed = Number(raw.replace(',', '.'));
      if (Number.isNaN(parsed) || parsed < min || parsed > max) {
        return { decimalRange: true };
      }
      return null;
    };
  }

  private toNumberOrUndefined(value: string): number | undefined {
    const normalized = value?.trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized.replace(',', '.'));
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private resolveAddressForSave(currentAddress: string): string | undefined {
    const selected = this.selectedLocationLabel().trim();
    if (selected) return selected;

    const searched = this.mapSearchQuery().trim();
    if (searched) return searched;

    const existing = currentAddress?.trim();
    return existing || undefined;
  }
}
