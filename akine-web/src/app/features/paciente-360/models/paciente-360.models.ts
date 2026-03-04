// ─── Types ────────────────────────────────────────────────────────────────────

export type ClinicalEventType = 'EVALUACION' | 'SESION' | 'EVOLUCION' | 'ALTA' | 'NOTA';

export const CLINICAL_EVENT_TYPE_LABELS: Record<ClinicalEventType, string> = {
  EVALUACION: 'Evaluación',
  SESION: 'Sesión',
  EVOLUCION: 'Evolución',
  ALTA: 'Alta',
  NOTA: 'Nota',
};

export const CLINICAL_EVENT_TYPE_COLORS: Record<ClinicalEventType, { bg: string; text: string }> = {
  EVALUACION: { bg: '#DCFCE7', text: '#16A34A' },
  SESION: { bg: '#DBEAFE', text: '#2563EB' },
  EVOLUCION: { bg: '#F3E8FF', text: '#7C3AED' },
  ALTA: { bg: '#FEF3C7', text: '#D97706' },
  NOTA: { bg: '#F1F5F9', text: '#64748B' },
};

export type DiagnosisStatus = 'ACTIVO' | 'RESUELTO';

export const DIAGNOSIS_STATUS_LABELS: Record<DiagnosisStatus, string> = {
  ACTIVO: 'Activo',
  RESUELTO: 'Resuelto',
};

export type SessionStatus = 'REALIZADA' | 'CANCELADA' | 'PENDIENTE';

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
  PENDIENTE: 'Pendiente',
};

export type AttachmentType = 'ADMINISTRATIVO' | 'CLINICO';

export type PaymentType = 'COBRO' | 'PAGO';
export type PaymentStatus = 'PENDIENTE' | 'COMPLETADO';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ClinicalEvent {
  id: string;
  pacienteId: string;
  fecha: string;
  profesionalNombre: string;
  tipo: ClinicalEventType;
  resumen: string;
  detalle: string;
  adjuntos: Attachment[];
}

export interface Diagnosis {
  id: string;
  pacienteId: string;
  nombre: string;
  estado: DiagnosisStatus;
  fechaInicio: string;
  fechaFin?: string;
  notas?: string;
}

export interface Session {
  id: string;
  pacienteId: string;
  fecha: string;
  profesionalNombre: string;
  consultorioNombre: string;
  boxNombre?: string;
  estado: SessionStatus;
  resumen?: string;
  turnoId?: string;
}

export interface Insurance {
  obraSocialNombre: string;
  plan: string;
  nroAfiliado: string;
  vigente: boolean;
  fechaVencimiento?: string;
}

export interface Attachment {
  id: string;
  nombre: string;
  tipo: AttachmentType;
  url: string;
  fechaCarga: string;
  vigente: boolean;
}

export interface Payment {
  id: string;
  pacienteId: string;
  fecha: string;
  concepto: string;
  monto: number;
  tipo: PaymentType;
  estado: PaymentStatus;
}

export interface PatientAlert {
  id: string;
  tipo: 'WARNING' | 'ERROR' | 'INFO';
  mensaje: string;
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

export interface PatientSummary {
  proximoTurnoId?: string;
  proximoTurnoFecha?: string;
  proximoTurnoProfesional?: string;
  proximoTurnoEstado?: string;
  ultimaAtencionId?: string;
  ultimaAtencionFecha?: string;
  ultimaAtencionProfesional?: string;
  ultimaAtencionResumen?: string;
  diagnosticosActivos: Diagnosis[];
  alertas: PatientAlert[];
}
