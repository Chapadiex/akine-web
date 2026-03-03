export type TurnoEstado = 'PROGRAMADO' | 'CONFIRMADO' | 'EN_ESPERA' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO' | 'AUSENTE';

export const TURNO_ESTADO_LABELS: Record<TurnoEstado, string> = {
  PROGRAMADO: 'Programado',
  CONFIRMADO: 'Confirmado',
  EN_ESPERA: 'En espera',
  EN_CURSO: 'En curso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
  AUSENTE: 'Ausente',
};

export const TURNO_ESTADO_COLORS: Record<TurnoEstado, string> = {
  PROGRAMADO: '#3b82f6',
  CONFIRMADO: '#22c55e',
  EN_ESPERA: '#f97316',
  EN_CURSO: '#f59e0b',
  COMPLETADO: '#6b7280',
  CANCELADO: '#ef4444',
  AUSENTE: '#a855f7',
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

export interface TurnoFilters {
  from: string;
  to: string;
  profesionalId?: string;
  boxId?: string;
  estado?: TurnoEstado;
}
