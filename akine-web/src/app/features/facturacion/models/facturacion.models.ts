export enum ModalidadPago {
  PRESTACION = 'PRESTACION',
  MODULO = 'MODULO',
  CAPITA = 'CAPITA'
}

export enum UnidadFacturacion {
  SESION = 'SESION',
  PRACTICA = 'PRACTICA',
  MODULO = 'MODULO'
}

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
  nombre: string;
  modalidadPago: ModalidadPago;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  diaCierre?: number;
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
  importeCopago: number;
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
