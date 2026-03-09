export type TratamientoCatalogTipo = 'PRINCIPAL' | 'TECNICA';
export type TratamientoCatalogModalidad =
  | 'CONSULTORIO'
  | 'DOMICILIO'
  | 'PILETA'
  | 'INTERNACION'
  | 'INSTITUCION';

export interface TratamientoCatalogCategoria {
  id: string;
  codigo: string;
  nombre: string;
}

export interface TratamientoCatalogFinanciadorCode {
  financiador?: string | null;
  codigo?: string | null;
  nombre?: string | null;
}

export interface TratamientoCatalogItem {
  id: string;
  codigoInterno: string;
  nombre: string;
  categoriaCodigo: string;
  tipo: TratamientoCatalogTipo;
  descripcion: string;
  facturable: boolean;
  requierePrescripcionMedica: boolean;
  requiereAutorizacion: boolean;
  duracionSugeridaMinutos: number;
  modalidades: TratamientoCatalogModalidad[];
  activo: boolean;
  precioReferencia?: number | null;
  codigosFinanciador: TratamientoCatalogFinanciadorCode[];
}

export interface TratamientoCatalog {
  consultorioId: string;
  version: string;
  monedaNomenclador: string;
  pais: string;
  observaciones: string[];
  tipos: TratamientoCatalogTipo[];
  categorias: TratamientoCatalogCategoria[];
  tratamientos: TratamientoCatalogItem[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertTratamientoCatalogRequest {
  version: string;
  monedaNomenclador: string;
  pais: string;
  observaciones: string[];
  tipos: TratamientoCatalogTipo[];
  categorias: TratamientoCatalogCategoria[];
  tratamientos: TratamientoCatalogItem[];
}
