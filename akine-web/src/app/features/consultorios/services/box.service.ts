import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Box, BoxRequest } from '../models/consultorio.models';
import { BoxCapacidadTipo } from '../models/agenda.models';

@Injectable({ providedIn: 'root' })
export class BoxService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<Box[]> {
    return this.api.get<Box[]>(API.consultorios.boxes(consultorioId));
  }

  create(consultorioId: string, req: BoxRequest): Observable<Box> {
    return this.api.post<Box>(API.consultorios.boxes(consultorioId), req);
  }

  inactivate(consultorioId: string, boxId: string): Observable<void> {
    return this.api.delete<void>(API.consultorios.boxById(consultorioId, boxId));
  }

  updateCapacidad(consultorioId: string, boxId: string, capacityType: BoxCapacidadTipo, capacity?: number): Observable<Box> {
    return this.api.patch<Box>(API.consultorios.boxCapacidad(consultorioId, boxId), {
      capacityType,
      capacity: capacity ?? null,
    });
  }
}
