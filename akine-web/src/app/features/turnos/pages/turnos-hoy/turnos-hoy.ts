import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { AsignacionService } from '../../../consultorios/services/asignacion.service';
import { BoxService } from '../../../consultorios/services/box.service';
import { ConsultorioService } from '../../../consultorios/services/consultorio.service';
import { Box, Consultorio } from '../../../consultorios/models/consultorio.models';
import { ProfesionalAsignado } from '../../../consultorios/models/agenda.models';
import { TurnoDetail } from '../../components/turno-detail/turno-detail';
import { TurnoDialog } from '../../components/turno-dialog/turno-dialog';
import { TurnoService } from '../../services/turno.service';
import {
  AccionPrimaria,
  DaySummary,
  FilterEstadoGroup,
  TURNO_ACCION_PRIMARIA,
  TURNO_ESTADO_COLORS,
  TURNO_ESTADO_LABELS,
  Turno,
  TurnoEstado,
  buildDaySummary,
} from '../../models/turno.models';

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

  consultorios = this.consultorioCtx.consultorios;
  selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;
  selectedDate = signal(this.todayStr());
  turnos = signal<Turno[]>([]);
  loading = signal(false);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  profesionales = signal<ProfesionalAsignado[]>([]);
  boxes = signal<Box[]>([]);

  filterProfesionalId = signal('');
  filterBoxId = signal('');
  filterEstado = signal<FilterEstadoGroup>('TODOS');
  searchPaciente = signal('');

  showFilters = signal(false);
  confirmAction = signal<{
    turno: Turno;
    estado: TurnoEstado;
    label: string;
    variant: 'destructive' | 'positive';
  } | null>(null);
  showCreateDialog = signal(false);
  selectedTurno = signal<Turno | null>(null);
  overflowMenuTurnoId = signal<string | null>(null);
  now = signal(new Date());

  private isProfesional = computed(() => {
    const roles = this.auth.userRoles();
    return (
      roles.includes('PROFESIONAL') &&
      !roles.includes('ADMIN') &&
      !roles.includes('PROFESIONAL_ADMIN') &&
      !roles.includes('ADMINISTRATIVO')
    );
  });

  canCrearTurno = computed(() => {
    const roles = this.auth.userRoles();
    return (
      roles.includes('ADMIN') ||
      roles.includes('PROFESIONAL_ADMIN') ||
      roles.includes('ADMINISTRATIVO')
    );
  });

  daySummary = computed<DaySummary>(() => buildDaySummary(this.turnos()));

  private filteredByContextTurnos = computed(() => {
    let list = this.turnos();
    const profesionalId = this.filterProfesionalId();
    const boxId = this.filterBoxId();
    const search = this.searchPaciente().toLowerCase().trim();

    if (profesionalId) {
      list = list.filter((turno) => turno.profesionalId === profesionalId);
    }

    if (boxId) {
      list = list.filter((turno) => turno.boxId === boxId);
    }

    if (search) {
      list = list.filter((turno) => {
        const fullName =
          `${turno.pacienteNombre ?? ''} ${turno.pacienteApellido ?? ''}`.toLowerCase();
        return fullName.includes(search);
      });
    }

    return list;
  });

  enAtencionTurnos = computed(() => {
    if (this.filterEstado() === 'COMPLETADO') {
      return [] as Turno[];
    }

    const list = this.filteredByContextTurnos()
      .filter((turno) => turno.estado === 'EN_CURSO')
      .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));

    return this.filterEstado() === 'EN_CURSO' || this.filterEstado() === 'TODOS'
      ? list
      : list;
  });

  operationalTurnos = computed(() => {
    const estado = this.filterEstado();
    let list = this.filteredByContextTurnos();

    if (estado === 'COMPLETADO') {
      list = list.filter((turno) => turno.estado === 'COMPLETADO');
    } else if (estado === 'EN_CURSO') {
      list = [];
    } else if (estado === 'PENDIENTES') {
      list = list.filter(
        (turno) => turno.estado === 'PROGRAMADO' || turno.estado === 'CONFIRMADO',
      );
    } else if (estado === 'TODOS') {
      list = list.filter(
        (turno) => turno.estado !== 'EN_CURSO' && turno.estado !== 'COMPLETADO',
      );
    } else {
      list = list.filter((turno) => turno.estado === estado);
    }

    return list.sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
  });

  proximoTurno = computed(() => {
    const current = this.now();
    return (
      this.operationalTurnos().find((turno) => {
        if (turno.estado !== 'PROGRAMADO' && turno.estado !== 'CONFIRMADO') {
          return false;
        }
        return new Date(turno.fechaHoraInicio) >= current;
      }) ?? null
    );
  });

  minutesUntilNext = computed(() => {
    const next = this.proximoTurno();
    if (!next) {
      return null;
    }

    const diff = new Date(next.fechaHoraInicio).getTime() - this.now().getTime();
    return Math.max(0, Math.ceil(diff / 60_000));
  });

  formattedDate = computed(() => {
    const date = this.selectedDate();
    const [year, month, day] = date.split('-');
    const parsed = new Date(+year, +month - 1, +day);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    return `${dayNames[parsed.getDay()]} ${day}/${monthNames[+month - 1]}/${year}`;
  });

  isToday = computed(() => this.selectedDate() === this.todayStr());

  constructor() {
    effect(() => {
      const consultorioId = this.selectedConsultorioId();
      const date = this.selectedDate();

      if (consultorioId && date) {
        this.loadTurnos();
        this.loadFilterData(consultorioId);
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
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.overflowMenuTurnoId.set(null);
  }

  private ensureConsultoriosLoaded(): void {
    if (this.consultorios().length > 0) {
      return;
    }

    this.consultorioSvc.list().subscribe({
      next: (consultorios: Consultorio[]) => this.consultorioCtx.setConsultorios(consultorios),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private loadFilterData(consultorioId: string): void {
    this.asignacionSvc.list(consultorioId).subscribe({
      next: (profesionales) => this.profesionales.set(profesionales),
    });

    this.boxSvc.list(consultorioId).subscribe({
      next: (boxes) => this.boxes.set(boxes.filter((box) => box.activo)),
    });
  }

  loadTurnos(): void {
    const consultorioId = this.selectedConsultorioId();
    const date = this.selectedDate();
    if (!consultorioId || !date) {
      return;
    }

    this.loading.set(true);
    const from = `${date}T00:00:00`;
    const to = `${date}T23:59:59`;

    const user = this.auth.currentUser();
    const profesionalId =
      this.isProfesional() && user?.profesionalId ? user.profesionalId : undefined;

    this.turnoSvc.list(consultorioId, { from, to, profesionalId }).subscribe({
      next: (turnos) => {
        const sorted = [...turnos].sort((a, b) =>
          a.fechaHoraInicio.localeCompare(b.fechaHoraInicio),
        );
        this.turnos.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.loading.set(false);
      },
    });
  }

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

  selectTurno(turno: Turno): void {
    this.selectedTurno.set(turno);
  }

  closeSidebar(): void {
    this.selectedTurno.set(null);
  }

  onEstadoCambiado(_updated: Turno): void {
    this.selectedTurno.set(null);
    this.loadTurnos();
  }

  onFilterProfesional(value: string): void {
    this.filterProfesionalId.set(value);
  }

  onFilterBox(value: string): void {
    this.filterBoxId.set(value);
  }

  onSearchPaciente(value: string): void {
    this.searchPaciente.set(value);
  }

  toggleFilters(): void {
    this.showFilters.update((current) => !current);
  }

  filterByKpi(estado: FilterEstadoGroup): void {
    if (this.filterEstado() === estado) {
      this.filterEstado.set('TODOS');
      return;
    }

    this.filterEstado.set(estado);
  }

  accionPrimaria(turno: Turno): AccionPrimaria | undefined {
    return TURNO_ACCION_PRIMARIA[turno.estado];
  }

  executePrimaryAction(turno: Turno, event: Event): void {
    event.stopPropagation();
    const accion = TURNO_ACCION_PRIMARIA[turno.estado];
    if (!accion) {
      return;
    }

    this.confirmAction.set({
      turno,
      estado: accion.nuevoEstado,
      label: accion.label,
      variant: 'positive',
    });
  }

  finalizeEnAtencion(turno: Turno, event: Event): void {
    event.stopPropagation();
    this.confirmAction.set({
      turno,
      estado: 'COMPLETADO',
      label: 'Finalizar',
      variant: 'positive',
    });
  }

  startDestructiveAction(
    turno: Turno,
    estado: TurnoEstado,
    label: string,
    event: Event,
  ): void {
    event.stopPropagation();
    this.overflowMenuTurnoId.set(null);
    this.confirmAction.set({ turno, estado, label, variant: 'destructive' });
  }

  confirmarCambioEstado(): void {
    const action = this.confirmAction();
    if (!action) {
      return;
    }

    this.confirmAction.set(null);

    const consultorioId = this.selectedConsultorioId();
    this.turnoSvc
      .cambiarEstado(consultorioId, action.turno.id, { nuevoEstado: action.estado })
      .subscribe({
        next: () => {
          this.toast.success(`Turno ${TURNO_ESTADO_LABELS[action.estado].toLowerCase()}`);
          this.loadTurnos();
        },
        error: (err) => this.toast.error(this.errMap.toMessage(err)),
      });
  }

  toggleOverflow(turnoId: string, event: Event): void {
    event.stopPropagation();
    this.overflowMenuTurnoId.set(
      this.overflowMenuTurnoId() === turnoId ? null : turnoId,
    );
  }

  canCancelar(turno: Turno): boolean {
    return (
      turno.estado === 'PROGRAMADO' ||
      turno.estado === 'CONFIRMADO' ||
      turno.estado === 'EN_ESPERA'
    );
  }

  canMarcarAusente(turno: Turno): boolean {
    return (
      turno.estado === 'PROGRAMADO' ||
      turno.estado === 'CONFIRMADO' ||
      turno.estado === 'EN_ESPERA'
    );
  }

  estadoLabel(estado: TurnoEstado): string {
    return TURNO_ESTADO_LABELS[estado];
  }

  estadoColor(estado: TurnoEstado): string {
    return TURNO_ESTADO_COLORS[estado];
  }

  formatTime(isoDateTime: string | null): string {
    if (!isoDateTime) {
      return '--:--';
    }
    return isoDateTime.substring(11, 16);
  }

  pacienteNombreCompleto(turno: Turno): string {
    if (!turno.pacienteNombre) {
      return 'Sin paciente';
    }

    return `${turno.pacienteApellido}, ${turno.pacienteNombre}`;
  }

  profesionalNombreCompleto(turno: Turno): string {
    if (!turno.profesionalNombre) {
      return 'Sin profesional';
    }

    return `${turno.profesionalNombre} ${turno.profesionalApellido}`;
  }

  resumenOperativo(turno: Turno): string {
    const parts = [this.profesionalNombreCompleto(turno), turno.boxNombre].filter(Boolean);
    return parts.join(' · ');
  }

  isCurrentTurno(turno: Turno): boolean {
    if (turno.estado !== 'EN_CURSO') {
      return false;
    }

    const now = this.now();
    return new Date(turno.fechaHoraInicio) <= now && new Date(turno.fechaHoraFin) >= now;
  }

  private todayStr(): string {
    const date = new Date();
    return (
      `${date.getFullYear()}-` +
      `${String(date.getMonth() + 1).padStart(2, '0')}-` +
      String(date.getDate()).padStart(2, '0')
    );
  }

  private offsetDate(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T12:00:00`);
    date.setDate(date.getDate() + days);
    return (
      `${date.getFullYear()}-` +
      `${String(date.getMonth() + 1).padStart(2, '0')}-` +
      String(date.getDate()).padStart(2, '0')
    );
  }
}
