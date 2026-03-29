import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import { CajaDiariaService } from '../../services/caja-diaria.service';
import { CobroPacienteService } from '../../services/cobro-paciente.service';
import {
  CajaDiaria,
  CajaDiariaEstado,
  CobroPaciente,
  MEDIO_PAGO_LABELS,
  MedioPago,
  MovimientoCaja,
  TURNO_CAJA_LABELS,
  TurnoCaja,
} from '../../models/caja.models';

type PageState = 'loading' | 'sin_caja' | 'con_caja' | 'cerrando' | 'error';
type CajaTab = 'cobros' | 'movimientos';
type CobroEstadoFiltro = 'TODOS' | 'COBRADO' | 'PENDIENTE' | 'ANULADO';
type CobroMedioFiltro = 'TODOS' | MedioPago | 'MIXTO';

interface PacienteCajaInfo {
  nombre: string;
  apellido: string;
  dni: string;
}

@Component({
  selector: 'app-caja-diaria-page',
  standalone: true,
  imports: [DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './caja-diaria-page.html',
  styleUrl: './caja-diaria-page.scss',
})
export class CajaDiariaPage implements OnInit {
  private consultorioCtx = inject(ConsultorioContextService);
  private cajaSvc = inject(CajaDiariaService);
  private cobroSvc = inject(CobroPacienteService);
  private pacienteSvc = inject(PacienteService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private router = inject(Router);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  selectedDate = signal(this.todayStr());
  pageState = signal<PageState>('loading');
  caja = signal<CajaDiaria | null>(null);
  movimientos = signal<MovimientoCaja[]>([]);
  cobros = signal<CobroPaciente[]>([]);
  pacientesById = signal<Record<string, PacienteCajaInfo>>({});
  submitting = signal(false);
  showCierreForm = signal(false);
  activeTab = signal<CajaTab>('cobros');
  searchTerm = signal('');
  estadoFilter = signal<CobroEstadoFiltro>('TODOS');
  medioFilter = signal<CobroMedioFiltro>('TODOS');
  cobrosPage = signal(1);
  openedMenuCobroId = signal<string | null>(null);
  selectedCobro = signal<CobroPaciente | null>(null);

  readonly cobrosPerPage = 20;
  readonly estadoCobroOpciones: { value: CobroEstadoFiltro; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'COBRADO', label: 'Cobrado' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ANULADO', label: 'Anulado' },
  ];
  readonly medioCobroOpciones: { value: CobroMedioFiltro; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'EFECTIVO', label: MEDIO_PAGO_LABELS.EFECTIVO },
    { value: 'TRANSFERENCIA', label: MEDIO_PAGO_LABELS.TRANSFERENCIA },
    { value: 'TARJETA_DEBITO', label: MEDIO_PAGO_LABELS.TARJETA_DEBITO },
    { value: 'TARJETA_CREDITO', label: MEDIO_PAGO_LABELS.TARJETA_CREDITO },
    { value: 'CHEQUE', label: MEDIO_PAGO_LABELS.CHEQUE },
    { value: 'QR', label: MEDIO_PAGO_LABELS.QR },
    { value: 'OTRO', label: MEDIO_PAGO_LABELS.OTRO },
    { value: 'MIXTO', label: 'Mixto' },
  ];

  readonly turnoCajaOpciones: { value: TurnoCaja | null; label: string }[] = [
    { value: null, label: 'Sin turno' },
    { value: 'UNICO', label: 'Único' },
    { value: 'MANANA', label: 'Mañana' },
    { value: 'TARDE', label: 'Tarde' },
    { value: 'NOCHE', label: 'Noche' },
  ];

  aperturaForm = new FormGroup({
    turnoCaja: new FormControl<TurnoCaja | null>(null),
    saldoInicial: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
  });

  cierreForm = new FormGroup({
    saldoReal: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
    observaciones: new FormControl<string>(''),
  });

  formattedDate = computed(() => {
    const date = this.selectedDate();
    const [year, month, day] = date.split('-');
    const parsed = new Date(+year, +month - 1, +day);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dayNames[parsed.getDay()]} ${day}/${monthNames[+month - 1]}/${year}`;
  });

  isToday = computed(() => this.selectedDate() === this.todayStr());

  saldoTeorico = computed(() => {
    const c = this.caja();
    if (!c) return 0;
    return c.saldoInicial + c.totalIngresos - c.totalEgresos;
  });

  diferencia = computed(() => {
    const c = this.caja();
    if (!c || c.saldoReal === null) return null;
    return c.saldoReal - (c.saldoTeorico ?? this.saldoTeorico());
  });

  cobrosOrdenados = computed(() =>
    [...this.cobros()].sort(
      (a, b) => this.parseDate(a.fechaCobro).getTime() - this.parseDate(b.fechaCobro).getTime(),
    ),
  );

  correlativosByCobroId = computed(() => {
    const byId: Record<string, number> = {};
    this.cobrosOrdenados().forEach((cobro, idx) => {
      byId[cobro.id] = idx + 1;
    });
    return byId;
  });

  cobrosFiltrados = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const estado = this.estadoFilter();
    const medio = this.medioFilter();

    return this.cobrosOrdenados().filter((cobro) => {
      if (estado !== 'TODOS' && this.cobroEstadoFiltro(cobro) !== estado) return false;
      if (medio !== 'TODOS' && !this.cobroIncluyeMedio(cobro, medio)) return false;
      if (!query) return true;

      const comprobante = this.comprobanteLabel(cobro).toLowerCase();
      const dni = this.cobroPacienteDni(cobro).toLowerCase();
      const paciente = this.cobroPacienteNombre(cobro).toLowerCase();
      return comprobante.includes(query) || dni.includes(query) || paciente.includes(query);
    });
  });

  totalCobrosFiltrados = computed(() => this.cobrosFiltrados().length);

  totalPaginasCobros = computed(() =>
    Math.max(1, Math.ceil(this.totalCobrosFiltrados() / this.cobrosPerPage)),
  );

  paginaCobrosActual = computed(() =>
    Math.min(Math.max(1, this.cobrosPage()), this.totalPaginasCobros()),
  );

  cobrosPaginados = computed(() => {
    const page = this.paginaCobrosActual();
    const start = (page - 1) * this.cobrosPerPage;
    return this.cobrosFiltrados().slice(start, start + this.cobrosPerPage);
  });

  cobrosDesde = computed(() =>
    this.totalCobrosFiltrados() === 0 ? 0 : (this.paginaCobrosActual() - 1) * this.cobrosPerPage + 1,
  );

  cobrosHasta = computed(() =>
    Math.min(this.paginaCobrosActual() * this.cobrosPerPage, this.totalCobrosFiltrados()),
  );

  constructor() {
    effect(() => {
      const consultorioId = this.consultorioId();
      const date = this.selectedDate();
      if (consultorioId && date) {
        this.cargarCaja(consultorioId, date);
      }
    });
  }

  ngOnInit(): void {}

  prevDay(): void {
    this.selectedDate.set(this.offsetDate(this.selectedDate(), -1));
  }

  nextDay(): void {
    this.selectedDate.set(this.offsetDate(this.selectedDate(), 1));
  }

  goToday(): void {
    this.selectedDate.set(this.todayStr());
  }

  private cargarCaja(consultorioId: string, fecha: string): void {
    this.pageState.set('loading');
    this.cajaSvc.byFecha(consultorioId, fecha).subscribe({
      next: (cajas) => {
        if (cajas.length === 0) {
          this.caja.set(null);
          this.movimientos.set([]);
          this.cobros.set([]);
          this.pacientesById.set({});
          this.pageState.set('sin_caja');
        } else {
          const cajaActiva = cajas.find((c) => c.estado === 'ABIERTA') ?? cajas[0];
          this.caja.set(cajaActiva);
          this.pageState.set('con_caja');
          this.activeTab.set('cobros');
          this.cargarMovimientos(consultorioId, cajaActiva.id);
          this.cargarCobros(consultorioId, cajaActiva.id);
        }
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.pageState.set('error');
      },
    });
  }

  private cargarMovimientos(consultorioId: string, cajaId: string): void {
    this.cajaSvc.movimientos(consultorioId, cajaId).subscribe({
      next: (movs) => this.movimientos.set(movs),
      error: () => {},
    });
  }

  private cargarCobros(consultorioId: string, cajaId: string): void {
    this.cobroSvc.byCaja(consultorioId, cajaId).subscribe({
      next: (cobros) => {
        this.cobros.set(cobros);
        this.cobrosPage.set(1);
        this.openedMenuCobroId.set(null);
        this.resolverPacientesCobro(consultorioId, cobros);
      },
      error: () => {},
    });
  }

  private resolverPacientesCobro(consultorioId: string, cobros: CobroPaciente[]): void {
    const ids = Array.from(new Set(cobros.map((item) => item.pacienteId).filter(Boolean)));
    if (ids.length === 0) {
      this.pacientesById.set({});
      return;
    }

    const requests = ids.map((id) =>
      this.pacienteSvc.getById(id, consultorioId).pipe(
        map((paciente) => ({
          id,
          value: {
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            dni: paciente.dni,
          } satisfies PacienteCajaInfo,
        })),
        catchError(() => of(null)),
      ),
    );

    forkJoin(requests).subscribe({
      next: (rows) => {
        const mapped = rows.reduce<Record<string, PacienteCajaInfo>>((acc, row) => {
          if (row) acc[row.id] = row.value;
          return acc;
        }, {});
        this.pacientesById.set(mapped);
      },
      error: () => {
        this.pacientesById.set({});
      },
    });
  }

  abrirCaja(): void {
    if (this.aperturaForm.invalid || this.submitting()) return;
    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    this.submitting.set(true);
    const { turnoCaja, saldoInicial } = this.aperturaForm.value;
    this.cajaSvc
      .abrir(consultorioId, {
        fechaOperativa: this.selectedDate(),
        turnoCaja: turnoCaja ?? null,
        saldoInicial: saldoInicial ?? 0,
      })
      .subscribe({
        next: (caja) => {
          this.caja.set(caja);
          this.movimientos.set([]);
          this.cobros.set([]);
          this.pageState.set('con_caja');
          this.submitting.set(false);
          this.toast.success('Caja abierta correctamente');
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  iniciarCierre(): void {
    const c = this.caja();
    if (!c) return;
    this.cierreForm.patchValue({ saldoReal: this.saldoTeorico(), observaciones: '' });
    this.showCierreForm.set(true);
  }

  cancelarCierre(): void {
    this.showCierreForm.set(false);
  }

  cerrarCaja(): void {
    if (this.cierreForm.invalid || this.submitting()) return;
    const consultorioId = this.consultorioId();
    const cajaId = this.caja()?.id;
    if (!consultorioId || !cajaId) return;

    this.submitting.set(true);
    const { saldoReal, observaciones } = this.cierreForm.value;
    this.cajaSvc
      .cerrar(consultorioId, cajaId, {
        saldoReal: saldoReal ?? 0,
        observaciones: observaciones || null,
      })
      .subscribe({
        next: (caja) => {
          this.caja.set(caja);
          this.showCierreForm.set(false);
          this.submitting.set(false);
          this.toast.success('Caja cerrada');
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  irACobrar(): void {
    this.router.navigate(['/app/caja/cobrar']);
  }

  irAEgreso(): void {
    this.router.navigate(['/app/caja/egreso']);
  }

  seleccionarTab(tab: CajaTab): void {
    this.activeTab.set(tab);
    this.openedMenuCobroId.set(null);
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
    this.cobrosPage.set(1);
  }

  onEstadoFilterChange(value: string): void {
    this.estadoFilter.set(value as CobroEstadoFiltro);
    this.cobrosPage.set(1);
  }

  onMedioFilterChange(value: string): void {
    this.medioFilter.set(value as CobroMedioFiltro);
    this.cobrosPage.set(1);
  }

  limpiarFiltrosCobros(): void {
    this.searchTerm.set('');
    this.estadoFilter.set('TODOS');
    this.medioFilter.set('TODOS');
    this.cobrosPage.set(1);
  }

  tieneFiltrosActivos(): boolean {
    return (
      this.searchTerm().trim().length > 0 ||
      this.estadoFilter() !== 'TODOS' ||
      this.medioFilter() !== 'TODOS'
    );
  }

  irPaginaCobros(page: number): void {
    const bounded = Math.max(1, Math.min(page, this.totalPaginasCobros()));
    this.cobrosPage.set(bounded);
  }

  paginasCobros(): number[] {
    return Array.from({ length: this.totalPaginasCobros() }, (_, idx) => idx + 1);
  }

  formatHora(value: string | null): string {
    if (!value) return '--:--';
    const date = this.parseDate(value);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  estadoLabel(estado: CajaDiariaEstado): string {
    const labels: Record<CajaDiariaEstado, string> = {
      ABIERTA: 'Abierta',
      CERRADA: 'Cerrada',
      CERRADA_CON_DIFERENCIA: 'Cerrada c/ diferencia',
    };
    return labels[estado];
  }

  estadoClass(estado: CajaDiariaEstado): string {
    const classes: Record<CajaDiariaEstado, string> = {
      ABIERTA: 'badge-success',
      CERRADA: 'badge-blocked',
      CERRADA_CON_DIFERENCIA: 'badge-warning',
    };
    return classes[estado];
  }

  turnoCajaLabel(turno: TurnoCaja | null): string {
    if (!turno) return '';
    return TURNO_CAJA_LABELS[turno];
  }

  tipoMovLabel(tipo: string): string {
    return tipo === 'INGRESO' ? 'Ingreso' : 'Egreso';
  }

  comprobanteLabel(cobro: CobroPaciente): string {
    const raw = cobro.comprobanteNumero?.trim();
    if (raw && this.esComprobanteAmigable(raw)) return raw;

    const seq = this.correlativosByCobroId()[cobro.id] ?? 1;
    const year = this.parseDate(cobro.fechaCobro).getFullYear();
    return `REC-${year}-${String(seq).padStart(6, '0')}`;
  }

  cobroEstadoLabel(estado: CobroPaciente['estado']): string {
    switch (estado) {
      case 'ANULADO':
        return 'Anulado';
      case 'PENDIENTE':
        return 'Pendiente';
      case 'PARCIAL':
        return 'Parcial';
      case 'COBRADO_TOTAL':
      case 'COBRADO':
      default:
        return 'Cobrado';
    }
  }

  cobroEstadoClass(estado: CobroPaciente['estado']): string {
    switch (estado) {
      case 'ANULADO':
        return 'badge-error';
      case 'PENDIENTE':
      case 'PARCIAL':
        return 'badge-warning';
      case 'COBRADO_TOTAL':
      case 'COBRADO':
      default:
        return 'badge-success';
    }
  }

  cobroPacienteNombre(cobro: CobroPaciente): string {
    const paciente = this.pacientesById()[cobro.pacienteId];
    if (!paciente) return 'Paciente no disponible';
    return `${paciente.apellido}, ${paciente.nombre}`;
  }

  cobroPacienteDni(cobro: CobroPaciente): string {
    return this.pacientesById()[cobro.pacienteId]?.dni ?? '-';
  }

  cobroMedioLabel(cobro: CobroPaciente): string {
    const medios = Array.from(new Set((cobro.detalles ?? []).map((d) => d.medioPago)));
    if (medios.length === 0) return '-';
    if (medios.length === 1) return MEDIO_PAGO_LABELS[medios[0]];
    return 'Mixto';
  }

  toggleMenuCobro(cobroId: string): void {
    this.openedMenuCobroId.set(this.openedMenuCobroId() === cobroId ? null : cobroId);
  }

  menuCobroAbierto(cobroId: string): boolean {
    return this.openedMenuCobroId() === cobroId;
  }

  abrirDetalleCobro(cobro: CobroPaciente): void {
    this.openedMenuCobroId.set(null);
    this.selectedCobro.set(cobro);
  }

  cerrarDetalleCobro(): void {
    this.selectedCobro.set(null);
  }

  imprimirCobro(cobro: CobroPaciente): void {
    this.openedMenuCobroId.set(null);
    this.selectedCobro.set(cobro);
    setTimeout(() => window.print(), 0);
  }

  anularCobro(cobro: CobroPaciente): void {
    this.openedMenuCobroId.set(null);
    if (cobro.estado === 'ANULADO') return;

    const motivo = window.prompt('Motivo de anulacion', 'Anulacion manual')?.trim();
    if (!motivo) return;

    const confirmacion = window.confirm(
      `Confirmas anular el comprobante ${this.comprobanteLabel(cobro)}?`,
    );
    if (!confirmacion) return;

    const consultorioId = this.consultorioId();
    if (!consultorioId) return;

    this.cobroSvc.anular(consultorioId, cobro.id, { motivo }).subscribe({
      next: (cobroAnulado) => {
        this.cobros.update((items) =>
          items.map((item) => (item.id === cobro.id ? cobroAnulado : item)),
        );
        this.toast.success('Cobro anulado');
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  movimientoDescripcion(mov: MovimientoCaja): string {
    if (mov.origen !== 'COBRO_PACIENTE') return mov.descripcion;

    const cobroId = mov.referenciaEntidadId;
    if (!cobroId) return mov.descripcion;

    const cobro = this.cobros().find((item) => item.id === cobroId);
    if (!cobro) return mov.descripcion;

    const paciente = this.pacientesById()[cobro.pacienteId];
    if (!paciente) return 'Cobro paciente';

    return `Cobro paciente ${paciente.apellido}, ${paciente.nombre} - DNI ${paciente.dni}`;
  }

  private cobroEstadoFiltro(cobro: CobroPaciente): CobroEstadoFiltro {
    switch (cobro.estado) {
      case 'ANULADO':
        return 'ANULADO';
      case 'PENDIENTE':
      case 'PARCIAL':
        return 'PENDIENTE';
      case 'COBRADO_TOTAL':
      case 'COBRADO':
      default:
        return 'COBRADO';
    }
  }

  private cobroIncluyeMedio(cobro: CobroPaciente, medio: CobroMedioFiltro): boolean {
    const medios = Array.from(new Set((cobro.detalles ?? []).map((d) => d.medioPago)));
    if (medio === 'MIXTO') return medios.length > 1;
    return medios.includes(medio as MedioPago);
  }

  private esComprobanteAmigable(value: string): boolean {
    if (!value) return false;
    if (value.length > 20) return false;
    const cleaned = value.replace(/[#-]/g, '');
    return !/^[0-9a-f]{8,}$/i.test(cleaned);
  }

  private parseDate(value: string): Date {
    return value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private offsetDate(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
