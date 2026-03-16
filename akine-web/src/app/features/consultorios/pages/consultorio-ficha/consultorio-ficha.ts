import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  icon: FichaIcon;
}

interface FichaSection {
  key: string;
  title: string;
  emptyMessage: string;
  items: FichaItem[];
}

type FichaIcon = 'phone' | 'email' | 'location' | 'route' | 'building' | 'id' | 'printer' | 'eye' | 'file';

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
                    <article class="info-item">
                      <div class="info-icon" aria-hidden="true">
                        @switch (item.icon) {
                          @case ('phone') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <path d="M5.5 4.5h3l1.6 4.3-1.9 1.9a15 15 0 0 0 5.6 5.6l1.9-1.9 4.3 1.6v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 6.5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                            </svg>
                          }
                          @case ('email') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
                              <path d="m4.5 7 7.5 5 7.5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          }
                          @case ('location') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z" stroke="currentColor" stroke-width="1.8" />
                              <circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8" />
                            </svg>
                          }
                          @case ('route') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <circle cx="6.5" cy="6.5" r="2.5" stroke="currentColor" stroke-width="1.8" />
                              <circle cx="17.5" cy="17.5" r="2.5" stroke="currentColor" stroke-width="1.8" />
                              <path d="M8.5 8.5c2 0 3 1 3 3s1 3 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                            </svg>
                          }
                          @case ('building') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <path d="M4.5 20V5.5A1.5 1.5 0 0 1 6 4h8a1.5 1.5 0 0 1 1.5 1.5V20M9 20v-4h3v4M7.5 8h.01M10.5 8h.01M7.5 11h.01M10.5 11h.01M15.5 8H19a.5.5 0 0 1 .5.5V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          }
                          @case ('id') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" stroke-width="1.8" />
                              <path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                            </svg>
                          }
                          @case ('eye') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                              <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.8" />
                            </svg>
                          }
                          @case ('printer') {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <path d="M7 8V4.5h10V8M7.5 14h9M7 17.5h10V12H7v5.5ZM5 8h14a2 2 0 0 1 2 2v4h-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                          }
                          @default {
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                              <rect x="4" y="4.5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8" />
                              <path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                            </svg>
                          }
                        }
                      </div>
                      <div>
                        <span class="info-label">{{ item.label }}</span>
                        <strong class="info-value">{{ item.value }}</strong>
                      </div>
                    </article>
                  }
                </div>

                @if (section.key === 'contacto' && canOpenMap()) {
                  <div class="card-actions">
                    <button type="button" class="btn-map" (click)="openGoogleMaps()">Ver / Buscar en mapa</button>
                  </div>
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: .8rem;
      align-items: start;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--white);
      display: grid;
      gap: 0;
      align-content: start;
      overflow: hidden;
    }
    .card-pending {
      border-left-width: 4px;
      border-left-color: var(--warning);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: .8rem;
      padding: .95rem 1rem .75rem;
    }
    .card-head h3 {
      margin: 0;
      color: var(--primary);
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
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
    .info-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      row-gap: .45rem;
      padding: 0 1rem .95rem;
      align-items: start;
    }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: .55rem;
      min-width: 0;
    }
    .info-icon {
      color: var(--text-muted);
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
      padding-top: .08rem;
    }
    .info-label {
      display: block;
      color: var(--text-muted);
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .02em;
      text-transform: uppercase;
      margin-bottom: 0;
    }
    .info-value {
      display: block;
      color: var(--text);
      font-size: .8rem;
      font-weight: 600;
      overflow-wrap: anywhere;
      word-break: normal;
      line-height: 1.3;
    }
    .empty-card {
      border: 1px dashed var(--border);
      border-radius: 14px;
      margin: 0 1rem 1rem;
      padding: .8rem;
      display: grid;
      gap: .28rem;
      background: var(--white);
    }
    .empty-card strong { color: var(--text); font-size: .88rem; }
    .empty-card p { margin: 0; color: var(--text-muted); font-size: .78rem; line-height: 1.4; }
    .card-actions { display: flex; justify-content: flex-start; padding: 0 1rem 1rem; }
    .btn-map {
      padding: .56rem .86rem;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
      color: var(--text);
      font-weight: 700;
      cursor: pointer;
    }
    @media (max-width: 1280px) {
      .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .info-list { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: .9rem; }
    }
    @media (max-width: 900px) {
      .cards-grid { grid-template-columns: 1fr; }
      .info-list { grid-template-columns: 1fr; }
    }
  `],
})
export class ConsultorioFichaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly consultorioSvc = inject(ConsultorioService);

  readonly consultorio = signal<Consultorio | null>(null);
  readonly loading = signal(true);
  readonly sections = computed<FichaSection[]>(() => {
    const current = this.consultorio();
    if (!current) return [];

    const contactItems = [
      this.item('Telefono', current.phone, 'phone'),
      this.item('Email', current.email, 'email'),
      this.item('Direccion', current.address, 'location'),
      this.item('Referencia de acceso', current.accessReference, 'route'),
      this.item('Piso / unidad', current.floorUnit, 'location'),
    ].filter((item): item is FichaItem => item !== null);

    const institutionItems = [
      this.item('Razon social', current.legalName, 'building'),
      this.item('CUIT', current.cuit, 'id'),
      this.item('Responsable administrativo', current.administrativeContact, 'file'),
    ].filter((item): item is FichaItem => item !== null);

    const documentItems = [
      this.item('Nombre institucional', current.name, 'printer'),
      this.item('Subtitulo', current.documentSubtitle, 'file'),
      this.item('Pie institucional', current.documentFooter, 'file'),
      this.item('Campos visibles', this.documentFieldsSummary(current), 'eye'),
      this.item('Logo institucional', current.logoUrl ? 'Cargado' : '', 'printer'),
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
    return !!current && !!(current.geoAddress || current.googleMapsUrl || current.address || (current.mapLatitude != null && current.mapLongitude != null));
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
    const directUrl = current.googleMapsUrl?.trim();
    if (directUrl) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const query = current.mapLatitude != null && current.mapLongitude != null
      ? `${current.mapLatitude},${current.mapLongitude}`
      : current.geoAddress || current.address || current.name;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  }

  private item(label: string, value: string | undefined, icon: FichaIcon): FichaItem | null {
    const normalized = value?.trim();
    return normalized ? { label, value: normalized, icon } : null;
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
