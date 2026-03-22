import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  AnularCobroRequest,
  CobroPaciente,
  CobroPacienteRequest,
} from '../models/caja.models';

@Injectable({ providedIn: 'root' })
export class CobroPacienteService {
  private api = inject(ApiClient);

  cobrar(consultorioId: string, req: CobroPacienteRequest): Observable<CobroPaciente> {
    return this.api.post<CobroPaciente>(API.cobros.cobrar(consultorioId), req);
  }

  byId(consultorioId: string, cobroId: string): Observable<CobroPaciente> {
    return this.api.get<CobroPaciente>(API.cobros.byId(consultorioId, cobroId));
  }

  byPaciente(consultorioId: string, pacienteId: string): Observable<CobroPaciente[]> {
    return this.api.get<CobroPaciente[]>(API.cobros.byPaciente(consultorioId, pacienteId));
  }

  byCaja(consultorioId: string, cajaId: string): Observable<CobroPaciente[]> {
    return this.api.get<CobroPaciente[]>(API.cobros.byCaja(consultorioId, cajaId));
  }

  anular(consultorioId: string, cobroId: string, req: AnularCobroRequest): Observable<CobroPaciente> {
    return this.api.post<CobroPaciente>(API.cobros.anular(consultorioId, cobroId), req);
  }
}
