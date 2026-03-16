import { BoxCapacidadTipo } from './agenda.models';

export type BoxTipo = 'BOX' | 'GIMNASIO' | 'OFICINA';
export type ConsultorioStatus = 'ACTIVE' | 'INACTIVE';

export interface Consultorio {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  cuit?: string;
  legalName?: string;
  address?: string;
  geoAddress?: string;
  accessReference?: string;
  floorUnit?: string;
  phone?: string;
  email?: string;
  administrativeContact?: string;
  internalNotes?: string;
  mapLatitude?: number;
  mapLongitude?: number;
  googleMapsUrl?: string;
  documentDisplayName?: string;
  documentSubtitle?: string;
  documentLogoUrl?: string;
  documentFooter?: string;
  documentShowAddress?: boolean;
  documentShowPhone?: boolean;
  documentShowEmail?: boolean;
  documentShowCuit?: boolean;
  documentShowLegalName?: boolean;
  documentShowLogo?: boolean;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpirationDate?: string;
  professionalDirectorName?: string;
  professionalDirectorLicense?: string;
  legalDocumentSummary?: string;
  legalNotes?: string;
  status: ConsultorioStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultorioRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  cuit?: string;
  legalName?: string;
  address?: string;
  geoAddress?: string;
  accessReference?: string;
  floorUnit?: string;
  phone?: string;
  email?: string;
  administrativeContact?: string;
  internalNotes?: string;
  mapLatitude?: number;
  mapLongitude?: number;
  googleMapsUrl?: string;
  documentDisplayName?: string;
  documentSubtitle?: string;
  documentLogoUrl?: string;
  documentFooter?: string;
  documentShowAddress?: boolean;
  documentShowPhone?: boolean;
  documentShowEmail?: boolean;
  documentShowCuit?: boolean;
  documentShowLegalName?: boolean;
  documentShowLogo?: boolean;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpirationDate?: string;
  professionalDirectorName?: string;
  professionalDirectorLicense?: string;
  legalDocumentSummary?: string;
  legalNotes?: string;
  status?: ConsultorioStatus;
}

export interface Box {
  id: string;
  consultorioId: string;
  nombre: string;
  codigo?: string;
  tipo: BoxTipo;
  capacityType: BoxCapacidadTipo;
  capacity?: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoxRequest {
  nombre: string;
  codigo?: string;
  tipo: BoxTipo;
  capacityType: BoxCapacidadTipo;
  capacity?: number;
  activo?: boolean;
}

export interface Profesional {
  id: string;
  consultorioId: string;
  nombre: string;
  apellido: string;
  nroDocumento?: string;
  matricula: string;
  especialidad?: string;
  especialidades: string[];
  email?: string;
  telefono?: string;
  domicilio?: string;
  fotoPerfilUrl?: string;
  fechaAlta?: string;
  fechaBaja?: string;
  motivoBaja?: string;
  consultoriosAsociados?: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfesionalRequest {
  nombre?: string;
  apellido?: string;
  nroDocumento?: string;
  matricula?: string;
  especialidad?: string;
  especialidades?: string;
  email?: string;
  telefono?: string;
  domicilio?: string;
  fotoPerfilUrl?: string;
}

export interface ProfesionalEstadoRequest {
  activo: boolean;
  fechaDeBaja?: string;
  motivoDeBaja?: string;
}
