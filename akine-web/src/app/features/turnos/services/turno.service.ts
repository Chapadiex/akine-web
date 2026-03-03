import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  CambiarEstadoRequest,
  CreateTurnoRequest,
  HistorialEstadoTurno,
  ReprogramarRequest,
  SlotDisponible,
  Turno,
  TurnoFilters,
} from '../models/turno.models';

@Injectable({ providedIn: 'root' })
export class TurnoService {
  private api = inject(ApiClient);

  list(consultorioId: string, filters: TurnoFilters): Observable<Turno[]> {
    const params: Record<string, string> = {
      from: filters.from,
      to: filters.to,
    };
    if (filters.profesionalId) params['profesionalId'] = filters.profesionalId;
    if (filters.boxId) params['boxId'] = filters.boxId;
    if (filters.estado) params['estado'] = filters.estado;
    return this.api.get<Turno[]>(API.turnos.list(consultorioId), params);
  }

  create(consultorioId: string, req: CreateTurnoRequest): Observable<Turno> {
    return this.api.post<Turno>(API.turnos.create(consultorioId), req);
  }

  reprogramar(consultorioId: string, turnoId: string, req: ReprogramarRequest): Observable<Turno> {
    return this.api.patch<Turno>(API.turnos.reprogramar(consultorioId, turnoId), req);
  }

  cambiarEstado(consultorioId: string, turnoId: string, req: CambiarEstadoRequest): Observable<Turno> {
    return this.api.patch<Turno>(API.turnos.cambiarEstado(consultorioId, turnoId), req);
  }

  disponibilidad(
    consultorioId: string,
    params: { date: string; profesionalId: string; duracion: number },
  ): Observable<SlotDisponible[]> {
    return this.api.get<SlotDisponible[]>(API.turnos.disponibilidad(consultorioId), {
      date: params.date,
      profesionalId: params.profesionalId,
      duracion: params.duracion,
    });
  }

  getHistorial(consultorioId: string, turnoId: string): Observable<HistorialEstadoTurno[]> {
    return this.api.get<HistorialEstadoTurno[]>(API.turnos.historial(consultorioId, turnoId));
  }
}
