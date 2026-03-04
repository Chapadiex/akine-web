import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioService } from '../../../consultorios/services/consultorio.service';
import { AsignacionService } from '../../../consultorios/services/asignacion.service';
import { BoxService } from '../../../consultorios/services/box.service';
import { Consultorio, Box } from '../../../consultorios/models/consultorio.models';
import { ProfesionalAsignado } from '../../../consultorios/models/agenda.models';
import { TurnoService } from '../../services/turno.service';
import {
  Turno,
  TurnoEstado,
  TURNO_ESTADO_COLORS,
  TURNO_ESTADO_LABELS,
  TURNO_ACCION_PRIMARIA,
  AccionPrimaria,
  DaySummary,
  buildDaySummary,
  FilterEstadoGroup,
  TurnoGroup,
  groupTurnosByPeriod,
} from '../../models/turno.models';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { TurnoDialog } from '../../components/turno-dialog/turno-dialog';
import { TurnoDetail } from '../../components/turno-detail/turno-detail';

@Component({
  selector: 'app-turnos-hoy',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ConfirmDialog, TurnoDialog, TurnoDetail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './turnos-hoy.html',
  styleUrl: './turnos-hoy.scss',
})
export class TurnosHoyPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private consultorioCtx = inject(ConsultorioContextService);
  private turnoSvc = inject(TurnoService);
  private consultorioSvc = inject(ConsultorioService);
  private asignacionSvc = inject(AsignacionService);
  private boxSvc = inject(BoxService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  /* ── Context ── */
  consultorios = this.consultorioCtx.consultorios;
  selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;
  selectedDate = signal(this.todayStr());
  turnos = signal<Turno[]>([]);
  loading = signal(false);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  /* ── Filter data ── */
  profesionales = signal<ProfesionalAsignado[]>([]);
  boxes = signal<Box[]>([]);

  /* ── Local filters ── */
  filterProfesionalId = signal('');
  filterBoxId = signal('');
  filterEstado = signal<FilterEstadoGroup>('TODOS');
  searchPaciente = signal('');

  /* ── UI state ── */
  confirmAction = signal<{ turno: Turno; estado: TurnoEstado; label: string; variant: 'destructive' | 'positive' } | null>(null);
  showCreateDialog = signal(false);
  selectedTurno = signal<Turno | null>(null);
  overflowMenuTurnoId = signal<string | null>(null);
  now = signal(new Date());

  /* ── Computed ── */
  private isProfesional = computed(() => {
    const roles = this.auth.userRoles();
    return roles.includes('PROFESIONAL') && !roles.includes('ADMIN') &&
      !roles.includes('PROFESIONAL_ADMIN') && !roles.includes('ADMINISTRATIVO');
  });

  canCrearTurno = computed(() => {
    const roles = this.auth.userRoles();
    return roles.includes('ADMIN') || roles.includes('PROFESIONAL_ADMIN') || roles.includes('ADMINISTRATIVO');
  });

  daySummary = computed<DaySummary>(() => buildDaySummary(this.turnos()));

  filteredTurnos = computed(() => {
    let list = this.turnos();
    const profId = this.filterProfesionalId();
    const boxId = this.filterBoxId();
    const estado = this.filterEstado();
    const search = this.searchPaciente().toLowerCase().trim();

    if (profId) list = list.filter(t => t.profesionalId === profId);
    if (boxId) list = list.filter(t => t.boxId === boxId);
    if (estado === 'PENDIENTES') {
      list = list.filter(t => t.estado === 'PROGRAMADO' || t.estado === 'CONFIRMADO');
    } else if (estado !== 'TODOS') {
      list = list.filter(t => t.estado === estado);
    }
    if (search) {
      list = list.filter(t => {
        const fullName = `${t.pacienteNombre ?? ''} ${t.pacienteApellido ?? ''}`.toLowerCase();
        return fullName.includes(search);
      });
    }
    return list;
  });

  groupedTurnos = computed<TurnoGroup[]>(() => groupTurnosByPeriod(this.filteredTurnos()));

  proximoTurno = computed(() => {
    const current = this.now();
    return this.turnos().find(t => {
      if (t.estado !== 'PROGRAMADO' && t.estado !== 'CONFIRMADO') return false;
      return new Date(t.fechaHoraInicio) >= current;
    }) ?? null;
  });

  minutesUntilNext = computed(() => {
    const next = this.proximoTurno();
    if (!next) return null;
    const diff = new Date(next.fechaHoraInicio).getTime() - this.now().getTime();
    return Math.max(0, Math.ceil(diff / 60_000));
  });

  formattedDate = computed(() => {
    const d = this.selectedDate();
    const [y, m, day] = d.split('-');
    const date = new Date(+y, +m - 1, +day);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dayNames[date.getDay()]} ${day}/${monthNames[+m - 1]}/${y}`;
  });

  isToday = computed(() => this.selectedDate() === this.todayStr());

  constructor() {
    effect(() => {
      const cid = this.selectedConsultorioId();
      const date = this.selectedDate();
      if (cid && date) {
        this.loadTurnos();
        this.loadFilterData(cid);
      } else {
        this.turnos.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.ensureConsultoriosLoaded();
    this.refreshInterval = setInterval(() => this.loadTurnos(), 60_000);
    this.countdownInterval = setInterval(() => this.now.set(new Date()), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.overflowMenuTurnoId.set(null);
  }

  /* ── Data loading ── */
  private ensureConsultoriosLoaded(): void {
    if (this.consultorios().length > 0) return;
    this.consultorioSvc.list().subscribe({
      next: (all: Consultorio[]) => this.consultorioCtx.setConsultorios(all),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private loadFilterData(cid: string): void {
    this.asignacionSvc.list(cid).subscribe({
      next: (p) => this.profesionales.set(p),
    });
    this.boxSvc.list(cid).subscribe({
      next: (b) => this.boxes.set(b.filter(x => x.activo)),
    });
  }

  loadTurnos(): void {
    const cid = this.selectedConsultorioId();
    const date = this.selectedDate();
    if (!cid || !date) return;

    this.loading.set(true);
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59`;

    const user = this.auth.currentUser();
    const profesionalId = this.isProfesional() && user?.profesionalId ? user.profesionalId : undefined;

    this.turnoSvc.list(cid, { from, to, profesionalId }).subscribe({
      next: (data) => {
        const sorted = data.sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
        this.turnos.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }

  /* ── Date navigation ── */
  prevDay(): void {
    this.selectedDate.set(this.offsetDate(this.selectedDate(), -1));
  }

  nextDay(): void {
    this.selectedDate.set(this.offsetDate(this.selectedDate(), 1));
  }

  goToday(): void {
    this.selectedDate.set(this.todayStr());
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
  }

  /* ── Navigation ── */
  irACalendario(): void {
    this.router.navigate(['../agenda'], { relativeTo: this.route });
  }

  abrirAltaTurno(): void {
    this.showCreateDialog.set(true);
  }

  onTurnoCreado(): void {
    this.showCreateDialog.set(false);
    this.loadTurnos();
  }

  /* ── Sidebar ── */
  selectTurno(t: Turno): void {
    this.selectedTurno.set(t);
  }

  closeSidebar(): void {
    this.selectedTurno.set(null);
  }

  onEstadoCambiado(_updated: Turno): void {
    this.selectedTurno.set(null);
    this.loadTurnos();
  }

  /* ── Filters ── */
  onFilterProfesional(value: string): void {
    this.filterProfesionalId.set(value);
  }

  onFilterBox(value: string): void {
    this.filterBoxId.set(value);
  }

  onFilterEstado(value: string): void {
    this.filterEstado.set(value as FilterEstadoGroup);
  }

  onSearchPaciente(value: string): void {
    this.searchPaciente.set(value);
  }

  filterByKpi(estado: FilterEstadoGroup): void {
    if (this.filterEstado() === estado) {
      this.filterEstado.set('TODOS');
    } else {
      this.filterEstado.set(estado);
    }
  }

  /* ── Actions ── */
  accionPrimaria(t: Turno): AccionPrimaria | undefined {
    return TURNO_ACCION_PRIMARIA[t.estado];
  }

  executePrimaryAction(t: Turno, event: Event): void {
    event.stopPropagation();
    const accion = TURNO_ACCION_PRIMARIA[t.estado];
    if (!accion) return;
    this.confirmAction.set({
      turno: t,
      estado: accion.nuevoEstado,
      label: accion.label,
      variant: 'positive',
    });
  }

  startDestructiveAction(t: Turno, estado: TurnoEstado, label: string, event: Event): void {
    event.stopPropagation();
    this.overflowMenuTurnoId.set(null);
    this.confirmAction.set({ turno: t, estado, label, variant: 'destructive' });
  }

  confirmarCambioEstado(): void {
    const action = this.confirmAction();
    if (!action) return;
    this.confirmAction.set(null);

    const cid = this.selectedConsultorioId();
    this.turnoSvc.cambiarEstado(cid, action.turno.id, { nuevoEstado: action.estado }).subscribe({
      next: () => {
        this.toast.success(`Turno ${TURNO_ESTADO_LABELS[action.estado].toLowerCase()}`);
        this.loadTurnos();
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  /* ── Overflow menu ── */
  toggleOverflow(turnoId: string, event: Event): void {
    event.stopPropagation();
    this.overflowMenuTurnoId.set(this.overflowMenuTurnoId() === turnoId ? null : turnoId);
  }

  canCancelar(t: Turno): boolean {
    return t.estado === 'PROGRAMADO' || t.estado === 'CONFIRMADO' || t.estado === 'EN_ESPERA';
  }

  canMarcarAusente(t: Turno): boolean {
    return t.estado === 'PROGRAMADO' || t.estado === 'CONFIRMADO' || t.estado === 'EN_ESPERA';
  }

  /* ── Helpers ── */
  estadoLabel(estado: TurnoEstado): string {
    return TURNO_ESTADO_LABELS[estado];
  }

  estadoColor(estado: TurnoEstado): string {
    return TURNO_ESTADO_COLORS[estado];
  }

  formatTime(isoDateTime: string): string {
    return isoDateTime.substring(11, 16);
  }

  pacienteNombreCompleto(t: Turno): string {
    if (!t.pacienteNombre) return 'Sin paciente';
    return `${t.pacienteApellido}, ${t.pacienteNombre}`;
  }

  profesionalNombreCompleto(t: Turno): string {
    if (!t.profesionalNombre) return 'Sin profesional';
    return `${t.profesionalNombre} ${t.profesionalApellido}`;
  }

  isCurrentTurno(t: Turno): boolean {
    if (t.estado !== 'EN_CURSO') return false;
    const now = this.now();
    return new Date(t.fechaHoraInicio) <= now && new Date(t.fechaHoraFin) >= now;
  }

  private todayStr(): string {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  private offsetDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
}
