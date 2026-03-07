// ─── Enums ────────────────────────────────────────────────────────────────────

export type BoxTipo = 'BOX' | 'GIMNASIO' | 'OFICINA';

// ─── Consultorio ──────────────────────────────────────────────────────────────

export interface Consultorio {
  id: string;
  name: string;
  cuit?: string;
  address?: string;
  phone?: string;
  email?: string;
  mapLatitude?: number;
  mapLongitude?: number;
  googleMapsUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultorioRequest {
  name: string;
  cuit?: string;
  address?: string;
  phone?: string;
  email?: string;
  mapLatitude?: number;
  mapLongitude?: number;
  googleMapsUrl?: string;
}

// ─── Box ──────────────────────────────────────────────────────────────────────

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
  activo?: boolean;
}

// ─── Profesional ──────────────────────────────────────────────────────────────

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
  nombre: string;
  apellido: string;
  nroDocumento?: string;
  matricula: string;
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
import { BoxCapacidadTipo } from './agenda.models';
