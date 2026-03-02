import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { ConsultorioHorario, DayOfWeek, HorarioRequest } from '../models/agenda.models';

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<ConsultorioHorario[]> {
    return this.api.get<ConsultorioHorario[]>(API.consultorios.horarios(consultorioId));
  }

  set(consultorioId: string, diaSemana: DayOfWeek, req: HorarioRequest): Observable<ConsultorioHorario> {
    return this.api.put<ConsultorioHorario>(API.consultorios.horarioDia(consultorioId, diaSemana), req);
  }

  delete(consultorioId: string, diaSemana: DayOfWeek): Observable<void> {
    return this.api.delete<void>(API.consultorios.horarioDia(consultorioId, diaSemana));
  }
}
