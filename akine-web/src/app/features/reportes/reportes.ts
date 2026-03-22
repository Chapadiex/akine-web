import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, DatePipe, NgClass, NgTemplateOutlet, SlicePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ReportesService } from './services/reportes.service';
import {
  ReporteCajaDia,
  ReporteCopagosPendientes,
  ReporteFacturadoVsCobrado,
  ReporteProductividad,
  ReporteSesionBloqueada,
} from './models/reportes.models';

type TabId = 'caja' | 'facturado' | 'bloqueadas' | 'copagos' | 'productividad';
type TabState = 'idle' | 'loading' | 'loaded' | 'error';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'caja',         label: 'Caja del día',          icon: 'account_balance_wallet' },
  { id: 'facturado',    label: 'Facturado vs cobrado',   icon: 'receipt_long' },
  { id: 'bloqueadas',   label: 'Sesiones bloqueadas',    icon: 'lock' },
  { id: 'copagos',      label: 'Copagos OS pendientes',  icon: 'pending_actions' },
  { id: 'productividad',label: 'Productividad',          icon: 'trending_up' },
];

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [DecimalPipe, DatePipe, NgClass, NgTemplateOutlet, SlicePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes implements OnInit {
  private consultorioCtx = inject(ConsultorioContextService);
  private reporteSvc = inject(ReportesService);
  private toast = inject(ToastService);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  activeTab = signal<TabId>('caja');
  tabs = TABS;

  // Reporte 1 — caja dia
  cajaIdControl = new FormControl<string>('');
  cajaDia = signal<ReporteCajaDia | null>(null);
  cajaState = signal<TabState>('idle');

  // Reporte 2 — facturado vs cobrado
  facturado = signal<ReporteFacturadoVsCobrado[]>([]);
  facturadoState = signal<TabState>('idle');
  facturadoTotales = computed(() => {
    const rows = this.facturado();
    return {
      facturado: rows.reduce((s, r) => s + r.importeFacturado, 0),
      cobrado:   rows.reduce((s, r) => s + r.importeCobrado, 0),
      diferencia:rows.reduce((s, r) => s + r.diferencia, 0),
    };
  });

  // Reporte 3 — sesiones bloqueadas
  bloqueadas = signal<ReporteSesionBloqueada[]>([]);
  bloqueadasState = signal<TabState>('idle');

  // Reporte 4 — copagos pendientes
  copagos = signal<ReporteCopagosPendientes[]>([]);
  copagosState = signal<TabState>('idle');
  copagosTotales = computed(() => ({
    copago: this.copagos().reduce((s, r) => s + r.copagoImporte, 0),
    os:     this.copagos().reduce((s, r) => s + r.importeObraSocial, 0),
  }));

  // Reporte 5 — productividad
  productividad = signal<ReporteProductividad[]>([]);
  productividadState = signal<TabState>('idle');
  productividadTotales = computed(() => ({
    sesiones:  this.productividad().reduce((s, r) => s + r.cantidadSesiones, 0),
    total:     this.productividad().reduce((s, r) => s + r.importeTotalLiquidado, 0),
  }));

  constructor() {
    effect(() => {
      const cid = this.consultorioId();
      const tab = this.activeTab();
      if (!cid) return;
      this.loadTabIfNeeded(cid, tab);
    });
  }

  ngOnInit(): void {}

  selectTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  loadCajaDia(): void {
    const cid = this.consultorioId();
    const cajaId = this.cajaIdControl.value?.trim();
    if (!cid || !cajaId) { this.toast.error('Ingresá el ID de caja'); return; }
    this.cajaState.set('loading');
    this.reporteSvc.cajaDia(cid, cajaId).subscribe({
      next: (r) => { this.cajaDia.set(r); this.cajaState.set('loaded'); },
      error: () => { this.cajaState.set('error'); this.toast.error('No se pudo cargar el reporte de caja'); },
    });
  }

  diferenciaClass(val: number): string {
    if (val < 0) return 'text-danger';
    if (val > 0) return 'text-success';
    return '';
  }

  estadoLoteBadge(estado: string): string {
    const map: Record<string, string> = {
      BORRADOR:   'badge-borrador',
      CERRADO:    'badge-cerrado',
      PRESENTADO: 'badge-presentado',
      LIQUIDADO:  'badge-liquidado',
      ANULADO:    'badge-anulado',
    };
    return map[estado] ?? 'badge-bloqueado';
  }

  private loadTabIfNeeded(cid: string, tab: TabId): void {
    switch (tab) {
      case 'facturado':
        if (this.facturadoState() === 'idle') this.loadFacturado(cid);
        break;
      case 'bloqueadas':
        if (this.bloqueadasState() === 'idle') this.loadBloqueadas(cid);
        break;
      case 'copagos':
        if (this.copagosState() === 'idle') this.loadCopagos(cid);
        break;
      case 'productividad':
        if (this.productividadState() === 'idle') this.loadProductividad(cid);
        break;
    }
  }

  private loadFacturado(cid: string): void {
    this.facturadoState.set('loading');
    this.reporteSvc.facturadoVsCobrado(cid).subscribe({
      next: (r) => { this.facturado.set(r); this.facturadoState.set('loaded'); },
      error: () => this.facturadoState.set('error'),
    });
  }

  private loadBloqueadas(cid: string): void {
    this.bloqueadasState.set('loading');
    this.reporteSvc.sesionesBloqueadas(cid).subscribe({
      next: (r) => { this.bloqueadas.set(r); this.bloqueadasState.set('loaded'); },
      error: () => this.bloqueadasState.set('error'),
    });
  }

  private loadCopagos(cid: string): void {
    this.copagosState.set('loading');
    this.reporteSvc.copagosPendientes(cid).subscribe({
      next: (r) => { this.copagos.set(r); this.copagosState.set('loaded'); },
      error: () => this.copagosState.set('error'),
    });
  }

  private loadProductividad(cid: string): void {
    this.productividadState.set('loading');
    this.reporteSvc.productividad(cid).subscribe({
      next: (r) => { this.productividad.set(r); this.productividadState.set('loaded'); },
      error: () => this.productividadState.set('error'),
    });
  }
}
