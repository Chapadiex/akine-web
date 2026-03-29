export type MedioPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'TARJETA_DEBITO'
  | 'TARJETA_CREDITO'
  | 'CHEQUE'
  | 'QR'
  | 'OTRO';

export const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA_DEBITO: 'Débito',
  TARJETA_CREDITO: 'Crédito',
  CHEQUE: 'Cheque',
  QR: 'QR',
  OTRO: 'Otro',
};

export type TurnoCaja = 'MANANA' | 'TARDE' | 'NOCHE' | 'UNICO';

export const TURNO_CAJA_LABELS: Record<TurnoCaja, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
  UNICO: 'Único',
};

export type CajaDiariaEstado = 'ABIERTA' | 'CERRADA' | 'CERRADA_CON_DIFERENCIA';

export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export type OrigenMovimiento =
  | 'COBRO_PACIENTE'
  | 'PAGO_OS'
  | 'AJUSTE_MANUAL'
  | 'ANULACION';

export type EstadoCobroPaciente =
  | 'PENDIENTE'
  | 'PARCIAL'
  | 'COBRADO_TOTAL'
  | 'ANULADO'
  | 'COBRADO';

export interface CajaDiaria {
  id: string;
  consultorioId: string;
  fechaOperativa: string;
  turnoCaja: TurnoCaja | null;
  estado: CajaDiariaEstado;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoTeorico: number | null;
  saldoReal: number | null;
  diferenciaCierre: number | null;
  observacionesCierre: string | null;
  abiertaPor: string;
  cerradaPor: string | null;
  abiertaEn: string;
  cerradaEn: string | null;
  version: number;
}

export interface MovimientoCaja {
  id: string;
  cajaDiariaId: string;
  tipoMovimiento: TipoMovimiento;
  origen: OrigenMovimiento;
  descripcion: string;
  importe: number;
  medioPago: MedioPago;
  referenciaEntidadId: string | null;
  anulado: boolean;
  creadoEn: string;
}

export interface CobroPacienteDetalle {
  id: string;
  medioPago: MedioPago;
  importe: number;
  referenciaOperacion: string | null;
  cuotas: number | null;
  banco: string | null;
  marcaTarjeta: string | null;
}

export interface CobroPaciente {
  id: string;
  consultorioId: string;
  cajaDiariaId: string;
  pacienteId: string;
  sesionId: string | null;
  liquidacionSesionId: string | null;
  estado: EstadoCobroPaciente;
  fechaCobro: string;
  importeTotal: number;
  esPagoMixto: boolean;
  comprobanteNumero: string | null;
  reciboEmitido: boolean;
  observaciones: string | null;
  cobradoPor: string | null;
  anuladoPor: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  detalles: CobroPacienteDetalle[];
  version: number;
}

export type TipoEgreso =
  | 'INSUMOS'
  | 'SERVICIOS'
  | 'PROVEEDOR'
  | 'RETIRO'
  | 'OTRO';

export const TIPO_EGRESO_LABELS: Record<TipoEgreso, string> = {
  INSUMOS: 'Insumos y materiales',
  SERVICIOS: 'Servicios',
  PROVEEDOR: 'Pago a proveedor',
  RETIRO: 'Retiro de caja',
  OTRO: 'Otro',
};

// ── Requests ──────────────────────────────────────────────────────────────────

export interface EgresoDetalleRequest {
  medioPago: MedioPago;
  importe: number;
  referenciaOperacion: string | null;
}

export interface EgresoManualRequest {
  tipoEgreso: TipoEgreso;
  concepto: string | null;
  importeTotal: number;
  detalles: EgresoDetalleRequest[];
  observaciones: string | null;
}

export interface AperturaCajaRequest {
  fechaOperativa: string;
  turnoCaja: TurnoCaja | null;
  saldoInicial: number;
}

export interface CierreCajaRequest {
  saldoReal: number;
  observaciones: string | null;
}

export interface CobroPacienteDetalleRequest {
  medioPago: MedioPago;
  importe: number;
  referenciaOperacion: string | null;
  cuotas: number | null;
  banco: string | null;
  marcaTarjeta: string | null;
}

export interface CobroPacienteRequest {
  cajaDiariaId: string;
  pacienteId: string;
  sesionId: string | null;
  importeTotal: number;
  detalles: CobroPacienteDetalleRequest[];
  observaciones: string | null;
}

export interface AnularCobroRequest {
  motivo: string;
}

// ── Liquidación de sesión ──────────────────────────────────────────────────

export type TipoLiquidacion = 'PARTICULAR' | 'MIXTA' | 'OS';
export type EstadoLiquidacion =
  | 'PENDIENTE_DE_LIQUIDAR'
  | 'LIQUIDADA_PARTICULAR'
  | 'LIQUIDADA_MIXTA'
  | 'LIQUIDADA_OS'
  | 'BLOQUEADA_POR_DOCUMENTACION'
  | 'ANULADA';
export type OrigenTipoCobro = 'AUTOMATICO' | 'MANUAL_ADMINISTRATIVO' | 'CONVERSION_PARTICULAR';

export interface LiquidacionSesion {
  id: string;
  consultorioId: string;
  sesionId: string;
  pacienteId: string;
  financiadorId: string | null;
  planId: string | null;
  convenioId: string | null;
  tipoLiquidacion: TipoLiquidacion;
  estado: EstadoLiquidacion;
  motivoBloqueo: string | null;
  valorBruto: number;
  descuentoImporte: number;
  copagoImporte: number;
  coseguroImporte: number;
  importePaciente: number;
  importeObraSocial: number;
  importeTotalLiquidado: number;
  documentacionCompleta: boolean;
  esFacturableOs: boolean;
  requiereRevisionManual: boolean;
  origenTipoCobro: OrigenTipoCobro;
  observaciones: string | null;
  liquidadoPor: string;
  recalculadaEn: string | null;
  recalculadaPor: string | null;
  createdAt: string;
  version: number;
}

export interface ReliquidarRequest {
  motivo: string;
}

export interface ConvertirParticularRequest {
  motivo: string;
}
