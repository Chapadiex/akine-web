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

export type EstadoCobroPaciente = 'COBRADO' | 'ANULADO';

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

// ── Requests ──────────────────────────────────────────────────────────────────

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
