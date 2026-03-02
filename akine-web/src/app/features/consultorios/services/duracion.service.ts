import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { ConsultorioDuracion } from '../models/agenda.models';

@Injectable({ providedIn: 'root' })
export class DuracionService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<ConsultorioDuracion[]> {
    return this.api.get<ConsultorioDuracion[]>(API.consultorios.duraciones(consultorioId));
  }

  add(consultorioId: string, minutos: number): Observable<ConsultorioDuracion> {
    return this.api.post<ConsultorioDuracion>(API.consultorios.duraciones(consultorioId), { minutos });
  }

  remove(consultorioId: string, minutos: number): Observable<void> {
    return this.api.delete<void>(API.consultorios.duracionMin(consultorioId, minutos));
  }
}
