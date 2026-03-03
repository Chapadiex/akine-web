import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioService } from '../../../consultorios/services/consultorio.service';
import { Consultorio } from '../../../consultorios/models/consultorio.models';
import { TurnoService } from '../../services/turno.service';
import {
  Turno,
  TurnoEstado,
  TURNO_ESTADO_COLORS,
  TURNO_ESTADO_LABELS,
} from '../../models/turno.models';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { TurnoDialog } from '../../components/turno-dialog/turno-dialog';

@Component({
  selector: 'app-turnos-hoy',
  standalone: true,
  imports: [FormsModule, ConfirmDialog, TurnoDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './turnos-hoy.html',
  styleUrl: './turnos-hoy.scss',
})
export class TurnosHoyPage implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private consultorioCtx = inject(ConsultorioContextService);
  private turnoSvc = inject(TurnoService);
  private consultorioSvc = inject(ConsultorioService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  consultorios = this.consultorioCtx.consultorios;
  selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;
  selectedDate = signal(this.todayStr());
  turnos = signal<Turno[]>([]);
  loading = signal(false);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  confirmAction = signal<{ turno: Turno; estado: TurnoEstado; label: string } | null>(null);
  showCreateDialog = signal(false);

  private isProfesional = computed(() => {
    const roles = this.auth.userRoles();
    return roles.includes('PROFESIONAL') && !roles.includes('ADMIN') &&
      !roles.includes('PROFESIONAL_ADMIN') && !roles.includes('ADMINISTRATIVO');
  });
  canCrearTurno = computed(() => {
    const roles = this.auth.userRoles();
    return roles.includes('ADMIN') || roles.includes('PROFESIONAL_ADMIN') || roles.includes('ADMINISTRATIVO');
  });

  proximoTurno = computed(() => {
    const now = new Date();
    return this.turnos().find((t) => {
      if (t.estado !== 'PROGRAMADO' && t.estado !== 'CONFIRMADO') return false;
      return new Date(t.fechaHoraInicio) >= now;
    }) ?? null;
  });

  constructor() {
    effect(() => {
      const cid = this.selectedConsultorioId();
      const date = this.selectedDate();
      if (cid && date) {
        this.loadTurnos();
      } else {
        this.turnos.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.ensureConsultoriosLoaded();
    this.refreshInterval = setInterval(() => this.loadTurnos(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  private ensureConsultoriosLoaded(): void {
    if (this.consultorios().length > 0) return;
    this.consultorioSvc.list().subscribe({
      next: (all: Consultorio[]) => this.consultorioCtx.setConsultorios(all),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  onConsultorioChange(id: string): void {
    this.consultorioCtx.setSelectedConsultorioId(id);
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
  }

  abrirAltaTurno(): void {
    this.showCreateDialog.set(true);
  }

  onTurnoCreado(): void {
    this.showCreateDialog.set(false);
    this.loadTurnos();
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

  estadoLabel(estado: TurnoEstado): string {
    return TURNO_ESTADO_LABELS[estado];
  }

  estadoColor(estado: TurnoEstado): string {
    return TURNO_ESTADO_COLORS[estado];
  }

  formatTime(isoDateTime: string): string {
    return isoDateTime.substring(11, 16);
  }

  canConfirmar(t: Turno): boolean { return t.estado === 'PROGRAMADO'; }
  canSalaEspera(t: Turno): boolean { return t.estado === 'CONFIRMADO'; }
  canIniciar(t: Turno): boolean { return t.estado === 'CONFIRMADO' || t.estado === 'EN_ESPERA'; }
  canCompletar(t: Turno): boolean { return t.estado === 'EN_CURSO'; }
  canCancelar(t: Turno): boolean { return t.estado === 'PROGRAMADO' || t.estado === 'CONFIRMADO' || t.estado === 'EN_ESPERA'; }
  canMarcarAusente(t: Turno): boolean { return t.estado === 'PROGRAMADO' || t.estado === 'CONFIRMADO' || t.estado === 'EN_ESPERA'; }

  pacienteNombreCompleto(t: Turno): string | null {
    if (!t.pacienteNombre) return null;
    return `${t.pacienteApellido}, ${t.pacienteNombre}`;
  }

  startCambiarEstado(turno: Turno, estado: TurnoEstado, label: string): void {
    this.confirmAction.set({ turno, estado, label });
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

  private todayStr(): string {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
}
