import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Profesional, ProfesionalEstadoRequest, ProfesionalRequest } from '../models/consultorio.models';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {
  private api = inject(ApiClient);

  list(
    consultorioId: string,
    filters?: {
      dni?: string;
      q?: string;
      matricula?: string;
      especialidades?: string[];
      activo?: boolean;
    },
  ): Observable<Profesional[]> {
    const params = new URLSearchParams();
    if (filters?.dni) params.set('dni', filters.dni);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.matricula) params.set('matricula', filters.matricula);
    if (filters?.activo !== undefined) params.set('activo', String(filters.activo));
    for (const e of filters?.especialidades ?? []) {
      params.append('especialidades', e);
    }
    const query = params.toString();
    const url = query
      ? `${API.consultorios.profesionales(consultorioId)}?${query}`
      : API.consultorios.profesionales(consultorioId);
    return this.api.get<Profesional[]>(url).pipe(
      map((rows) =>
        rows.map((r) => ({
          ...r,
          especialidades: r.especialidades ?? (r.especialidad ? [r.especialidad] : []),
        })),
      ),
    );
  }

  create(consultorioId: string, req: ProfesionalRequest): Observable<Profesional> {
    return this.api.post<Profesional>(API.consultorios.profesionales(consultorioId), req).pipe(
      map((r) => ({ ...r, especialidades: r.especialidades ?? (r.especialidad ? [r.especialidad] : []) })),
    );
  }

  update(consultorioId: string, profesionalId: string, req: ProfesionalRequest): Observable<Profesional> {
    return this.api.put<Profesional>(API.consultorios.profesionalById(consultorioId, profesionalId), req).pipe(
      map((r) => ({ ...r, especialidades: r.especialidades ?? (r.especialidad ? [r.especialidad] : []) })),
    );
  }

  getById(consultorioId: string, profesionalId: string): Observable<Profesional> {
    return this.api.get<Profesional>(API.consultorios.profesionalById(consultorioId, profesionalId)).pipe(
      map((r) => ({ ...r, especialidades: r.especialidades ?? (r.especialidad ? [r.especialidad] : []) })),
    );
  }

  changeEstado(consultorioId: string, profesionalId: string, req: ProfesionalEstadoRequest): Observable<Profesional> {
    return this.api.patch<Profesional>(API.consultorios.profesionalEstado(consultorioId, profesionalId), req);
  }

  inactivate(consultorioId: string, profesionalId: string): Observable<void> {
    return this.api.delete<void>(API.consultorios.profesionalById(consultorioId, profesionalId));
  }
}
