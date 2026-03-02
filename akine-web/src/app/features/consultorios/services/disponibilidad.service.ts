import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { DisponibilidadProfesional, DisponibilidadRequest } from '../models/agenda.models';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  private api = inject(ApiClient);

  list(consultorioId: string, profesionalId: string): Observable<DisponibilidadProfesional[]> {
    return this.api.get<DisponibilidadProfesional[]>(API.consultorios.disponibilidad(consultorioId, profesionalId));
  }

  create(consultorioId: string, profesionalId: string, req: DisponibilidadRequest): Observable<DisponibilidadProfesional> {
    return this.api.post<DisponibilidadProfesional>(API.consultorios.disponibilidad(consultorioId, profesionalId), req);
  }

  update(consultorioId: string, profesionalId: string, id: string, req: DisponibilidadRequest): Observable<DisponibilidadProfesional> {
    return this.api.put<DisponibilidadProfesional>(API.consultorios.disponibilidadById(consultorioId, profesionalId, id), req);
  }

  delete(consultorioId: string, profesionalId: string, id: string): Observable<void> {
    return this.api.delete<void>(API.consultorios.disponibilidadById(consultorioId, profesionalId, id));
  }
}
