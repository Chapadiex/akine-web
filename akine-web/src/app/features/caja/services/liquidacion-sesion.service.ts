import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  ConvertirParticularRequest,
  LiquidacionSesion,
  ReliquidarRequest,
} from '../models/caja.models';

@Injectable({ providedIn: 'root' })
export class LiquidacionSesionService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<LiquidacionSesion[]> {
    return this.api.get<LiquidacionSesion[]>(API.liquidaciones.list(consultorioId));
  }

  byId(consultorioId: string, liquidacionId: string): Observable<LiquidacionSesion> {
    return this.api.get<LiquidacionSesion>(API.liquidaciones.byId(consultorioId, liquidacionId));
  }

  bySesion(consultorioId: string, sesionId: string): Observable<LiquidacionSesion> {
    return this.api.get<LiquidacionSesion>(API.liquidaciones.bySesion(consultorioId, sesionId));
  }

  byPaciente(consultorioId: string, pacienteId: string): Observable<LiquidacionSesion[]> {
    return this.api.get<LiquidacionSesion[]>(API.liquidaciones.byPaciente(consultorioId, pacienteId));
  }

  reliquidar(consultorioId: string, liquidacionId: string, req: ReliquidarRequest): Observable<LiquidacionSesion> {
    return this.api.post<LiquidacionSesion>(API.liquidaciones.reliquidar(consultorioId, liquidacionId), req);
  }

  convertirAParticular(consultorioId: string, liquidacionId: string, req: ConvertirParticularRequest): Observable<LiquidacionSesion> {
    return this.api.post<LiquidacionSesion>(API.liquidaciones.convertirParticular(consultorioId, liquidacionId), req);
  }
}
