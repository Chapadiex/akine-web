import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Consultorio } from '../../models/consultorio.models';
import { ConsultorioService } from '../../services/consultorio.service';
import {
  hasAtLeastOneVisibleDocumentField,
  hasDocumentVisibilityConfig,
} from '../../utils/consultorio-form-rules';
import { resolveConsultorioId } from '../../utils/route-utils';

interface FichaItem {
  label: string;
  value: string;
}

interface FichaSection {
  key: string;
  title: string;
  emptyMessage: string;
  items: FichaItem[];
}

@Component({
  selector: 'app-consultorio-ficha',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ficha-page">
      @if (loading()) {
        <p class="loading-msg">Cargando ficha...</p>
      } @else if (consultorio(); as current) {
        <div class="cards-grid">
          @for (section of sections(); track section.key) {
            <article class="card" [class.card-pending]="section.items.length === 0">
              <header class="card-head">
                <div>
                  <h3>{{ section.title }}</h3>
                </div>
                <a class="card-link" [routerLink]="['/app/consultorios', current.id, 'editar']">Completar datos</a>
              </header>

              @if (section.items.length > 0) {
                <div class="info-list">
                  @for (item of section.items; track item.label) {
                    <div class="info-row">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </div>
                  }
                </div>

                @if (section.key === 'contacto' && canOpenMap()) {
                  <div class="card-actions">
                    <button type="button" class="btn-map" (click)="openGoogleMaps()">Ver / Buscar en mapa</button>
                  </div>
                }

                @if (section.key === 'contacto') {
                  @if (mapEmbedUrl(); as mapUrl) {
                    <iframe
                      class="map-frame"
                      [src]="mapUrl"
                      loading="lazy"
                      referrerpolicy="no-referrer-when-downgrade"
                      title="Mapa del consultorio"
                    ></iframe>
                  }
                }
              } @else {
                <div class="empty-card">
                  <strong>Sin completar</strong>
                  <p>{{ section.emptyMessage }}</p>
                  <a [routerLink]="['/app/consultorios', current.id, 'editar']">Completar datos</a>
                </div>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .ficha-page { display: grid; gap: .8rem; }
    .loading-msg { color: var(--text-muted); text-align: center; padding: 2rem 1rem; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .8rem;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--white);
      padding: .9rem;
      display: grid;
      gap: .8rem;
      align-content: start;
    }
    .card-pending {
      border-left-width: 4px;
      border-left-color: var(--warning);
      padding-left: .78rem;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: .8rem;
    }
    .card-head h3 {
      margin: 0;
      font-size: .95rem;
      color: var(--text);
    }
    .card-link,
    .empty-card a {
      color: var(--primary);
      text-decoration: none;
      font-size: .76rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .card-link:hover,
    .empty-card a:hover {
      text-decoration: underline;
    }
    .info-list { display: grid; gap: .65rem; }
    .info-row {
      display: grid;
      gap: .16rem;
      padding-bottom: .55rem;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    }
    .info-row:last-child { padding-bottom: 0; border-bottom: 0; }
    .info-row span {
      font-size: .68rem;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .info-row strong {
      color: var(--text);
      font-size: .86rem;
      line-height: 1.45;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .empty-card {
      border: 1px dashed var(--border);
      border-radius: 14px;
      padding: .8rem;
      display: grid;
      gap: .28rem;
      background: var(--white);
    }
    .empty-card strong { color: var(--text); font-size: .88rem; }
    .empty-card p { margin: 0; color: var(--text-muted); font-size: .78rem; line-height: 1.4; }
    .card-actions { display: flex; justify-content: flex-start; }
    .btn-map {
      padding: .56rem .86rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      color: var(--text);
      font-weight: 700;
      cursor: pointer;
    }
    .map-frame {
      width: 100%;
      height: 220px;
      border: 0;
      border-radius: 14px;
      background: var(--bg);
    }
    @media (max-width: 900px) {
      .cards-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ConsultorioFichaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly consultorioSvc = inject(ConsultorioService);

  readonly consultorio = signal<Consultorio | null>(null);
  readonly loading = signal(true);
  readonly sections = computed<FichaSection[]>(() => {
    const current = this.consultorio();
    if (!current) return [];

    const contactItems = [
      this.item('Telefono', current.phone),
      this.item('Email', current.email),
      this.item('Direccion', current.address),
      this.item('Referencia', current.accessReference),
      this.item('Piso / unidad', current.floorUnit),
    ].filter((item): item is FichaItem => item !== null);

    const institutionItems = [
      this.item('Razon social', current.legalName),
      this.item('CUIT', current.cuit),
      this.item('Responsable administrativo', current.administrativeContact),
    ].filter((item): item is FichaItem => item !== null);

    const documentItems = [
      this.item('Nombre en documentos', current.documentDisplayName || current.name),
      this.item('Subtitulo', current.documentSubtitle),
      this.item('Pie institucional', current.documentFooter),
      this.item('Campos visibles', this.documentFieldsSummary(current)),
      this.item('Logo documental', current.documentLogoUrl ? 'Cargado' : ''),
    ].filter((item): item is FichaItem => item !== null);

    return [
      {
        key: 'contacto',
        title: 'Contacto y ubicacion',
        emptyMessage: 'Sin datos de contacto o ubicacion cargados.',
        items: contactItems,
      },
      {
        key: 'institucional',
        title: 'Datos institucionales',
        emptyMessage: 'Todavia no hay datos institucionales informados.',
        items: institutionItems,
      },
      {
        key: 'documental',
        title: 'Impresion',
        emptyMessage: 'La configuracion para documentos y PDFs aun no fue definida.',
        items: documentItems,
      },
    ];
  });
  readonly canOpenMap = computed(() => {
    const current = this.consultorio();
    return !!current && !!(current.address || (current.mapLatitude != null && current.mapLongitude != null));
  });
  readonly mapEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const current = this.consultorio();
    if (!current || current.mapLatitude == null || current.mapLongitude == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${current.mapLatitude},${current.mapLongitude}&z=16&output=embed`,
    );
  });

  constructor() {
    const consultorioId = resolveConsultorioId(this.route);
    if (!consultorioId) {
      this.loading.set(false);
      return;
    }

    this.consultorioSvc
      .getById(consultorioId)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (consultorio) => {
          this.consultorio.set(consultorio);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openGoogleMaps(): void {
    const current = this.consultorio();
    if (!current) return;
    const query = current.mapLatitude != null && current.mapLongitude != null
      ? `${current.mapLatitude},${current.mapLongitude}`
      : current.address || current.name;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  }

  private item(label: string, value?: string): FichaItem | null {
    const normalized = value?.trim();
    return normalized ? { label, value: normalized } : null;
  }

  private documentFieldsSummary(consultorio: Consultorio): string {
    if (!hasDocumentVisibilityConfig(consultorio)) {
      return '';
    }

    const visible = [
      consultorio.documentShowAddress ? 'Direccion' : '',
      consultorio.documentShowPhone ? 'Telefono' : '',
      consultorio.documentShowEmail ? 'Email' : '',
      consultorio.documentShowCuit ? 'CUIT' : '',
      consultorio.documentShowLegalName ? 'Razon social' : '',
      consultorio.documentShowLogo ? 'Logo' : '',
    ].filter(Boolean);

    if (visible.length > 0) {
      return visible.join(', ');
    }

    return hasAtLeastOneVisibleDocumentField(consultorio) ? 'Configurado' : 'No muestra datos';
  }
}
