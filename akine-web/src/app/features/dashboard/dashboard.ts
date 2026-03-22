import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { TurnoService } from '../turnos/services/turno.service';
import {
  DaySummary,
  TURNO_ESTADO_LABELS,
  Turno,
  TurnoEstado,
  buildDaySummary,
} from '../turnos/models/turno.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly turnoSvc = inject(TurnoService);

  readonly currentUser = this.auth.currentUser;
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;

  readonly loading = signal(true);
  readonly turnos = signal<Turno[]>([]);

  readonly daySummary = computed<DaySummary>(() => buildDaySummary(this.turnos()));

  /** Turnos operativos: excluye cancelados y ausentes del bloque principal */
  readonly turnosOperativos = computed(() =>
    this.turnos()
      .filter((t) => t.estado !== 'CANCELADO' && t.estado !== 'AUSENTE')
      .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio))
      .slice(0, 10),
  );

  readonly todayLabel = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  constructor() {
    effect(() => {
      const cid = this.selectedConsultorioId();
      if (cid) {
        this.loadTurnosHoy(cid);
      } else {
        this.loading.set(false);
        this.turnos.set([]);
      }
    });
  }

  ngOnInit(): void {}

  private loadTurnosHoy(consultorioId: string): void {
    this.loading.set(true);
    const today = this.todayStr();
    const from = `${today}T00:00:00`;
    const to = `${today}T23:59:59`;

    const user = this.currentUser();
    const isProfesionalOnly =
      this.auth.hasRole('PROFESIONAL') &&
      !this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO');
    const profesionalId =
      isProfesionalOnly && user?.profesionalId ? user.profesionalId : undefined;

    this.turnoSvc.list(consultorioId, { from, to, profesionalId }).subscribe({
      next: (list) => {
        this.turnos.set([...list].sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  formatTime(dt: string): string {
    return dt.substring(11, 16);
  }

  estadoLabel(estado: TurnoEstado): string {
    return TURNO_ESTADO_LABELS[estado];
  }

  estadoClass(estado: TurnoEstado): string {
    const map: Record<TurnoEstado, string> = {
      PROGRAMADO: 'estado--programado',
      CONFIRMADO: 'estado--confirmado',
      EN_ESPERA:  'estado--espera',
      EN_CURSO:   'estado--curso',
      COMPLETADO: 'estado--completado',
      CANCELADO:  'estado--cancelado',
      AUSENTE:    'estado--ausente',
    };
    return map[estado] ?? '';
  }

  pacienteNombre(t: Turno): string {
    if (!t.pacienteNombre) return 'Sin paciente';
    return `${t.pacienteApellido}, ${t.pacienteNombre}`;
  }

  profesionalNombre(t: Turno): string {
    if (!t.profesionalNombre) return '—';
    return `${t.profesionalNombre} ${t.profesionalApellido ?? ''}`.trim();
  }

  private todayStr(): string {
    const d = new Date();
    return (
      `${d.getFullYear()}-` +
      `${String(d.getMonth() + 1).padStart(2, '0')}-` +
      String(d.getDate()).padStart(2, '0')
    );
  }
}
