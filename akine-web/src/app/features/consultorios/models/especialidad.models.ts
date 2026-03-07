export interface Especialidad {
  id: string;
  consultorioId: string;
  nombre: string;
  slug: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EspecialidadCreateRequest {
  nombre: string;
}

export interface EspecialidadUpdateRequest {
  nombre: string;
}
