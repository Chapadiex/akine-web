import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { CreateFeriadoRequest, Feriado } from '../../turnos/models/turno.models';

@Injectable({ providedIn: 'root' })
export class FeriadoService {
  private api = inject(ApiClient);

  list(consultorioId: string, year?: number): Observable<Feriado[]> {
    const params: Record<string, string | number> = {};
    if (year) params['year'] = year;
    return this.api.get<Feriado[]>(API.feriados.list(consultorioId), params);
  }

  create(consultorioId: string, req: CreateFeriadoRequest): Observable<Feriado> {
    return this.api.post<Feriado>(API.feriados.create(consultorioId), req);
  }

  delete(consultorioId: string, feriadoId: string): Observable<void> {
    return this.api.delete<void>(API.feriados.delete(consultorioId, feriadoId));
  }
}
