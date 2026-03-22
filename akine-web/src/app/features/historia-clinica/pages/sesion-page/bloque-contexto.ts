import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CasoAtencionSummary,
  HistoriaClinicaOverview,
  HistoriaClinicaTipoAtencion,
  SesionClinicaResponse,
} from '../../models/historia-clinica.models';

@Component({
  selector: 'app-bloque-contexto',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sesion-context" [attr.data-estado]="sesion()?.estado">
      <div class="context-row context-row--primary">
        <div class="context-patient">
          @if (overview()?.paciente; as p) {
            <span class="patient-name">{{ p.apellido }}, {{ p.nombre }}</span>
            <span class="patient-meta">DNI {{ p.dni }}</span>
          }
        </div>
        <div class="context-center">
          <span class="context-chip context-chip--case">{{ tipoLabel(sesion()?.tipoAtencion) }}</span>
          @if (sesion()?.fechaAtencion) {
            <span class="context-chip context-chip--date">{{ sesion()!.fechaAtencion | date: 'dd/MM/yyyy HH:mm' }}</span>
          }
        </div>
        <div class="context-actions">
          @if (editable()) {
            <div class="mode-selector">
              <button
                type="button"
                class="mode-btn"
                [class.mode-btn--active]="selectedMode() === 'quick'"
                (click)="modeChanged.emit('quick')"
              >
                Express
              </button>
              <button
                type="button"
                class="mode-btn"
                [class.mode-btn--active]="selectedMode() === 'full'"
                (click)="modeChanged.emit('full')"
              >
                Completa
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .sesion-context {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--white, #fff);
      border-bottom: 1px solid var(--border, #e2e8f0);
      padding: 6px 16px;
    }
    .context-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .context-row--primary {
      flex-wrap: nowrap;
    }
    .context-patient {
      display: flex;
      align-items: baseline;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .patient-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text, #0f172a);
    }
    .patient-meta {
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
      white-space: nowrap;
    }
    .context-center {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 0 1 auto;
      justify-content: center;
    }
    .context-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
      flex: 0 0 auto;
    }
    .context-chip {
      font-size: 0.74rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #334155;
      white-space: nowrap;
    }
    .context-chip--case {
      background: #ecfeff;
      color: #155e75;
    }
    .context-chip--date {
      color: var(--text-muted, #64748b);
    }

    .mode-selector {
      display: inline-flex;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius, 6px);
      overflow: hidden;
      background: var(--white, #fff);
    }
    .mode-btn {
      padding: 5px 12px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      background: var(--white, #fff);
      border: none;
      color: var(--text-muted, #64748b);
      transition: all 0.15s;
      white-space: nowrap;
    }
    .mode-btn:hover {
      background: #f1f5f9;
      color: var(--text, #0f172a);
    }
    .mode-btn--active {
      background: var(--primary, #0f766e);
      color: #fff;
    }

    @media (max-width: 1100px) {
      .context-row--primary {
        flex-wrap: wrap;
      }
      .context-patient {
        width: 100%;
      }
      .context-center {
        justify-content: flex-start;
      }
      .context-actions {
        margin-left: auto;
      }
    }

    @media (max-width: 760px) {
      .context-row--primary {
        align-items: flex-start;
      }
      .context-patient {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .context-center {
        width: 100%;
      }
      .context-actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  `,
})
export class BloqueContextoComponent {
  readonly sesion = input<SesionClinicaResponse | null>(null);
  readonly overview = input<HistoriaClinicaOverview | null>(null);
  readonly casoActivo = input<CasoAtencionSummary | { descripcion: string } | null>(null);
  readonly sesionNumero = input<number | null>(null);
  readonly sesionesPlanificadas = input<number>(0);
  readonly editable = input(false);
  readonly selectedMode = input<'quick' | 'full'>('quick');
  readonly modeChanged = output<'quick' | 'full'>();

  readonly casoLabel = computed<string | null>(() => {
    const caso = this.casoActivo();
    if (!caso) return null;
    if ('motivoConsulta' in caso) {
      return (caso as CasoAtencionSummary).motivoConsulta
        ?? (caso as CasoAtencionSummary).afeccionPrincipal
        ?? 'Caso en curso';
    }
    return (caso as { descripcion: string }).descripcion ?? null;
  });

  tipoLabel(tipo?: HistoriaClinicaTipoAtencion | null): string {
    const labels: Record<string, string> = {
      EVALUACION: 'Evaluación',
      SEGUIMIENTO: 'Seguimiento',
      TRATAMIENTO: 'Seguimiento',
      INTERCONSULTA: 'Interconsulta',
      OTRO: 'Otro',
    };
    return labels[tipo ?? ''] ?? tipo ?? '';
  }
}
