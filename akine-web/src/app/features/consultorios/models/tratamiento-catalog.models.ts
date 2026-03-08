export interface TratamientoCatalogItem {
  code: string;
  label: string;
  category?: string | null;
  active: boolean;
  order: number;
}

export interface TratamientoCatalog {
  consultorioId: string;
  version: string;
  items: TratamientoCatalogItem[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertTratamientoCatalogRequest {
  version: string;
  items: TratamientoCatalogItem[];
}
