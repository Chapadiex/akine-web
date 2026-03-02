import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { ProfesionalAsignado } from '../models/agenda.models';

@Injectable({ providedIn: 'root' })
export class AsignacionService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<ProfesionalAsignado[]> {
    return this.api.get<ProfesionalAsignado[]>(API.consultorios.asignaciones(consultorioId));
  }

  asignar(consultorioId: string, profesionalId: string): Observable<ProfesionalAsignado> {
    return this.api.post<ProfesionalAsignado>(API.consultorios.asignaciones(consultorioId), { profesionalId });
  }

  desasignar(consultorioId: string, profesionalId: string): Observable<void> {
    return this.api.delete<void>(API.consultorios.asignacionProf(consultorioId, profesionalId));
  }
}
