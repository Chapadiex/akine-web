import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioRequest } from '../../models/consultorio.models';
import { ConsultorioService } from '../../services/consultorio.service';
import { fetchGeocode, GeocodeHit } from '../../utils/consultorio-location';
import {
  decimalRangeValidator,
  optionalPhoneValidator,
  trimmedRequiredValidator,
} from '../../utils/consultorio-form-rules';

@Component({
  selector: 'app-consultorio-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-shell">
      <header class="page-header">
        <div>
          <a routerLink="/app/consultorios" class="back-link"><- Consultorios</a>
          <p class="eyebrow">Alta minima</p>
          <h1>Nuevo consultorio</h1>
          <p class="subtitle">
            Crea el consultorio con lo minimo para empezar. Los datos operativos, de contacto, mapa e impresion se completan despues desde Editar.
          </p>
        </div>
      </header>

      <form class="create-layout" [formGroup]="form" (ngSubmit)="submit('edit')">
        <section class="card">
          <div class="card-head">
            <div>
              <p class="card-kicker">Alta minima</p>
              <h2>Datos iniciales</h2>
            </div>
            <span class="card-badge">1 obligatorio</span>
          </div>

          <div class="grid grid-two">
            <label class="field field-full">
              <span>Nombre del consultorio *</span>
              <input #nameInput type="text" formControlName="name" placeholder="Ej: Consultorio Central" />
              @if (showError('name', 'required')) {
                <small>Ingresa el nombre del consultorio.</small>
              }
            </label>

            <label class="field field-full">
              <span>Direccion completa</span>
              <textarea rows="3" formControlName="address" placeholder="Carga la direccion tal como quieres verla en pantalla y documentos."></textarea>
            </label>

            <label class="field">
              <span>Telefono</span>
              <input type="tel" formControlName="phone" placeholder="Ej: 1155550000" />
              @if (showError('phone', 'phone')) {
                <small>Usa una longitud minima razonable.</small>
              }
            </label>

            <label class="field">
              <span>Email</span>
              <input type="email" formControlName="email" placeholder="info@consultorio.com" />
              @if (showError('email', 'email')) {
                <small>Ingresa un email valido.</small>
              }
            </label>
          </div>

          <div class="map-section">
            <div class="map-head">
              <div>
                <p class="card-kicker">Ubicacion en mapa</p>
                <h3>Pin opcional</h3>
                <p>Si ya conoces la ubicacion exacta, puedes dejar el pin listo desde ahora.</p>
              </div>
            </div>

            <div class="map-search">
              <input
                [value]="mapSearchQuery()"
                (input)="onMapQueryInput($event)"
                placeholder="Ej: Av. Siempreviva 123, Buenos Aires"
              />
              <button type="button" class="btn-secondary" (click)="searchMapLocations()" [disabled]="isSearchingLocations()">
                {{ isSearchingLocations() ? 'Buscando...' : 'Buscar ubicacion' }}
              </button>
            </div>

            @if (searchError()) {
              <p class="inline-error">{{ searchError() }}</p>
            }

            @if (locationResults().length > 0) {
              <div class="location-results" role="listbox" aria-label="Resultados de ubicacion">
                @for (hit of locationResults(); track hit.lat + '-' + hit.lon + '-' + $index) {
                  <button type="button" class="location-result" (click)="selectLocation(hit)">
                    <strong>{{ hit.display_name || 'Ubicacion encontrada' }}</strong>
                    <span>Usar pin</span>
                  </button>
                }
              </div>
            }

            <div class="grid grid-two compact-fields">
              <label class="field">
                <span>Latitud</span>
                <input type="text" formControlName="mapLatitude" placeholder="-34.603722" />
                @if (showError('mapLatitude', 'decimalRange')) {
                  <small>La latitud debe estar entre -90 y 90.</small>
                }
              </label>

              <label class="field">
                <span>Longitud</span>
                <input type="text" formControlName="mapLongitude" placeholder="-58.381592" />
                @if (showError('mapLongitude', 'decimalRange')) {
                  <small>La longitud debe estar entre -180 y 180.</small>
                }
              </label>
            </div>

            <div class="map-preview-card">
              @if (mapPreviewUrl(); as mapUrl) {
                <iframe
                  class="map-frame"
                  [src]="mapUrl"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  title="Mapa del consultorio"
                ></iframe>
              } @else {
                <div class="map-placeholder">Busca una direccion o carga coordenadas para ver la vista previa.</div>
              }
            </div>
          </div>
        </section>

        <footer class="actions">
          <a routerLink="/app/consultorios" class="btn-ghost">Cancelar</a>
          <button type="button" class="btn-secondary" (click)="submit('detail')" [disabled]="saving()">Guardar y completar despues</button>
          <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando...' : 'Guardar' }}</button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .page-shell { max-width: 1180px; margin: 0 auto; padding: 1.5rem; display: grid; gap: 1rem; }
    .page-header h1 { margin: .2rem 0; font-size: clamp(1.8rem, 3vw, 2.4rem); }
    .back-link { color: var(--text-muted); text-decoration: none; font-size: .84rem; }
    .eyebrow, .card-kicker { margin: 0; text-transform: uppercase; letter-spacing: .08em; font-size: .7rem; font-weight: 800; color: var(--primary); }
    .subtitle { margin: .2rem 0 0; max-width: 70ch; color: var(--text-muted); }
    .create-layout { display: grid; gap: 1rem; }
    .card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 1rem; box-shadow: var(--shadow-sm); }
    .card-head, .map-head, .actions { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
    .card-head h2, .map-head h3 { margin: .15rem 0 0; font-size: 1.25rem; }
    .card-badge { border: 1px solid var(--border); border-radius: 999px; padding: .35rem .7rem; font-size: .78rem; font-weight: 700; color: var(--text-muted); }
    .grid { display: grid; gap: .9rem; }
    .grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .field { display: grid; gap: .38rem; }
    .field-full { grid-column: 1 / -1; }
    .field span { font-size: .85rem; font-weight: 700; color: var(--text); }
    .field input, .field textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--white) 92%, var(--bg) 8%);
      padding: .78rem .88rem;
      font: inherit;
      color: var(--text);
    }
    .field input:focus, .field textarea:focus { outline: 2px solid color-mix(in srgb, var(--primary) 28%, transparent); outline-offset: 1px; }
    .field small, .inline-error { color: var(--error); font-size: .78rem; font-weight: 600; margin: 0; }
    .map-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border); display: grid; gap: .8rem; }
    .map-head p { margin: .2rem 0 0; color: var(--text-muted); font-size: .9rem; }
    .map-search { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .7rem; }
    .map-search input {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: .82rem .88rem;
      font: inherit;
      background: color-mix(in srgb, var(--white) 92%, var(--bg) 8%);
    }
    .compact-fields { gap: .7rem; }
    .location-results { display: grid; gap: .45rem; }
    .location-result {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: color-mix(in srgb, var(--white) 92%, var(--bg) 8%);
      padding: .8rem .9rem;
      text-align: left;
      cursor: pointer;
      display: grid;
      gap: .2rem;
    }
    .location-result strong { color: var(--text); font-size: .86rem; }
    .location-result span { color: var(--primary); font-size: .78rem; font-weight: 700; }
    .map-preview-card { border: 1px solid var(--border); border-radius: 16px; overflow: hidden; min-height: 280px; background: var(--bg); }
    .map-frame { width: 100%; height: 280px; border: 0; display: block; }
    .map-placeholder { min-height: 280px; display: grid; place-items: center; color: var(--text-muted); text-align: center; padding: 1rem; }
    .actions { justify-content: flex-end; }
    .btn-primary, .btn-secondary, .btn-ghost {
      border-radius: 12px;
      padding: .78rem 1rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      font: inherit;
    }
    .btn-primary { border: 0; background: var(--primary); color: #fff; }
    .btn-secondary { border: 1px solid var(--border); background: var(--white); color: var(--text); }
    .btn-ghost { border: 1px solid transparent; color: var(--text-muted); background: transparent; }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }
    @media (max-width: 900px) {
      .grid-two, .map-search { grid-template-columns: 1fr; }
      .actions { flex-wrap: wrap; }
      .btn-primary, .btn-secondary, .btn-ghost { width: 100%; text-align: center; }
    }
  `],
})
export class ConsultorioCreatePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly consultorioSvc = inject(ConsultorioService);
  private readonly consultorioCtx = inject(ConsultorioContextService);

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly mapSearchQuery = signal('');
  readonly isSearchingLocations = signal(false);
  readonly locationResults = signal<GeocodeHit[]>([]);
  readonly searchError = signal('');
  readonly mapPreviewUrl = signal<SafeResourceUrl | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [trimmedRequiredValidator]],
    address: [''],
    phone: ['', [optionalPhoneValidator]],
    email: ['', [Validators.email]],
    mapLatitude: ['', [decimalRangeValidator(-90, 90)]],
    mapLongitude: ['', [decimalRangeValidator(-180, 180)]],
    googleMapsUrl: [''],
  });

  ngOnInit(): void {
    queueMicrotask(() => this.nameInput?.nativeElement.focus());
    this.form.valueChanges
      .pipe(debounceTime(180), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshMapPreview());
  }

  showError(controlName: keyof typeof this.form.controls, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(error);
  }

  onMapQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.mapSearchQuery.set(value);
    this.searchError.set('');
  }

  async searchMapLocations(): Promise<void> {
    const query = this.mapSearchQuery().trim() || this.form.controls.address.value.trim();
    if (!query) {
      this.searchError.set('Ingresa una direccion para buscar el pin.');
      return;
    }

    this.isSearchingLocations.set(true);
    this.searchError.set('');

    try {
      const rows = await fetchGeocode(query);
      this.locationResults.set(rows);
      if (rows.length === 0) {
        this.searchError.set('No se encontraron resultados para esa direccion.');
      }
    } catch {
      this.locationResults.set([]);
      this.searchError.set('No se pudo buscar la ubicacion en este momento.');
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

    const displayName = hit.display_name?.trim() || this.form.controls.address.value.trim();
    this.form.patchValue({
      address: displayName,
      mapLatitude: lat.toFixed(6),
      mapLongitude: lng.toFixed(6),
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    this.mapSearchQuery.set(displayName);
    this.locationResults.set([]);
    this.refreshMapPreview();
  }

  submit(mode: 'edit' | 'detail'): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.buildRequest();
    this.consultorioSvc.create(payload).subscribe({
      next: (saved) => {
        this.consultorioCtx.reloadAndSelect(saved.id);
        this.toast.success(
          'Consultorio creado correctamente. Puedes completar los datos institucionales, de contacto, mapa o impresion mas tarde.',
        );
        void this.router.navigate(
          mode === 'edit'
            ? ['/app/consultorios', saved.id, 'editar']
            : ['/app/consultorios', saved.id],
        );
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private refreshMapPreview(): void {
    const lat = this.toNumberOrNull(this.form.controls.mapLatitude.value);
    const lng = this.toNumberOrNull(this.form.controls.mapLongitude.value);
    if (lat == null || lng == null) {
      this.mapPreviewUrl.set(null);
      return;
    }
    const src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    this.mapPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(src));
  }

  private buildRequest(): ConsultorioRequest {
    const values = this.form.getRawValue();
    return {
      name: values.name.trim(),
      address: values.address.trim() || undefined,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      mapLatitude: this.toNumberOrNull(values.mapLatitude) ?? undefined,
      mapLongitude: this.toNumberOrNull(values.mapLongitude) ?? undefined,
      googleMapsUrl: values.googleMapsUrl.trim() || undefined,
    };
  }

  private toNumberOrNull(value: string): number | null {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized.replace(',', '.'));
    return Number.isNaN(parsed) ? null : parsed;
  }
}
