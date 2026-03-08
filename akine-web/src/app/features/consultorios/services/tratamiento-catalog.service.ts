import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { TratamientoCatalog, UpsertTratamientoCatalogRequest } from '../models/tratamiento-catalog.models';

@Injectable({ providedIn: 'root' })
export class TratamientoCatalogService {
  private readonly api = inject(ApiClient);

  get(consultorioId: string): Observable<TratamientoCatalog> {
    return this.api.get<TratamientoCatalog>(API.consultorios.tratamientosCatalogo(consultorioId));
  }

  upsert(consultorioId: string, request: UpsertTratamientoCatalogRequest): Observable<TratamientoCatalog> {
    return this.api.put<TratamientoCatalog>(API.consultorios.tratamientosCatalogo(consultorioId), request);
  }
}
