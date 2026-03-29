import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { PrestacionArancelable } from '../models/facturacion.models';

@Injectable({ providedIn: 'root' })
export class PrestacionArancelableService {
  private api = inject(ApiClient);

  list(): Observable<PrestacionArancelable[]> {
    return this.api.get<PrestacionArancelable[]>(API.prestaciones.list);
  }

  create(p: PrestacionArancelable): Observable<PrestacionArancelable> {
    return this.api.post<PrestacionArancelable>(API.prestaciones.create, p);
  }
}
