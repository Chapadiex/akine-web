export type TurnoEstado =
  | 'PROGRAMADO'
  | 'CONFIRMADO'
  | 'EN_ESPERA'
  | 'EN_CURSO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'AUSENTE';

export const TURNO_ESTADO_LABELS: Record<TurnoEstado, string> = {
  PROGRAMADO: 'Programado',
  CONFIRMADO: 'Llegó',
  EN_ESPERA: 'En espera',
  EN_CURSO: 'En atención',
  COMPLETADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  AUSENTE: 'Ausente',
};

export const TURNO_ESTADO_COLORS: Record<TurnoEstado, string> = {
  PROGRAMADO: '#2563EB',
  CONFIRMADO: '#0F766E',
  EN_ESPERA: '#F59E0B',
  EN_CURSO: '#4F46E5',
  COMPLETADO: '#64748B',
  CANCELADO: '#DC2626',
  AUSENTE: '#DC2626',
};

export type TipoConsulta = 'PARTICULAR' | 'OBRA_SOCIAL';

export const TIPO_CONSULTA_LABELS: Record<TipoConsulta, string> = {
  PARTICULAR: 'Particular',
  OBRA_SOCIAL: 'Obra Social',
};

export interface Turno {
  id: string;
  consultorioId: string;
  profesionalId: string | null;
  profesionalNombre: string | null;
  profesionalApellido: string | null;
  boxId: string | null;
  boxNombre: string | null;
  pacienteId: string | null;
  pacienteNombre: string | null;
  pacienteApellido: string | null;
  pacienteDni: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  fechaHoraInicioReal: string | null;
  fechaHoraFinReal: string | null;
  duracionMinutos: number;
  estado: TurnoEstado;
  tipoConsulta: TipoConsulta | null;
  motivoConsulta: string | null;
  notas: string | null;
  telefonoContacto: string | null;
  creadoPorUserId: string | null;
  motivoCancelacion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTurnoRequest {
  profesionalId?: string;
  boxId?: string;
  pacienteId?: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  motivoConsulta?: string;
  notas?: string;
  tipoConsulta?: TipoConsulta;
  telefonoContacto?: string;
}

export interface ReprogramarRequest {
  nuevaFechaHoraInicio: string;
}

export interface CambiarEstadoRequest {
  nuevoEstado: TurnoEstado;
  motivo?: string;
}

export interface HistorialEstadoTurno {
  id: string;
  turnoId: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  cambiadoPorUserEmail: string | null;
  motivo: string | null;
  createdAt: string;
}

export interface Feriado {
  id: string;
  consultorioId: string;
  fecha: string;
  descripcion: string | null;
  createdAt: string;
}

export interface CreateFeriadoRequest {
  fecha: string;
  descripcion?: string;
}

export interface SlotDisponible {
  inicio: string;
  fin: string;
}

export interface BoxDisponibilidad {
  id: string;
  nombre: string;
  disponible: boolean;
  capacidadTotal: number | null;
  capacidadUsada: number | null;
}

export interface TurnoFilters {
  from: string;
  to: string;
  profesionalId?: string;
  boxId?: string;
  estado?: TurnoEstado;
}

export interface AccionPrimaria {
  label: string;
  nuevoEstado: TurnoEstado;
  variant: 'success' | 'primary' | 'warning';
}

export const TURNO_ACCION_PRIMARIA: Partial<Record<TurnoEstado, AccionPrimaria>> = {
  PROGRAMADO: { label: 'Llegó', nuevoEstado: 'CONFIRMADO', variant: 'success' },
  CONFIRMADO: { label: 'Iniciar', nuevoEstado: 'EN_CURSO', variant: 'primary' },
  EN_ESPERA: { label: 'Iniciar', nuevoEstado: 'EN_CURSO', variant: 'primary' },
  EN_CURSO: { label: 'Finalizar', nuevoEstado: 'COMPLETADO', variant: 'success' },
};

export interface DaySummary {
  total: number;
  pendientes: number;
  enEspera: number;
  enAtencion: number;
  finalizados: number;
  cancelados: number;
  ausentes: number;
}

export function buildDaySummary(turnos: Turno[]): DaySummary {
  const summary: DaySummary = {
    total: 0,
    pendientes: 0,
    enEspera: 0,
    enAtencion: 0,
    finalizados: 0,
    cancelados: 0,
    ausentes: 0,
  };

  for (const turno of turnos) {
    summary.total++;
    switch (turno.estado) {
      case 'PROGRAMADO':
      case 'CONFIRMADO':
        summary.pendientes++;
        break;
      case 'EN_ESPERA':
        summary.enEspera++;
        break;
      case 'EN_CURSO':
        summary.enAtencion++;
        break;
      case 'COMPLETADO':
        summary.finalizados++;
        break;
      case 'CANCELADO':
        summary.cancelados++;
        break;
      case 'AUSENTE':
        summary.ausentes++;
        break;
    }
  }

  return summary;
}

export type FilterEstadoGroup = 'TODOS' | 'PENDIENTES' | TurnoEstado;

export interface TurnoGroup {
  label: string;
  count: number;
  turnos: Turno[];
}

export function groupTurnosByPeriod(turnos: Turno[]): TurnoGroup[] {
  const manana: Turno[] = [];
  const tarde: Turno[] = [];

  for (const turno of turnos) {
    const hour = parseInt(turno.fechaHoraInicio.substring(11, 13), 10);
    if (hour < 13) {
      manana.push(turno);
    } else {
      tarde.push(turno);
    }
  }

  const groups: TurnoGroup[] = [];
  if (manana.length) {
    groups.push({ label: 'Mañana', count: manana.length, turnos: manana });
  }
  if (tarde.length) {
    groups.push({ label: 'Tarde', count: tarde.length, turnos: tarde });
  }
  return groups;
}
