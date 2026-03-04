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
  PROGRAMADO: '#2563EB',   // Reservado/Asignado — Info blue
  CONFIRMADO: '#0F766E',   // Primary teal
  EN_ESPERA: '#F59E0B',    // Warning
  EN_CURSO: '#4F46E5',     // En atención — Indigo
  COMPLETADO: '#64748B',   // Finalizado — Muted
  CANCELADO: '#DC2626',    // Error
  AUSENTE: '#DC2626',      // Error
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

/* ── Acción primaria por estado ── */
export interface AccionPrimaria {
  label: string;
  nuevoEstado: TurnoEstado;
  variant: 'success' | 'primary' | 'warning';
}

export const TURNO_ACCION_PRIMARIA: Partial<Record<TurnoEstado, AccionPrimaria>> = {
  PROGRAMADO:  { label: 'Llegó',     nuevoEstado: 'CONFIRMADO', variant: 'success' },
  CONFIRMADO:  { label: 'A sala',    nuevoEstado: 'EN_ESPERA',  variant: 'warning' },
  EN_ESPERA:   { label: 'Iniciar',   nuevoEstado: 'EN_CURSO',   variant: 'primary' },
  EN_CURSO:    { label: 'Finalizar', nuevoEstado: 'COMPLETADO', variant: 'success' },
};

/* ── Resumen del día ── */
export interface DaySummary {
  total: number;
  pendientes: number;   // PROGRAMADO + CONFIRMADO
  enEspera: number;
  enAtencion: number;   // EN_CURSO
  finalizados: number;  // COMPLETADO
  cancelados: number;
  ausentes: number;
}

export function buildDaySummary(turnos: Turno[]): DaySummary {
  const s: DaySummary = { total: 0, pendientes: 0, enEspera: 0, enAtencion: 0, finalizados: 0, cancelados: 0, ausentes: 0 };
  for (const t of turnos) {
    s.total++;
    switch (t.estado) {
      case 'PROGRAMADO': case 'CONFIRMADO': s.pendientes++; break;
      case 'EN_ESPERA': s.enEspera++; break;
      case 'EN_CURSO': s.enAtencion++; break;
      case 'COMPLETADO': s.finalizados++; break;
      case 'CANCELADO': s.cancelados++; break;
      case 'AUSENTE': s.ausentes++; break;
    }
  }
  return s;
}

/* ── Filtro por grupo de estado ── */
export type FilterEstadoGroup = 'TODOS' | 'PENDIENTES' | TurnoEstado;

/* ── Agrupación mañana/tarde ── */
export interface TurnoGroup {
  label: string;
  count: number;
  turnos: Turno[];
}

export function groupTurnosByPeriod(turnos: Turno[]): TurnoGroup[] {
  const manana: Turno[] = [];
  const tarde: Turno[] = [];
  for (const t of turnos) {
    const hour = parseInt(t.fechaHoraInicio.substring(11, 13), 10);
    if (hour < 13) manana.push(t);
    else tarde.push(t);
  }
  const groups: TurnoGroup[] = [];
  if (manana.length) groups.push({ label: 'Mañana', count: manana.length, turnos: manana });
  if (tarde.length) groups.push({ label: 'Tarde', count: tarde.length, turnos: tarde });
  return groups;
}
