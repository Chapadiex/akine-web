// Financiadores y planes (catálogo de obras sociales)
export interface FinanciadorSalud {
  id: string;
  nombre: string;
  nombreCorto?: string;
  codigoExterno?: string;
  activo?: boolean;
}

export interface PlanFinanciador {
  id: string;
  financiadorId: string;
  nombrePlan: string;
  activo?: boolean;
}

export type EstadoConvenio = 'vigente' | 'por-vencer' | 'vencido' | 'sin-fechas';

export type ModalidadPago = 'PRESTACION' | 'MODULO' | 'CAPITA';

export type ModoFacturacion = 'INDIVIDUAL' | 'AGRUPADO';

export type UnidadFacturacion = 'SESION' | 'PRACTICA' | 'MODULO';

export enum EstadoFacturacion {
  PENDIENTE = 'PENDIENTE',
  LISTA_PARA_PRESENTAR = 'LISTA_PARA_PRESENTAR',
  PRESENTADA = 'PRESENTADA',
  LIQUIDADA = 'LIQUIDADA',
  DEBITADA = 'DEBITADA',
  ANULADA = 'ANULADA'
}

export enum EstadoLote {
  BORRADOR = 'BORRADOR',
  CERRADO = 'CERRADO',
  PRESENTADO = 'PRESENTADO',
  LIQUIDADO = 'LIQUIDADO',
  ANULADO = 'ANULADO'
}

export enum EstadoConciliacion {
  PENDIENTE = 'PENDIENTE',
  PARCIAL = 'PARCIAL',
  CONCILIADO = 'CONCILIADO'
}

export interface ConvenioFinanciador {
  id?: string;
  financiadorId: string;
  consultorioId?: string;
  planId?: string;
  nombre: string;
  modalidadPago: ModalidadPago;
  modoFacturacion?: ModoFacturacion;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  diaCierre?: number;
  requiereAutorizacion?: boolean;
  requiereOrden?: boolean;
  cantidadSesionesAutorizadas?: number;
  activo?: boolean;
}

export interface ConvenioFinanciadorRequest {
  financiadorId: string;
  consultorioId: string;
  planId?: string;
  nombre: string;
  modalidadPago: ModalidadPago;
  modoFacturacion?: ModoFacturacion;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  diaCierre?: number;
  requiereAutorizacion?: boolean;
  requiereOrden?: boolean;
  cantidadSesionesAutorizadas?: number;
  activo?: boolean;
}

export interface PrestacionArancelable {
  id?: string;
  codigoInterno: string;
  nombre: string;
  unidadFacturacion: UnidadFacturacion;
  activo?: boolean;
}

export interface ConvenioPrestacionValor {
  id?: string;
  convenioId: string;
  planId?: string;
  prestacionId: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  importeBase: number;
  importeCopago?: number;
  copajoPorcentaje?: number;
  coseguroImporte?: number;
  topeCobertura?: number;
  activo?: boolean;
}

export interface ConvenioPrestacionValorRequest {
  convenioId: string;
  planId?: string;
  prestacionId: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  importeBase: number;
  importeCopago?: number;
  copajoPorcentaje?: number;
  coseguroImporte?: number;
  topeCobertura?: number;
  activo?: boolean;
}

export interface AtencionFacturable {
  id?: string;
  atencionId: string;
  pacienteId: string;
  convenioId: string;
  prestacionId: string;
  importeUnitarioSnapshot: number;
  importeTotalSnapshot: number;
  importeCopagoSnapshot: number;
  estadoFacturacion: EstadoFacturacion;
  facturable: boolean;
  observaciones?: string;
}

export interface LotePresentacion {
  id?: string;
  financiadorId: string;
  convenioId: string;
  periodo: string;
  fechaPresentacion?: string;
  importeNetoPresentado: number;
  estadoLote: EstadoLote;
  observaciones?: string;
}

export interface ConciliacionAtencion {
  atencionId: string;
  pacienteNombre: string;
  financiadorNombre: string;
  prestacionNombre: string;
  importeSnapshot: number;
  importePresentado: number;
  importeLiquidado: number;
  importePagado: number;
  diferencia: number;
  estadoFinal: string;
}

// ─── Fase 4: Circuito Obra Social ────────────────────────────────────────────

export type EstadoLoteOs = 'BORRADOR' | 'CERRADO' | 'PRESENTADO' | 'LIQUIDADO' | 'ANULADO';

export interface LoteFacturacionOsDetalle {
  id: string;
  loteId: string;
  liquidacionSesionId: string;
  sesionId: string;
  pacienteId: string;
  importeOs: number;
  observaciones?: string;
  createdAt: string;
}

