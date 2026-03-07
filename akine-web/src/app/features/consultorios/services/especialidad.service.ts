import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Especialidad, EspecialidadCreateRequest, EspecialidadUpdateRequest } from '../models/especialidad.models';

@Injectable({ providedIn: 'root' })
export class EspecialidadService {
  private api = inject(ApiClient);

  list(consultorioId: string, filters?: { search?: string; includeInactive?: boolean }): Observable<Especialidad[]> {
    const params: Record<string, string | number> = {};
    if (filters?.search?.trim()) {
      params['search'] = filters.search.trim();
    }
    if (filters?.includeInactive !== undefined) {
      params['includeInactive'] = filters.includeInactive ? 'true' : 'false';
    }
    return this.api.get<Especialidad[]>(API.consultorios.especialidades(consultorioId), params);
  }

  create(consultorioId: string, req: EspecialidadCreateRequest): Observable<Especialidad> {
    return this.api.post<Especialidad>(API.consultorios.especialidades(consultorioId), req);
  }

  update(consultorioId: string, especialidadId: string, req: EspecialidadUpdateRequest): Observable<Especialidad> {
    return this.api.put<Especialidad>(API.consultorios.especialidadUpdate(consultorioId, especialidadId), req);
  }

  activate(consultorioId: string, especialidadId: string): Observable<Especialidad> {
    return this.api.patch<Especialidad>(API.consultorios.especialidadActivar(consultorioId, especialidadId), {});
  }

  deactivate(consultorioId: string, especialidadId: string): Observable<Especialidad> {
    return this.api.patch<Especialidad>(API.consultorios.especialidadDesactivar(consultorioId, especialidadId), {});
  }
}
