export type HistoriaClinicaSesionEstado = 'BORRADOR' | 'CERRADA' | 'ANULADA';
export type HistoriaClinicaTipoAtencion =
  | 'EVALUACION'
  | 'SEGUIMIENTO'
  | 'TRATAMIENTO'
  | 'INTERCONSULTA'
  | 'OTRO';
export type DiagnosticoClinicoEstado = 'ACTIVO' | 'RESUELTO' | 'DESCARTADO';
export type AtencionInicialTipoIngreso = 'CON_PRESCRIPCION' | 'CONSULTA_PARTICULAR';
export type PlanTratamientoCaracter = 'PARCIAL' | 'DEFINITIVO' | 'CRONICO';

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

export interface HistoriaClinicaLegajoStatus {
  exists: boolean;
  legajoId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface HistoriaClinicaAntecedenteItem {
  id?: string | null;
  categoryCode?: string | null;
  catalogItemCode?: string | null;
  label: string;
  valueText?: string | null;
  critical: boolean;
  notes?: string | null;
  updatedAt?: string | null;
}

export interface HistoriaClinicaActiveCaseSummary {
  diagnosticoId: string;
  profesionalId: string;
  profesionalNombre: string;
  codigo?: string | null;
  descripcion: string;
  estado: DiagnosticoClinicoEstado;
  fechaInicio: string;
  cantidadSesiones: number;
  ultimaEvolucionResumen?: string | null;
}

export interface HistoriaClinicaSesionSummary {
  sesionId: string;
  profesionalId: string;
  profesionalNombre: string;
  fechaAtencion: string;
  estado: HistoriaClinicaSesionEstado;
  tipoAtencion: HistoriaClinicaTipoAtencion;
  resumen: string;
}

export type HistoriaClinicaTimelineEventType =
  | 'HC_CREATED'
  | 'ANTECEDENTE_UPDATED'
  | 'CASO_OPENED'
  | 'CASO_CLOSED'
  | 'SESION'
  | 'ADJUNTO'
  | 'ATENCION_INICIAL'
  | 'PLAN_TERAPEUTICO';

export interface HistoriaClinicaTimelineEvent {
  eventId: string;
  type: HistoriaClinicaTimelineEventType;
  occurredAt: string;
  profesionalId?: string | null;
  profesionalNombre?: string | null;
  title: string;
  summary: string;
  statusLabel?: string | null;
  relatedEntityId?: string | null;
}

export interface HistoriaClinicaOverview {
  paciente: HistoriaClinicaPaciente;
  legajo: HistoriaClinicaLegajoStatus;
  alertasClinicas: string[];
  antecedentesRelevantes: HistoriaClinicaAntecedenteItem[];
  casosActivos: HistoriaClinicaActiveCaseSummary[];
  casosAtencionActivos: CasoAtencionSummary[];
  ultimaSesion?: HistoriaClinicaSesionSummary | null;
  adjuntosRecientes: AdjuntoClinicoResponse[];
  profesionalHabitual?: string | null;
  atencionInicial?: AtencionInicialSummary | null;
  evaluacionInicial?: AtencionInicialEvaluacionSummary | null;
  planTerapeuticoActivo?: PlanTerapeuticoSummary | null;
}

export interface AdjuntoClinicoResponse {
  id: string;
  sesionId?: string | null;
  atencionInicialId?: string | null;
  casoAtencionId?: string | null;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AtencionInicialSummary {
  id: string;
  profesionalId: string;
  profesionalNombre: string;
  fechaHora: string;
  tipoIngreso: AtencionInicialTipoIngreso;
  motivoConsultaBreve?: string | null;
  sintomasPrincipales?: string | null;
  tiempoEvolucion?: string | null;
  observaciones?: string | null;
  especialidadDerivante?: string | null;
  profesionalDerivante?: string | null;
  fechaPrescripcion?: string | null;
  diagnosticoCodigo?: string | null;
  diagnosticoNombre?: string | null;
  diagnosticoTipo?: string | null;
  diagnosticoCategoriaCodigo?: string | null;
  diagnosticoCategoriaNombre?: string | null;
  diagnosticoSubcategoria?: string | null;
  diagnosticoRegionAnatomica?: string | null;
  diagnosticoObservacion?: string | null;
  observacionesPrescripcion?: string | null;
  resumenClinicoInicial?: string | null;
  hallazgosRelevantes?: string | null;
}

export interface AtencionInicialEvaluacionSummary {
  id: string;
  atencionInicialId: string;
  peso?: number | null;
  altura?: number | null;
  imc?: number | null;
  presionArterial?: string | null;
  frecuenciaCardiaca?: number | null;
  saturacion?: number | null;
  temperatura?: number | null;
  observaciones?: string | null;
}

export interface PlanTratamientoDetalleSummary {
  id: string;
  tratamientoId: string;
  tratamientoNombre: string;
  tratamientoCategoriaCodigo?: string | null;
  tratamientoCategoriaNombre?: string | null;
  tratamientoTipo?: string | null;
  tratamientoRequiereAutorizacion: boolean;
  tratamientoRequierePrescripcionMedica: boolean;
  tratamientoDuracionSugeridaMinutos?: number | null;
  cantidadSesiones: number;
  frecuenciaSugerida?: string | null;
  caracterCaso: PlanTratamientoCaracter;
  fechaEstimadaInicio?: string | null;
  requiereAutorizacion: boolean;
  observaciones?: string | null;
  observacionesAdministrativas?: string | null;
}

export interface PlanTerapeuticoSummary {
  id: string;
  atencionInicialId: string;
  profesionalId: string;
  profesionalNombre: string;
  estado: string;
  observacionesGenerales?: string | null;
  tratamientos: PlanTratamientoDetalleSummary[];
}

export interface SesionClinicaResponse {
  id: string;
  consultorioId: string;
  pacienteId: string;
  profesionalId: string;
  turnoId?: string | null;
  casoAtencionId?: string | null;
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
  evaluacionEstructurada?: SesionEvaluacionDTO | null;
  examenFisico?: SesionExamenFisicoDTO | null;
  intervenciones?: SesionIntervencionDTO[] | null;
}

export interface SesionClinicaRequest {
  profesionalId: string;
  turnoId?: string | null;
  casoAtencionId?: string | null;
  boxId?: string | null;
  fechaAtencion: string;
  tipoAtencion: HistoriaClinicaTipoAtencion;
  motivoConsulta?: string | null;
  resumenClinico?: string | null;
  subjetivo?: string | null;
  objetivo?: string | null;
  evaluacion?: string | null;
  plan?: string | null;
  evaluacionEstructurada?: SesionEvaluacionDTO | null;
  examenFisico?: SesionExamenFisicoDTO | null;
  intervenciones?: SesionIntervencionDTO[] | null;
}

export interface DiagnosticoClinicoResponse {
  id: string;
  consultorioId: string;
  pacienteId: string;
  profesionalId: string;
  sesionId?: string | null;
  codigo?: string | null;
  descripcion: string;
  diagnosticoTipo?: string | null;
  diagnosticoCategoriaCodigo?: string | null;
  diagnosticoCategoriaNombre?: string | null;
  diagnosticoSubcategoria?: string | null;
  diagnosticoRegionAnatomica?: string | null;
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
  diagnosticoCodigo: string;
  fechaInicio: string;
  notas?: string | null;
}

export interface DiagnosticoClinicoEstadoRequest {
  fechaFin: string;
}

export interface CreateHistoriaClinicaRequest {
  profesionalId?: string | null;
  fechaAtencion?: string | null;
  motivoConsulta?: string | null;
  resumenClinico?: string | null;
  subjetivo?: string | null;
  objetivo?: string | null;
  evaluacion?: string | null;
  plan?: string | null;
  casoCodigo?: string | null;
  casoDescripcion?: string | null;
  casoFechaInicio?: string | null;
  casoNotas?: string | null;
  antecedentes?: HistoriaClinicaAntecedenteItem[];
}

export interface AtencionInicialEvaluacionRequest {
  peso?: number | null;
  altura?: number | null;
  imc?: number | null;
  presionArterial?: string | null;
  frecuenciaCardiaca?: number | null;
  saturacion?: number | null;
  temperatura?: number | null;
  observaciones?: string | null;
}

export interface PlanTratamientoDetalleRequest {
  tratamientoId: string;
  cantidadSesiones: number;
  frecuenciaSugerida?: string | null;
  caracterCaso: PlanTratamientoCaracter;
  fechaEstimadaInicio?: string | null;
  requiereAutorizacion: boolean;
  observaciones?: string | null;
  observacionesAdministrativas?: string | null;
}

export interface CreateAtencionInicialRequest {
  profesionalId: string;
  fechaHora: string;
  tipoIngreso: AtencionInicialTipoIngreso;
  motivoConsultaBreve?: string | null;
  sintomasPrincipales?: string | null;
  tiempoEvolucion?: string | null;
  observaciones?: string | null;
  especialidadDerivante?: string | null;
  profesionalDerivante?: string | null;
  fechaPrescripcion?: string | null;
  diagnosticoCodigo?: string | null;
  diagnosticoObservacion?: string | null;
  observacionesPrescripcion?: string | null;
  evaluacion?: AtencionInicialEvaluacionRequest | null;
  resumenClinicoInicial?: string | null;
  hallazgosRelevantes?: string | null;
  antecedentes?: HistoriaClinicaAntecedenteItem[];
  planObservacionesGenerales?: string | null;
  tratamientos: PlanTratamientoDetalleRequest[];
}

export interface HistoriaClinicaAntecedentesUpdateRequest {
  antecedentes: HistoriaClinicaAntecedenteItem[];
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

// ── Structured Session Data (Blocks B/C/D/E) ──────────────────────────

export type DolorTipo = 'PUNZANTE' | 'QUEMANTE' | 'DIFUSO' | 'MECANICO' | 'OTRO';
export type DolorComportamiento = 'MEJORA' | 'EMPEORA' | 'CONSTANTE' | 'INTERMITENTE';
export type EvolucionDesdeAnterior = 'MEJOR' | 'IGUAL' | 'PEOR';
export type RespuestaPaciente = 'FAVORABLE' | 'SIN_CAMBIOS' | 'REGULAR' | 'EMPEORA' | 'PARCIAL';
export type Tolerancia = 'BUENA' | 'REGULAR' | 'MALA';
export type ProximaConducta =
  | 'CONTINUAR'
  | 'AJUSTAR'
  | 'REEVALUAR'
  | 'ALTA'
  | 'DERIVAR'
  | 'SOLICITAR_ESTUDIO'
  | 'SUSPENDER';

/** Block B + E — Evaluación clínica + Resultado */
export interface SesionEvaluacionDTO {
  dolorIntensidad?: number | null;
  dolorZona?: string | null;
  dolorLateralidad?: string | null;
  dolorTipo?: DolorTipo | null;
  dolorComportamiento?: DolorComportamiento | null;
  evolucionEstado?: EvolucionDesdeAnterior | null;
  evolucionNota?: string | null;
  objetivoSesion?: string | null;
  limitacionFuncional?: string | null;
  respuestaPaciente?: RespuestaPaciente | null;
  tolerancia?: Tolerancia | null;
  indicacionesDomiciliarias?: string | null;
  proximaConducta?: ProximaConducta | null;
}

/** Block C — Examen físico */
export interface SesionExamenFisicoDTO {
  rangoMovimientoJson?: string | null;
  fuerzaMuscularJson?: string | null;
  funcionalidadNota?: string | null;
  marchaBalanceNota?: string | null;
  signosInflamatorios?: string | null;
  observacionesNeuroResp?: string | null;
  testsMedidasJson?: string | null;
}

/** Block D — Intervención / tratamiento aplicado */
export interface SesionIntervencionDTO {
  tratamientoId?: string | null;
  tratamientoNombre: string;
  tecnica?: string | null;
  zona?: string | null;
  parametrosJson?: string | null;
  duracionMinutos?: number | null;
  profesionalId?: string | null;
  observaciones?: string | null;
  orderIndex: number;
}

// ── CasoAtencion ──────────────────────────────────────────────────────

export type CasoAtencionEstado =
  | 'BORRADOR'
  | 'EN_EVALUACION'
  | 'ACTIVO'
  | 'EN_TRATAMIENTO'
  | 'EN_PAUSA'
  | 'CERRADO_ALTA'
  | 'CERRADO_ABANDONO'
  | 'CERRADO_DERIVACION';

export interface CasoAtencionSummary {
  id: string;
  legajoId: string;
  consultorioId: string;
  pacienteId: string;
  profesionalResponsableId?: string | null;
  profesionalResponsableNombre?: string | null;
  tipoOrigen: string;
  fechaApertura: string;
  motivoConsulta?: string | null;
  diagnosticoMedico?: string | null;
  afeccionPrincipal?: string | null;
  estado: CasoAtencionEstado;
  prioridad: string;
  cantidadSesiones: number;
  cantidadPlanes: number;
}

export interface CasoAtencionDetalle extends CasoAtencionSummary {
  diagnosticoFuncional?: string | null;
  coberturaId?: string | null;
  atencionInicialId?: string | null;
  adjuntos?: AdjuntoClinicoResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCasoAtencionRequest {
  pacienteId?: string | null;
  profesionalResponsableId?: string | null;
  tipoOrigen?: string | null;
  motivoConsulta?: string | null;
  diagnosticoMedico?: string | null;
  diagnosticoFuncional?: string | null;
  afeccionPrincipal?: string | null;
  prioridad?: string | null;
}

export interface UpdateCasoAtencionRequest {
  profesionalResponsableId?: string | null;
  motivoConsulta?: string | null;
  diagnosticoMedico?: string | null;
  diagnosticoFuncional?: string | null;
  afeccionPrincipal?: string | null;
  prioridad?: string | null;
}

export interface CambiarEstadoCasoAtencionRequest {
  nuevoEstado: CasoAtencionEstado;
}
