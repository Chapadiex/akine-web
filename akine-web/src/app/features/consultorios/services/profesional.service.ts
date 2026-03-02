import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Profesional, ProfesionalRequest } from '../models/consultorio.models';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<Profesional[]> {
    return this.api.get<Profesional[]>(API.consultorios.profesionales(consultorioId));
  }

  create(consultorioId: string, req: ProfesionalRequest): Observable<Profesional> {
    return this.api.post<Profesional>(API.consultorios.profesionales(consultorioId), req);
  }

  inactivate(consultorioId: string, profesionalId: string): Observable<void> {
    return this.api.delete<void>(API.consultorios.profesionalById(consultorioId, profesionalId));
  }
}
