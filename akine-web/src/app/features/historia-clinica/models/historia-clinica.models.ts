export type HistoriaClinicaSesionEstado = 'BORRADOR' | 'CERRADA' | 'ANULADA';
export type HistoriaClinicaTipoAtencion =
  | 'EVALUACION'
  | 'SEGUIMIENTO'
  | 'TRATAMIENTO'
  | 'INTERCONSULTA'
  | 'OTRO';
export type DiagnosticoClinicoEstado = 'ACTIVO' | 'RESUELTO' | 'DESCARTADO';

export interface HistoriaClinicaProfesionalOption {
  id: string;
  nombre: string;
}

export interface HistoriaClinicaWorkspaceItem {
  sesionId: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteApellido: string;
  pacienteDni: string;
  profesionalId: string;
  profesionalNombre: string;
  fechaAtencion: string;
  estado: HistoriaClinicaSesionEstado;
  tipoAtencion: HistoriaClinicaTipoAtencion;
  resumenClinico: string;
  updatedAt: string;
}

export interface HistoriaClinicaWorkspace {
  profesionales: HistoriaClinicaProfesionalOption[];
  items: HistoriaClinicaWorkspaceItem[];
  page: number;
  size: number;
  total: number;
}

export interface HistoriaClinicaPaciente {
  id: string;
  consultorioId: string;
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  fechaNacimiento?: string | null;
  obraSocialNombre?: string | null;
  obraSocialPlan?: string | null;
  obraSocialNroAfiliado?: string | null;
  activo: boolean;
  diagnosticosActivos: number;
  ultimaSesionFecha?: string | null;
  updatedAt: string;
}

export interface AdjuntoClinicoResponse {
  id: string;
  sesionId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SesionClinicaResponse {
  id: string;
  consultorioId: string;
  pacienteId: string;
  profesionalId: string;
  turnoId?: string | null;
  boxId?: string | null;
  fechaAtencion: string;
  estado: HistoriaClinicaSesionEstado;
  tipoAtencion: HistoriaClinicaTipoAtencion;
  motivoConsulta?: string | null;
  resumenClinico?: string | null;
  subjetivo?: string | null;
  objetivo?: string | null;
  evaluacion?: string | null;
  plan?: string | null;
  origenRegistro: string;
  createdByUserId: string;
  updatedByUserId: string;
  closedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  adjuntos: AdjuntoClinicoResponse[];
}

export interface SesionClinicaRequest {
  profesionalId: string;
  turnoId?: string | null;
  boxId?: string | null;
  fechaAtencion: string;
  tipoAtencion: HistoriaClinicaTipoAtencion;
  motivoConsulta?: string | null;
  resumenClinico?: string | null;
  subjetivo?: string | null;
  objetivo?: string | null;
  evaluacion?: string | null;
  plan?: string | null;
}

export interface DiagnosticoClinicoResponse {
  id: string;
  consultorioId: string;
  pacienteId: string;
  profesionalId: string;
  sesionId?: string | null;
  codigo?: string | null;
  descripcion: string;
  estado: DiagnosticoClinicoEstado;
  fechaInicio: string;
  fechaFin?: string | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticoClinicoRequest {
  profesionalId: string;
  sesionId?: string | null;
  codigo?: string | null;
  descripcion: string;
  fechaInicio: string;
  notas?: string | null;
}

export interface DiagnosticoClinicoEstadoRequest {
  fechaFin: string;
}

export interface HistoriaClinicaWorkspaceQuery {
  pacienteId?: string;
  q?: string;
  profesionalId?: string;
  from?: string;
  to?: string;
  estado?: HistoriaClinicaSesionEstado;
  page?: number;
  size?: number;
}

export interface HistoriaClinicaSesionQuery {
  profesionalId?: string;
  from?: string;
  to?: string;
  estado?: HistoriaClinicaSesionEstado;
  page?: number;
  size?: number;
}

export interface ClinicalDownload {
  filename: string;
  blob: Blob;
}
