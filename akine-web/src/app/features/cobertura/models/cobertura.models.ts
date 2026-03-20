export enum TipoFinanciador {
  OBRA_SOCIAL = 'OBRA_SOCIAL',
  PREPAGA = 'PREPAGA',
  PAMI = 'PAMI',
  ART = 'ART',
  PARTICULAR = 'PARTICULAR',
  OTRO = 'OTRO'
}

export interface FinanciadorSalud {
  id?: string;
  consultorioId?: string;
  codigoExterno?: string;
  tipoFinanciador: TipoFinanciador;
  subtipoFinanciador?: string;
  nombre: string;
  nombreCorto?: string;
  ambitoCobertura?: string;
  activo?: boolean;
}

export enum TipoPlan {
  PMO = 'PMO',
  COMERCIAL = 'COMERCIAL',
  SUPERADOR = 'SUPERADOR',
  BASICO = 'BASICO',
  OTRO = 'OTRO'
}

export interface PlanFinanciador {
  id?: string;
  financiadorId: string;
  nombrePlan: string;
  tipoPlan: TipoPlan;
  requiereAutorizacionDefault: boolean;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  activo?: boolean;
}

export interface PacienteCobertura {
  id?: string;
  pacienteId: string;
  financiadorId: string;
  planId?: string;
  numeroAfiliado?: string;
  fechaAlta?: string;
  fechaBaja?: string;
  principal: boolean;
  activo?: boolean;
}
