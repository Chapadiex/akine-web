export type TurnoEstado = 'PROGRAMADO' | 'CONFIRMADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO' | 'AUSENTE';

export const TURNO_ESTADO_LABELS: Record<TurnoEstado, string> = {
  PROGRAMADO: 'Programado',
  CONFIRMADO: 'Confirmado',
  EN_CURSO: 'En curso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
  AUSENTE: 'Ausente',
};

export const TURNO_ESTADO_COLORS: Record<TurnoEstado, string> = {
  PROGRAMADO: '#3b82f6',
  CONFIRMADO: '#22c55e',
  EN_CURSO: '#f59e0b',
  COMPLETADO: '#6b7280',
  CANCELADO: '#ef4444',
  AUSENTE: '#a855f7',
};

export interface Turno {
  id: string;
  consultorioId: string;
  profesionalId: string;
  profesionalNombre: string | null;
  profesionalApellido: string | null;
  boxId: string | null;
  boxNombre: string | null;
  pacienteId: string | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  duracionMinutos: number;
  estado: TurnoEstado;
  motivoConsulta: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTurnoRequest {
  profesionalId: string;
  boxId?: string;
  pacienteId?: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  motivoConsulta?: string;
  notas?: string;
}

export interface ReprogramarRequest {
  nuevaFechaHoraInicio: string;
}

export interface CambiarEstadoRequest {
  nuevoEstado: TurnoEstado;
}

export interface SlotDisponible {
  inicio: string;
  fin: string;
}

export interface TurnoFilters {
  from: string;
  to: string;
  profesionalId?: string;
  boxId?: string;
  estado?: TurnoEstado;
}
