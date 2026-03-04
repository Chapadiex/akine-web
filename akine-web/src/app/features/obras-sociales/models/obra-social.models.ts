export type ObraSocialEstado = 'ACTIVE' | 'INACTIVE';
export type TipoCobertura = 'PORCENTAJE' | 'MONTO' | 'MIXTO';
export type TipoCoseguro = 'MONTO' | 'PORCENTAJE' | 'SIN_COSEGURO';

export interface Plan {
  id?: string;
  nombreCorto: string;
  nombreCompleto: string;
  tipoCobertura: TipoCobertura;
  valorCobertura: number;
  tipoCoseguro: TipoCoseguro;
  valorCoseguro: number;
  prestacionesSinAutorizacion: number;
  observaciones?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ObraSocial {
  id: string;
  consultorioId: string;
  acronimo: string;
  nombreCompleto: string;
  cuit: string;
  email?: string;
  telefono?: string;
  telefonoAlternativo?: string;
  representante?: string;
  observacionesInternas?: string;
  direccionLinea?: string;
  estado: ObraSocialEstado;
  planes: Plan[];
  createdAt: string;
  updatedAt: string;
}

export interface ObraSocialListItem {
  id: string;
  acronimo: string;
  nombreCompleto: string;
  cuit: string;
  email?: string;
  telefono?: string;
  representante?: string;
  estado: ObraSocialEstado;
  planesCount: number;
  hasPlanes: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PagedObraSocialList {
  content: ObraSocialListItem[];
  page: number;
  size: number;
  total: number;
}

export interface ObraSocialUpsertRequest {
  acronimo: string;
  nombreCompleto: string;
  cuit: string;
  email?: string;
  telefono?: string;
  telefonoAlternativo?: string;
  representante?: string;
  observacionesInternas?: string;
  direccionLinea?: string;
  estado: ObraSocialEstado;
  planes: Plan[];
}

export interface ObraSocialFilters {
  q?: string;
  estado?: ObraSocialEstado;
  conPlanes?: boolean;
  page?: number;
  size?: number;
}

