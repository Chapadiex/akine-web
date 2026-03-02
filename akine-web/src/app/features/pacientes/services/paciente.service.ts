import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Paciente, PacienteRequest, PacienteSearchResult } from '../models/paciente.models';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly api = inject(ApiClient);

  createMe(req: PacienteRequest): Observable<Paciente> {
    return this.api.post<Paciente>(API.pacientes.me, req);
  }

  getMe(): Observable<Paciente> {
    return this.api.get<Paciente>(API.pacientes.me);
  }

  createAdmin(consultorioId: string, req: PacienteRequest): Observable<Paciente> {
    return this.api.post<Paciente>(API.pacientes.create(consultorioId), req);
  }

  search(consultorioId: string, dni?: string, q?: string): Observable<PacienteSearchResult[]> {
    return this.api.get<PacienteSearchResult[]>(API.pacientes.search(consultorioId, dni, q));
  }

  getById(id: string, consultorioId: string): Observable<Paciente> {
    return this.api.get<Paciente>(API.pacientes.byId(id, consultorioId));
  }
}
