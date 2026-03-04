export type ColaboradorEstado = 'ACTIVO' | 'INACTIVO' | 'INVITADO' | 'RECHAZADO';
export type CuentaStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'REJECTED';
export type ModoAltaProfesional = 'DIRECTA' | 'INVITACION';

export interface ColaboradorProfesional {
  id: string;
  consultorioId: string;
  userId: string | null;
  nombre: string;
  apellido: string;
  nroDocumento: string | null;
  matricula: string;
  especialidades: string[];
  email: string | null;
  telefono: string | null;
  domicilio: string | null;
  fotoPerfilUrl: string | null;
  fechaAlta: string | null;
  fechaBaja: string | null;
  motivoBaja: string | null;
  activo: boolean;
  estadoColaborador: ColaboradorEstado;
  cuentaStatus: CuentaStatus;
  ultimoEnvioActivacionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ColaboradorEmpleado {
  id: string;
  consultorioId: string;
  userId: string | null;
  nombre: string;
  apellido: string;
  dni: string | null;
  cargo: string;
  nroLegajo: string | null;
  email: string;
  telefono: string | null;
  notasInternas: string | null;
  fechaAlta: string | null;
  fechaBaja: string | null;
  motivoBaja: string | null;
  activo: boolean;
  estadoColaborador: ColaboradorEstado;
  cuentaStatus: CuentaStatus;
  ultimoEnvioActivacionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfesionalColaboradorRequest {
  nombre: string;
  apellido: string;
  nroDocumento?: string;
  matricula: string;
  especialidades: string[];
  email?: string;
  telefono?: string;
  domicilio?: string;
  fotoPerfilUrl?: string;
  modoAlta?: ModoAltaProfesional;
}

export interface EmpleadoColaboradorRequest {
  nombre: string;
  apellido: string;
  dni?: string;
  cargo: string;
  nroLegajo?: string;
  email: string;
  telefono?: string;
  notasInternas?: string;
}

export interface ColaboradorEstadoRequest {
  activo: boolean;
  fechaDeBaja?: string;
  motivoDeBaja?: string;
}
