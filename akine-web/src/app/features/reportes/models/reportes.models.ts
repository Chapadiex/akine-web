export interface ReporteCajaDia {
  cajaId: string;
  consultorioId: string;
  fechaOperativa: string;
  turnoCaja: string | null;
  estado: string;
  saldoInicial: number;
  totalIngresosPaciente: number;
  totalIngresosOs: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoTeorico: number | null;
  saldoReal: number | null;
  diferencia: number | null;
  movimientos: MovimientoDetalle[];
}

export interface MovimientoDetalle {
  id: string;
  tipoMovimiento: 'INGRESO' | 'EGRESO';
  origenMovimiento: string;
  importe: number;
  signo: string;
  descripcion: string;
  medioPago: string | null;
  anulado: boolean;
  fechaHora: string;
}

export interface ReporteFacturadoVsCobrado {
  loteId: string;
  financiadorId: string;
  periodo: string;
  estadoLote: string;
  importeFacturado: number;
  importeCobrado: number;
  diferencia: number;
  cantidadPagos: number;
}

export interface ReporteSesionBloqueada {
  liquidacionId: string;
  sesionId: string;
  pacienteId: string;
  motivoBloqueo: string | null;
  createdAt: string;
}

export interface ReporteCopagosPendientes {
  liquidacionId: string;
  sesionId: string;
  pacienteId: string;
  financiadorId: string;
  copagoImporte: number;
  importeObraSocial: number;
  estado: string;
  createdAt: string;
}

export interface ReporteProductividad {
  profesionalId: string;
  cantidadSesiones: number;
  importeTotalLiquidado: number;
  importeObraSocial: number;
  importePaciente: number;
}
