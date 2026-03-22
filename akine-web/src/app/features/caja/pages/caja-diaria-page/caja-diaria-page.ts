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
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { CajaDiariaService } from '../../services/caja-diaria.service';
import { CobroPacienteService } from '../../services/cobro-paciente.service';
import {
  CajaDiaria,
  CajaDiariaEstado,
  CobroPaciente,
  MovimientoCaja,
  TURNO_CAJA_LABELS,
  TurnoCaja,
} from '../../models/caja.models';

type PageState = 'loading' | 'sin_caja' | 'con_caja' | 'cerrando' | 'error';

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
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private router = inject(Router);

  consultorioId = this.consultorioCtx.selectedConsultorioId;
  selectedDate = signal(this.todayStr());
  pageState = signal<PageState>('loading');
  caja = signal<CajaDiaria | null>(null);
  movimientos = signal<MovimientoCaja[]>([]);
  cobros = signal<CobroPaciente[]>([]);
  submitting = signal(false);
  showCierreForm = signal(false);

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
          this.pageState.set('sin_caja');
        } else {
          const cajaActiva = cajas.find((c) => c.estado === 'ABIERTA') ?? cajas[0];
          this.caja.set(cajaActiva);
          this.pageState.set('con_caja');
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
      next: (cobros) => this.cobros.set(cobros),
      error: () => {},
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
