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
}

// ─── Profesional ──────────────────────────────────────────────────────────────

export interface Profesional {
  id: string;
  consultorioId: string;
  nombre: string;
  apellido: string;
  matricula: string;
  especialidad?: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfesionalRequest {
  nombre: string;
  apellido: string;
  matricula: string;
  especialidad?: string;
  email?: string;
  telefono?: string;
}
import { BoxCapacidadTipo } from './agenda.models';
