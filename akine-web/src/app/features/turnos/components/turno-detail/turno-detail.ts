import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { TurnoService } from '../../services/turno.service';
import {
  HistorialEstadoTurno,
  Turno,
  TurnoEstado,
  TURNO_ESTADO_COLORS,
  TURNO_ESTADO_LABELS,
  TIPO_CONSULTA_LABELS,
  TipoConsulta,
} from '../../models/turno.models';

@Component({
  selector: 'app-turno-detail',
  standalone: true,
  imports: [ConfirmDialog, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (turno(); as t) {
      <div class="detail-panel">
        <div class="detail-header">
          <h3>Detalle del turno</h3>
          <button class="btn-close" (click)="closed.emit()">&times;</button>
        </div>

        <div class="detail-body">
          <div class="field">
            <span class="label">Horario</span>
            <span class="value">{{ formatTime(t.fechaHoraInicio) }} - {{ formatTime(t.fechaHoraFin) }}</span>
          </div>
          <div class="field">
            <span class="label">Profesional</span>
            <span class="value">{{ t.profesionalNombre }} {{ t.profesionalApellido }}</span>
          </div>
          @if (t.pacienteNombre) {
            <div class="field">
              <span class="label">Paciente</span>
              <span class="value">{{ t.pacienteApellido }}, {{ t.pacienteNombre }}@if (t.pacienteDni) { (DNI: {{ t.pacienteDni }}) }</span>
            </div>
          }
          @if (t.boxNombre) {
            <div class="field">
              <span class="label">Box</span>
              <span class="value">{{ t.boxNombre }}</span>
            </div>
          }
          <div class="field">
            <span class="label">Estado</span>
            <span class="badge"
              [style.background]="estadoColor(t.estado) + '20'"
              [style.color]="estadoColor(t.estado)">
              {{ estadoLabel(t.estado) }}
            </span>
          </div>
          @if (t.tipoConsulta) {
            <div class="field">
              <span class="label">Tipo de consulta</span>
              <span class="badge-tipo" [class.obra-social]="t.tipoConsulta === 'OBRA_SOCIAL'">
                {{ tipoConsultaLabel(t.tipoConsulta) }}
              </span>
            </div>
          }
          @if (t.telefonoContacto) {
            <div class="field">
              <span class="label">Tel&eacute;fono</span>
              <span class="value">{{ t.telefonoContacto }}</span>
            </div>
          }
          @if (t.motivoConsulta) {
            <div class="field">
              <span class="label">Motivo</span>
              <span class="value">{{ t.motivoConsulta }}</span>
            </div>
          }
          @if (t.notas) {
            <div class="field">
              <span class="label">Notas</span>
              <span class="value">{{ t.notas }}</span>
            </div>
          }
          @if (t.motivoCancelacion) {
            <div class="field">
              <span class="label">Motivo de cancelaci&oacute;n</span>
              <span class="value cancel-motivo">{{ t.motivoCancelacion }}</span>
            </div>
          }

          <!-- Historial de estados -->
          <div class="historial-section">
            <button class="btn-historial" (click)="toggleHistorial()">
              {{ showHistorial() ? 'Ocultar' : 'Ver' }} historial de estados
            </button>
            @if (showHistorial()) {
              @if (loadingHistorial()) {
                <p class="loading-msg">Cargando...</p>
              } @else {
                <div class="historial-list">
                  @for (h of historial(); track h.id) {
                    <div class="historial-entry">
                      <span class="historial-time">{{ formatDateTime(h.createdAt) }}</span>
                      <span class="historial-change">
                        @if (h.estadoAnterior) {
                          {{ h.estadoAnterior }} &rarr;
                        }
                        {{ h.estadoNuevo }}
                      </span>
                      @if (h.cambiadoPorUserEmail) {
                        <span class="historial-user">{{ h.cambiadoPorUserEmail }}</span>
                      }
                      @if (h.motivo) {
                        <span class="historial-motivo">{{ h.motivo }}</span>
                      }
                    </div>
                  }
                  @if (historial().length === 0) {
                    <p class="empty-msg">Sin historial</p>
                  }
                </div>
              }
            }
          </div>
        </div>

        <div class="detail-actions">
          @if (t.estado === 'PROGRAMADO') {
            <button class="btn-sm btn-success" (click)="askConfirm(t, 'CONFIRMADO', 'Confirmar')">Confirmar</button>
            <button class="btn-sm btn-danger" (click)="askCancel(t)">Cancelar</button>
            <button class="btn-sm btn-warn" (click)="askConfirm(t, 'AUSENTE', 'Marcar ausente')">Ausente</button>
          }
          @if (t.estado === 'CONFIRMADO') {
            <button class="btn-sm btn-orange" (click)="askConfirm(t, 'EN_ESPERA', 'Sala de espera')">Sala de espera</button>
            <button class="btn-sm btn-primary" (click)="askConfirm(t, 'EN_CURSO', 'Iniciar')">Iniciar</button>
            <button class="btn-sm btn-danger" (click)="askCancel(t)">Cancelar</button>
            <button class="btn-sm btn-warn" (click)="askConfirm(t, 'AUSENTE', 'Marcar ausente')">Ausente</button>
          }
          @if (t.estado === 'EN_ESPERA') {
            <button class="btn-sm btn-primary" (click)="askConfirm(t, 'EN_CURSO', 'Iniciar')">Iniciar</button>
            <button class="btn-sm btn-danger" (click)="askCancel(t)">Cancelar</button>
            <button class="btn-sm btn-warn" (click)="askConfirm(t, 'AUSENTE', 'Marcar ausente')">Ausente</button>
          }
          @if (t.estado === 'EN_CURSO') {
            <button class="btn-sm btn-success" (click)="askConfirm(t, 'COMPLETADO', 'Completar')">Completar</button>
          }
        </div>
      </div>
    }

    @if (confirmAction(); as action) {
      <app-confirm-dialog
        [title]="action.label + ' turno'"
        [message]="'¿' + action.label + ' este turno?'"
        (confirmed)="doChangeEstado()"
        (cancelled)="confirmAction.set(null)"
      />
    }

    @if (showCancelDialog()) {
      <div class="overlay" (click)="showCancelDialog.set(false)">
        <div class="cancel-dialog" (click)="$event.stopPropagation()">
          <h4>Cancelar turno</h4>
          <p>Motivo de cancelaci&oacute;n (opcional):</p>
          <textarea [(ngModel)]="cancelMotivo" rows="3" placeholder="Ingrese el motivo..."></textarea>
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="showCancelDialog.set(false)">Volver</button>
            <button class="btn-confirm-cancel" (click)="doCancelWithMotivo()">Confirmar cancelaci&oacute;n</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .detail-panel {
      background: var(--white);
      border-left: 1px solid var(--border);
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 1rem;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      h3 { font-size: 1rem; font-weight: 700; margin: 0; }
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
    }
    .detail-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .value {
      font-size: 0.9rem;
    }
    .badge {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
    }
    .badge-tipo {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
      background: #dbeafe;
      color: #1d4ed8;
    }
    .badge-tipo.obra-social { background: #dcfce7; color: #16a34a; }
    .cancel-motivo { color: var(--error, #dc2626); font-style: italic; }
    .detail-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      border: none;
      border-radius: var(--radius);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-success { background: var(--success-bg, #dcfce7); color: var(--success, #16a34a); }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-danger { background: var(--error-bg, #fef2f2); color: var(--error, #dc2626); }
    .btn-warn { background: #fef3c7; color: #d97706; }
    .btn-orange { background: #fff7ed; color: #ea580c; }
    .btn-sm:hover { opacity: 0.85; }

    .historial-section {
      margin-top: 0.5rem;
      border-top: 1px solid var(--border);
      padding-top: 0.5rem;
    }
    .btn-historial {
      background: none; border: none; color: var(--primary);
      cursor: pointer; font-size: 0.8rem; font-weight: 600; padding: 0;
    }
    .historial-list { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .historial-entry {
      font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.1rem;
      padding: 0.4rem; background: var(--bg, #f9fafb); border-radius: var(--radius);
    }
    .historial-time { color: var(--text-muted); font-size: 0.7rem; }
    .historial-change { font-weight: 600; }
    .historial-user { color: var(--text-muted); font-size: 0.7rem; }
    .historial-motivo { font-style: italic; color: var(--text-muted); }
    .loading-msg, .empty-msg { font-size: 0.8rem; color: var(--text-muted); }

    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .cancel-dialog {
      background: var(--white); border-radius: var(--radius-lg);
      padding: 1.5rem; width: min(400px, 90vw);
      h4 { margin: 0 0 0.5rem; font-size: 1rem; }
      p { margin: 0 0 0.5rem; font-size: 0.85rem; }
      textarea {
        width: 100%; padding: 0.5rem; border: 1px solid var(--border);
        border-radius: var(--radius); font-family: inherit; font-size: 0.85rem;
        resize: vertical;
      }
    }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.75rem; }
    .btn-cancel {
      padding: 0.5rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white); cursor: pointer;
    }
    .btn-confirm-cancel {
      padding: 0.5rem 1rem; border: none;
      border-radius: var(--radius); background: var(--error, #dc2626);
      color: #fff; cursor: pointer; font-weight: 600;
    }
  `],
})
export class TurnoDetail {
  private turnoSvc = inject(TurnoService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  turno = input.required<Turno | null>();
  estadoCambiado = output<Turno>();
  closed = output<void>();

  confirmAction = signal<{ turno: Turno; estado: TurnoEstado; label: string } | null>(null);
  showCancelDialog = signal(false);
  cancelTurno = signal<Turno | null>(null);
  cancelMotivo = '';

  showHistorial = signal(false);
  loadingHistorial = signal(false);
  historial = signal<HistorialEstadoTurno[]>([]);

  constructor() {
    // Reset historial when turno changes
    effect(() => {
      this.turno();
      this.showHistorial.set(false);
      this.historial.set([]);
    });
  }

  estadoLabel(estado: TurnoEstado): string { return TURNO_ESTADO_LABELS[estado]; }
  estadoColor(estado: TurnoEstado): string { return TURNO_ESTADO_COLORS[estado]; }
  tipoConsultaLabel(tipo: TipoConsulta): string { return TIPO_CONSULTA_LABELS[tipo]; }
  formatTime(dt: string): string { return dt.substring(11, 16); }

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  askConfirm(turno: Turno, estado: TurnoEstado, label: string): void {
    this.confirmAction.set({ turno, estado, label });
  }

  askCancel(turno: Turno): void {
    this.cancelTurno.set(turno);
    this.cancelMotivo = '';
    this.showCancelDialog.set(true);
  }

  doCancelWithMotivo(): void {
    const turno = this.cancelTurno();
    if (!turno) return;
    this.showCancelDialog.set(false);

    this.turnoSvc.cambiarEstado(turno.consultorioId, turno.id, {
      nuevoEstado: 'CANCELADO',
      motivo: this.cancelMotivo || undefined,
    }).subscribe({
      next: (updated) => {
        this.toast.success('Turno cancelado');
        this.estadoCambiado.emit(updated);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  doChangeEstado(): void {
    const action = this.confirmAction();
    if (!action) return;
    this.confirmAction.set(null);

    this.turnoSvc.cambiarEstado(action.turno.consultorioId, action.turno.id, { nuevoEstado: action.estado }).subscribe({
      next: (updated) => {
        this.toast.success(`Turno ${TURNO_ESTADO_LABELS[action.estado].toLowerCase()}`);
        this.estadoCambiado.emit(updated);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  toggleHistorial(): void {
    if (this.showHistorial()) {
      this.showHistorial.set(false);
      return;
    }
    const t = this.turno();
    if (!t) return;

    this.showHistorial.set(true);
    this.loadingHistorial.set(true);
    this.turnoSvc.getHistorial(t.consultorioId, t.id).subscribe({
      next: (data) => {
        this.historial.set(data);
        this.loadingHistorial.set(false);
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        this.loadingHistorial.set(false);
      },
    });
  }
}
