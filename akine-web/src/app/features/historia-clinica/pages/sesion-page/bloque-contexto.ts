import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HistoriaClinicaOverview,
  HistoriaClinicaSesionEstado,
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
      <div class="context-row">
        <div class="context-patient">
          @if (overview()?.paciente; as p) {
            <span class="patient-name">{{ p.apellido }}, {{ p.nombre }}</span>
            <span class="patient-meta">DNI {{ p.dni }}</span>
            @if (p.fechaNacimiento) {
              <span class="patient-meta">{{ calcEdad(p.fechaNacimiento) }} años</span>
            }
            @if (p.obraSocialNombre) {
              <span class="patient-badge">{{ p.obraSocialNombre }}</span>
            }
          }
        </div>
        <div class="context-actions">
          <span class="estado-badge" [attr.data-estado]="sesion()?.estado">
            {{ sesion()?.estado }}
          </span>
          @if (sesionNumero()) {
            <span class="sesion-num">Sesión #{{ sesionNumero() }}</span>
          }
        </div>
      </div>

      <div class="context-row context-row--secondary">
        @if (casoActivo(); as caso) {
          <span class="context-chip context-chip--case">{{ caso.descripcion }}</span>
        }
        <span class="context-chip">{{ tipoLabel(sesion()?.tipoAtencion) }}</span>
        @if (sesion()?.fechaAtencion) {
          <span class="context-chip context-chip--date">{{ sesion()!.fechaAtencion | date: 'dd/MM/yyyy HH:mm' }}</span>
        }
        @for (alerta of overview()?.alertasClinicas ?? []; track alerta) {
          <span class="context-chip context-chip--alert">{{ alerta }}</span>
        }
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
      padding: 12px 24px;
    }
    .context-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .context-row--secondary {
      margin-top: 6px;
    }
    .context-patient {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex: 1;
    }
    .patient-name {
      font-weight: 600;
      font-size: 1.05rem;
      color: var(--text, #0f172a);
    }
    .patient-meta {
      font-size: 0.82rem;
      color: var(--text-muted, #64748b);
    }
    .patient-badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--primary, #0f766e);
      color: #fff;
    }
    .context-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .estado-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .estado-badge[data-estado='BORRADOR'] {
      background: #f1f5f9;
      color: #475569;
    }
    .estado-badge[data-estado='CERRADA'] {
      background: #dcfce7;
      color: #166534;
    }
    .estado-badge[data-estado='ANULADA'] {
      background: #fef2f2;
      color: #991b1b;
    }
    .sesion-num {
      font-size: 0.82rem;
      color: var(--text-muted, #64748b);
    }
    .context-chip {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #334155;
    }
    .context-chip--case {
      background: #ede9fe;
      color: #5b21b6;
    }
    .context-chip--alert {
      background: #fef3c7;
      color: #92400e;
    }
    .context-chip--date {
      color: var(--text-muted, #64748b);
    }
  `,
})
export class BloqueContextoComponent {
  readonly sesion = input<SesionClinicaResponse | null>(null);
  readonly overview = input<HistoriaClinicaOverview | null>(null);
  readonly casoActivo = input<{ descripcion: string } | null>(null);
  readonly sesionNumero = input<number | null>(null);

  calcEdad(fechaNac: string): number {
    const birth = new Date(fechaNac);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  tipoLabel(tipo?: HistoriaClinicaTipoAtencion | null): string {
    const labels: Record<string, string> = {
      EVALUACION: 'Evaluación',
      SEGUIMIENTO: 'Seguimiento',
      TRATAMIENTO: 'Tratamiento',
      INTERCONSULTA: 'Interconsulta',
      OTRO: 'Otro',
    };
    return labels[tipo ?? ''] ?? tipo ?? '';
  }
}
