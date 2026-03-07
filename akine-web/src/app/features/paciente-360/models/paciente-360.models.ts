export interface Patient360Header {
  id: string;
  consultorioId: string;
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  domicilio?: string | null;
  nacionalidad?: string | null;
  estadoCivil?: string | null;
  profesion?: string | null;
  obraSocialNombre?: string | null;
  obraSocialPlan?: string | null;
  obraSocialNroAfiliado?: string | null;
  activo: boolean;
  coberturaVigente: boolean;
  coberturaResumen: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient360SummaryKpis {
  proximoTurnoFecha?: string | null;
  proximoTurnoProfesional?: string | null;
  proximoTurnoEstado?: string | null;
  ultimaAtencionFecha?: string | null;
  ultimaAtencionProfesional?: string | null;
  ultimaAtencionResumen?: string | null;
  diagnosticosActivos: number;
  sesionesMes: number;
  coberturaEstado: string;
  saldoPendiente: number;
}

export interface Patient360AlertItem {
  tipo: 'warning' | 'info' | 'error' | string;
  mensaje: string;
  route: string;
}

export interface Patient360ActionItem {
  tipo: string;
  etiqueta: string;
  route: string;
  fechaReferencia?: string | null;
}

export interface Patient360ActivityItem {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string;
  fecha: string;
  route: string;
}

export interface Patient360Summary {
  kpis: Patient360SummaryKpis;
  alertas: Patient360AlertItem[];
  proximasAcciones: Patient360ActionItem[];
  actividadReciente: Patient360ActivityItem[];
}

export interface Patient360ProfessionalOption {
  id: string;
  nombre: string;
}

export interface Patient360ClinicalEvent {
  id: string;
  fecha: string;
  profesionalId?: string | null;
  profesionalNombre?: string | null;
  tipo: string;
  resumen: string;
  detalle: string;
  turnoId?: string | null;
  ultimaModificacion?: string | null;
}

export interface Patient360HistoriaClinica {
  profesionales: Patient360ProfessionalOption[];
  items: Patient360ClinicalEvent[];
  page: number;
  size: number;
  total: number;
}

export interface Patient360Diagnosis {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  profesionalId?: string | null;
  profesionalNombre?: string | null;
  notas?: string | null;
  ultimaAtencionResumen?: string | null;
}

export interface Patient360Diagnosticos {
  totalActivos: number;
  ultimaFechaRegistrada?: string | null;
  items: Patient360Diagnosis[];
  page: number;
  size: number;
  total: number;
}

export interface Patient360AtencionItem {
  id: string;
  fecha: string;
  profesionalId?: string | null;
  profesionalNombre?: string | null;
  consultorioNombre: string;
  boxNombre?: string | null;
  estado: string;
  resumen: string;
  turnoId?: string | null;
}

export interface Patient360Atenciones {
  total: number;
  ultimaAsistencia?: string | null;
  profesionales: Patient360ProfessionalOption[];
  items: Patient360AtencionItem[];
  page: number;
  size: number;
}

export interface Patient360TurnoItem {
  id: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  profesionalId?: string | null;
  profesionalNombre?: string | null;
  boxNombre?: string | null;
  estado: string;
  tipoConsulta?: string | null;
  motivoConsulta?: string | null;
  canalAsignacion?: string | null;
  alerta?: string | null;
}

export interface Patient360Turnos {
  scope: string;
  proximosCount: number;
  historicosCount: number;
  canceladosCount: number;
  profesionales: Patient360ProfessionalOption[];
  items: Patient360TurnoItem[];
  page: number;
  size: number;
  total: number;
}

export interface Patient360ObraSocialOverview {
  obraSocialNombre?: string | null;
  plan?: string | null;
  nroAfiliado?: string | null;
  vigente: boolean;
  fechaVencimiento?: string | null;
  tipoCobertura?: string | null;
  valorCobertura?: number | null;
  tipoCoseguro?: string | null;
  valorCoseguro?: number | null;
  observacionesPlan?: string | null;
}

export interface Patient360ObraSocialCoverage {
  prestacionesSinAutorizacion?: number | null;
  sesionesUsadasMes: number;
  sesionesDisponibles?: number | null;
  autorizacionRequerida: boolean;
  estadoCobertura: string;
}

export interface Patient360AttachmentItem {
  id: string;
  nombre: string;
  tipo: string;
  vigente: boolean;
  fechaCarga?: string | null;
}

export interface Patient360ObraSocial {
  overview: Patient360ObraSocialOverview;
  coverage: Patient360ObraSocialCoverage;
  adjuntos: Patient360AttachmentItem[];
}

export interface Patient360PaymentSummary {
  saldoPendiente: number;
  totalCobrado: number;
  ultimoPagoMonto: number;
  ultimoPagoFecha?: string | null;
  deudaVencida: number;
}

export interface Patient360PaymentItem {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  tipo: string;
  estado: string;
  medioPago?: string | null;
  comprobante?: string | null;
}

export interface Patient360ConciliationItem {
  id: string;
  estado: string;
  detalle: string;
}

export interface Patient360Pagos {
  summary: Patient360PaymentSummary;
  items: Patient360PaymentItem[];
  conciliacion: Patient360ConciliationItem[];
  page: number;
  size: number;
  total: number;
}