export interface LoteFacturacionOs {
  id: string;
  consultorioId: string;
  financiadorId: string;
  planId?: string;
  convenioId?: string;
  periodo: string;
  estado: EstadoLoteOs;
  cantidadSesiones: number;
  importeTotalOs: number;
  importeNeto: number;
  observaciones?: string;
  cerradoEn?: string;
  cerradoPor?: string;
  presentadoEn?: string;
  creadoPor: string;
  detalles?: LoteFacturacionOsDetalle[];
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export interface GenerarLoteOsRequest {
  financiadorId: string;
  planId?: string;
  periodo: string;
}

export interface PagoObraSocial {
  id: string;
  consultorioId: string;
  loteId: string;
  financiadorId: string;
  importeEsperado: number;
  importeRecibido: number;
  diferencia: number;
  fechaNotificacion: string;
  fechaImputacion?: string;
  cajaDiariaId?: string;
  imputadoPor?: string;
  imputadoEn?: string;
  observaciones?: string;
  registradoPor: string;
  createdAt: string;
  version: number;
}

export interface RegistrarPagoOsRequest {
  loteId: string;
  importeRecibido: number;
  fechaNotificacion: string;
  observaciones?: string;
}

export interface ImputarPagoOsRequest {
  cajaDiariaId: string;
}

// ─── Módulo Convenios (plan definitivo) ──────────────────────────────────────

export type ModalidadConvenio = 'POR_PRESTACION' | 'POR_SESION' | 'CAPITA';
export type ConvenioVersionEstado = 'VIGENTE' | 'CERRADA' | 'INACTIVA';
export type CoseguroTipo = 'NINGUNO' | 'FIJO' | 'PORCENTAJE';
export type ModalidadPrestacion = 'CONSULTORIO' | 'DOMICILIO' | 'COMBINADO';

export interface Prestacion {
  id: string;
  codigoNomenclador: string;
  nombre: string;
  modalidad: ModalidadPrestacion;
  esModulo: boolean;
  codigosIncluidos?: string;
  requiereAutBase: boolean;
  activa: boolean;
}

export interface ArancelResumen {
  codigoNomenclador: string;
  nombrePrestacion: string;
  importeTotal: number;
}

export interface Arancel {
  id: string;
  convenioVersionId: string;
  prestacionId: string;
  prestacionCodigo: string;
  prestacionNombre: string;
  importeOs: number;
  coseguroTipo: CoseguroTipo;
  coseguroValor?: number;
  importeTotal: number;
  sesionesMesMax?: number;
  sesionesAnioMax?: number;
  requiereAutOverride?: boolean;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  activo: boolean;
}

export interface ConvenioVersion {
  id: string;
  convenioId: string;
  versionNum: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  estado: ConvenioVersionEstado;
  motivoCierre?: string;
  creadoAt: string;
  cantidadLotes: number;
  aranceles?: Arancel[];
}

export interface Convenio {
  id: string;
  consultorioId: string;
  financiadorId: string;
  financiadorNombre: string;
  financiadorSigla?: string;
  plan?: string;
  siglaDisplay: string;
  modalidad: ModalidadConvenio;
  diaCierre?: number;
  requiereAut: boolean;
  requiereOrden: boolean;
  versionActual?: ConvenioVersion;
  arancelesResumen?: ArancelResumen[];
}

export interface NuevoArancelRequest {
  prestacionId: string;
  importeOs: number;
  coseguroTipo: CoseguroTipo;
  coseguroValor?: number;
  sesionesMesMax?: number;
  sesionesAnioMax?: number;
  requiereAutOverride?: boolean;
  vigenciaDesde: string;
  vigenciaHasta?: string;
}

export interface NuevoConvenioRequest {
  financiadorId: string;
  plan?: string;
  modalidad: ModalidadConvenio;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  diaCierre?: number;
  requiereAut: boolean;
  requiereOrden: boolean;
  aranceles?: NuevoArancelRequest[];
}

export interface ActualizarConvenioRequest {
  modalidad?: ModalidadConvenio;
  diaCierre?: number;
  requiereAut?: boolean;
  requiereOrden?: boolean;
  vigenciaHasta?: string;
}

export interface RenovarConvenioRequest {
  vigenciaDesde: string;
  vigenciaHasta?: string;
  motivoCierre?: string;
  aranceles?: NuevoArancelRequest[];
}

export interface ActualizarArancelesRequest {
  prestacionIds?: string[];
  metodo: 'porcentaje' | 'importe_directo';
  valor: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
}
