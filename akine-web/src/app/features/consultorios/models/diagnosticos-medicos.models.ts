export type DiagnosticoMedicoTipo =
  | 'DIAGNOSTICO_MEDICO'
  | 'MOTIVO_DERIVACION'
  | 'FUNCIONAL'
  | 'POSTQUIRURGICO';

export interface DiagnosticoMedicoCategoria {
  id: string;
  codigo: string;
  nombre: string;
}

export interface DiagnosticoMedicoItem {
  id: string;
  codigoInterno: string;
  nombre: string;
  categoriaCodigo: string;
  subcategoria?: string | null;
  tipo: DiagnosticoMedicoTipo;
  regionAnatomica: string;
  grupoIcd10?: string | null;
  codigoIcd10Exacto?: string | null;
  lateralidadAplica: boolean;
  requiereOrdenMedica: boolean;
  activo: boolean;
  origenesHabituales: string[];
  keywords: string[];
}

export interface DiagnosticosMedicos {
  consultorioId: string;
  version: string;
  pais: string;
  idioma: string;
  tipos: DiagnosticoMedicoTipo[];
  categorias: DiagnosticoMedicoCategoria[];
  diagnosticos: DiagnosticoMedicoItem[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertDiagnosticosMedicosRequest {
  version: string;
  pais: string;
  idioma: string;
  tipos: DiagnosticoMedicoTipo[];
  categorias: DiagnosticoMedicoCategoria[];
  diagnosticos: DiagnosticoMedicoItem[];
}
