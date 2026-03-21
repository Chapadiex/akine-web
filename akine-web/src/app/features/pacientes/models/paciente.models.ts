export interface PacienteRequest {
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  fechaNacimiento?: string;
  sexo?: string;
  domicilio?: string;
  nacionalidad?: string;
  estadoCivil?: string;
  profesiones?: string[];
  obraSocialNombre?: string;
  obraSocialPlan?: string;
  obraSocialNroAfiliado?: string;
  obraSocialFinanciadorId?: string;
  obraSocialPlanId?: string;
  obraSocialEsParticular?: boolean;
}

export interface PacienteUpdateRequest {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  fechaNacimiento?: string;
  sexo?: string;
  domicilio?: string;
  nacionalidad?: string;
  estadoCivil?: string;
  profesiones?: string[];
  obraSocialNombre?: string;
  obraSocialPlan?: string;
  obraSocialNroAfiliado?: string;
  obraSocialFinanciadorId?: string;
  obraSocialPlanId?: string;
  obraSocialEsParticular?: boolean;
}

export interface Paciente {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  fechaNacimiento?: string;
  sexo?: string;
  domicilio?: string;
  nacionalidad?: string;
  estadoCivil?: string;
  profesiones?: string[];
  obraSocialNombre?: string;
  obraSocialPlan?: string;
  obraSocialNroAfiliado?: string;
  obraSocialFinanciadorId?: string;
  obraSocialPlanId?: string;
  obraSocialEsParticular?: boolean;
  userId?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PacienteSearchResult {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  activo: boolean;
  linkedToConsultorio: boolean;
}
