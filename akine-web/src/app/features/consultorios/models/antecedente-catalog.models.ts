export type AntecedenteValueType = 'BOOLEAN' | 'ENUM' | 'ENUM_MULTI' | 'REPEATABLE' | 'TEXT';
export type RepeatableFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN';

export interface AntecedenteCatalogOption {
  code: string;
  label: string;
  active: boolean;
  order: number;
}

export interface AntecedenteCatalogField {
  code: string;
  label: string;
  type: RepeatableFieldType;
}

export interface AntecedenteCatalogItem {
  code: string;
  label: string;
  valueType: AntecedenteValueType;
  active: boolean;
  order: number;
  options?: AntecedenteCatalogOption[];
  fields?: AntecedenteCatalogField[];
}

export interface AntecedenteCatalogCategory {
  code: string;
  name: string;
  order: number;
  active: boolean;
  items: AntecedenteCatalogItem[];
}

export interface AntecedenteCatalog {
  consultorioId: string;
  version: string;
  categories: AntecedenteCatalogCategory[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertAntecedenteCatalogRequest {
  version: string;
  categories: AntecedenteCatalogCategory[];
}

export type RestoreDefaultsMode = 'RESET' | 'ADD_MISSING';

