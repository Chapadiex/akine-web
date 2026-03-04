import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Consultorio, ConsultorioRequest } from '../models/consultorio.models';

@Injectable({ providedIn: 'root' })
export class ConsultorioService {
  private api = inject(ApiClient);

  list(): Observable<Consultorio[]> {
    return this.api.get<Consultorio[]>(API.consultorios.list);
  }

  getById(id: string): Observable<Consultorio> {
    return this.api.get<Consultorio>(API.consultorios.byId(id));
  }

  create(req: ConsultorioRequest): Observable<Consultorio> {
    return this.api.post<Consultorio>(API.consultorios.create, req);
  }

  update(id: string, req: ConsultorioRequest): Observable<Consultorio> {
    return this.api.put<Consultorio>(API.consultorios.update(id), req);
  }

  inactivate(id: string): Observable<void> {
    return this.api.delete<void>(API.consultorios.inactivate(id));
  }

  activate(id: string): Observable<Consultorio> {
    return this.api.patch<Consultorio>(API.consultorios.activate(id), {});
  }
}
