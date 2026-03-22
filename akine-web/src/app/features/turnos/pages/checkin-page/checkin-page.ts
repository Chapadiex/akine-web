import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { TurnoService } from '../../services/turno.service';
import { Turno, TURNO_ESTADO_LABELS } from '../../models/turno.models';

type PageState = 'loading' | 'ready' | 'done' | 'error';

@Component({
  selector: 'app-checkin-page',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-container">
      <header class="page-header">
        <button class="btn-back" (click)="goBack()">&#8592; Turnos</button>
        <h1 class="page-title">Check-in</h1>
      </header>

      <main class="page-content">
        @if (state() === 'loading') {
          <div class="state-center">Cargando turno...</div>
        }

        @if (state() === 'error') {
          <div class="state-center error">No se pudo cargar el turno.</div>
        }

        @if (state() === 'ready' && turno(); as t) {
          <div class="turno-card">
            <div class="turno-estado-badge" [class]="estadoClass(t.estado)">
              <span class="badge-dot"></span>
              <strong>{{ estadoLabel(t.estado) }}</strong>
            </div>

            <div class="turno-info-grid">
              <div class="info-item">
                <span class="info-label">Paciente</span>
                <span class="info-value">{{ pacienteNombre(t) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Horario</span>
                <span class="info-value">{{ formatTime(t.fechaHoraInicio) }} – {{ formatTime(t.fechaHoraFin) }}</span>
              </div>
              @if (t.profesionalNombre) {
                <div class="info-item">
                  <span class="info-label">Profesional</span>
                  <span class="info-value">{{ t.profesionalNombre }} {{ t.profesionalApellido }}</span>
                </div>
              }
              @if (t.boxNombre) {
                <div class="info-item">
                  <span class="info-label">Box</span>
                  <span class="info-value">{{ t.boxNombre }}</span>
                </div>
              }
              @if (t.motivoConsulta) {
                <div class="info-item info-item--full">
                  <span class="info-label">Motivo</span>
                  <span class="info-value">{{ t.motivoConsulta }}</span>
                </div>
              }
            </div>

            @if (canCheckIn(t)) {
              <div class="actions">
                <button
                  class="btn-primary btn-checkin"
                  [disabled]="submitting()"
                  (click)="realizarCheckIn()"
                >
                  {{ submitting() ? 'Procesando...' : '✓ Realizar check-in' }}
                </button>
              </div>
            } @else {
              <div class="already-done">
                Check-in ya realizado o turno en estado no compatible.
              </div>
            }
          </div>
        }

        @if (state() === 'done' && turno(); as t) {
          <div class="done-card">
            <div class="done-icon">&#10003;</div>
            <h2 class="done-title">Check-in realizado</h2>
            <p class="done-sub">{{ pacienteNombre(t) }}</p>
            <p class="done-estado">Estado: <strong>{{ estadoLabel(t.estado) }}</strong></p>
            <button class="btn-secondary" (click)="goBack()">Volver a turnos</button>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .page-container { max-width: 600px; margin: 0 auto; padding: 24px; }

    .page-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    }

    .btn-back {
      background: none; border: none; font-size: 14px;
      color: var(--color-neutral-600, #475569); cursor: pointer; padding: 4px 0;
      &:hover { color: var(--color-neutral-900, #0f172a); }
    }

    .page-title {
      font-size: 20px; font-weight: 600; color: var(--color-neutral-900, #0f172a); margin: 0;
    }

    .state-center {
      padding: 48px; text-align: center; font-size: 14px;
      color: var(--color-neutral-400, #94a3b8);
      &.error { color: var(--color-error, #dc2626); }
    }

    .turno-card {
      background: var(--color-white, #fff);
      border: 1px solid var(--color-neutral-200, #e2e8f0);
      border-radius: 10px; padding: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }

    .turno-estado-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 9999px; font-size: 12px;
      margin-bottom: 20px;
    }

    .badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    .badge-confirmado {
      background: var(--color-primary-light, #e6f4f2);
      color: var(--color-primary-text, #0d4a40);
      .badge-dot { background: var(--color-primary, #1a6b5e); }
    }

    .badge-programado {
      background: #eff6ff; color: #1e40af;
      .badge-dot { background: #2563eb; }
    }

    .badge-checkin {
      background: var(--color-success-light, #ecfdf5);
      color: var(--color-success-text, #065f46);
      .badge-dot { background: var(--color-success, #059669); }
    }

    .badge-default {
      background: var(--color-neutral-100, #f1f5f9);
      color: var(--color-neutral-600, #475569);
      .badge-dot { background: var(--color-neutral-400, #94a3b8); }
    }

    .turno-info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;
    }

    .info-item {
      display: flex; flex-direction: column; gap: 3px;
      &--full { grid-column: 1 / -1; }
    }

    .info-label {
      font-size: 11px; font-weight: 500; color: var(--color-neutral-400, #94a3b8);
      text-transform: uppercase; letter-spacing: 0.06em;
    }

    .info-value { font-size: 14px; font-weight: 500; color: var(--color-neutral-900, #0f172a); }

    .actions { display: flex; justify-content: flex-end; }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; background: var(--color-primary, #1a6b5e); color: #fff;
      border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;
      &:hover:not(:disabled) { background: var(--color-primary-hover, #155c51); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
      &.btn-checkin { font-size: 15px; padding: 11px 24px; }
    }

    .btn-secondary {
      display: inline-flex; padding: 9px 16px;
      background: var(--color-white, #fff); color: var(--color-neutral-900, #0f172a);
      border: 1px solid var(--color-neutral-200, #e2e8f0);
      border-radius: 6px; font-size: 14px; cursor: pointer;
      &:hover { background: var(--color-neutral-100, #f1f5f9); }
    }

    .already-done {
      font-size: 13px; color: var(--color-neutral-400, #94a3b8);
      background: var(--color-neutral-50, #f8fafc);
      border-radius: 8px; padding: 12px 16px;
    }

    .done-card {
      max-width: 480px; margin: 0 auto; text-align: center;
      background: var(--color-white, #fff);
      border: 1px solid var(--color-neutral-200, #e2e8f0);
      border-radius: 10px; padding: 32px 24px;
    }

    .done-icon {
      width: 48px; height: 48px; background: var(--color-success-light, #ecfdf5);
      color: var(--color-success, #059669); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 600; margin: 0 auto 16px;
    }

    .done-title { font-size: 17px; font-weight: 600; color: var(--color-neutral-900, #0f172a); margin: 0 0 8px; }
    .done-sub { font-size: 14px; color: var(--color-neutral-600, #475569); margin: 0 0 4px; }
    .done-estado { font-size: 13px; color: var(--color-neutral-600, #475569); margin: 0 0 24px; }
  `],
})
export class CheckinPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private turnoSvc = inject(TurnoService);
  private consultorioCtx = inject(ConsultorioContextService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  turno = signal<Turno | null>(null);
  state = signal<PageState>('loading');
  submitting = signal(false);

  private consultorioId = computed(() => this.consultorioCtx.selectedConsultorioId());

  ngOnInit(): void {
    const turnoId = this.route.snapshot.paramMap.get('turnoId') ?? '';
    const cid = this.consultorioId();
    if (!turnoId || !cid) {
      this.state.set('error');
      return;
    }

    // Load turno list for today to find the specific turno
    const today = this.todayStr();
    this.turnoSvc.list(cid, { from: `${today}T00:00:00`, to: `${today}T23:59:59` }).subscribe({
      next: (turnos) => {
        const found = turnos.find((t) => t.id === turnoId) ?? null;
        this.turno.set(found);
        this.state.set(found ? 'ready' : 'error');
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.state.set('error');
      },
    });
  }

  realizarCheckIn(): void {
    const t = this.turno();
    const cid = this.consultorioId();
    if (!t || !cid || this.submitting()) return;

    this.submitting.set(true);
    this.turnoSvc.checkIn(cid, t.id).subscribe({
      next: (updated) => {
        this.turno.set(updated);
        this.state.set('done');
        this.submitting.set(false);
        this.toast.success('Check-in realizado');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  canCheckIn(t: Turno): boolean {
    return t.estado === 'PROGRAMADO' || t.estado === 'CONFIRMADO';
  }

  estadoLabel(estado: string): string {
    return TURNO_ESTADO_LABELS[estado as keyof typeof TURNO_ESTADO_LABELS] ?? estado;
  }

  estadoClass(estado: string): string {
    if (estado === 'CONFIRMADO') return 'turno-estado-badge badge-confirmado';
    if (estado === 'PROGRAMADO') return 'turno-estado-badge badge-programado';
    if (estado === 'CHECK_IN_REALIZADO') return 'turno-estado-badge badge-checkin';
    return 'turno-estado-badge badge-default';
  }

  pacienteNombre(t: Turno): string {
    if (!t.pacienteNombre) return 'Sin paciente';
    return `${t.pacienteApellido ?? ''}, ${t.pacienteNombre}`.trim();
  }

  formatTime(iso: string | null): string {
    if (!iso) return '--:--';
    return iso.substring(11, 16);
  }

  goBack(): void {
    this.router.navigate(['/app/turnos/hoy']);
  }

  private todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
