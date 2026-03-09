import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { TratamientoCatalog, UpsertTratamientoCatalogRequest } from '../models/tratamiento-catalog.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TratamientoCatalogService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  get(consultorioId: string): Observable<TratamientoCatalog> {
    return this.api.get<TratamientoCatalog>(API.consultorios.tratamientosCatalogo(consultorioId));
  }

  upsert(consultorioId: string, request: UpsertTratamientoCatalogRequest): Observable<TratamientoCatalog> {
    return this.api.put<TratamientoCatalog>(API.consultorios.tratamientosCatalogo(consultorioId), request);
  }

  restoreDefaults(consultorioId: string, mode: 'RESET' | 'ADD_MISSING'): Observable<TratamientoCatalog> {
    return this.http.post<TratamientoCatalog>(
      `${this.apiBase}${API.consultorios.tratamientosCatalogoRestoreDefaults(consultorioId)}`,
      {},
      { params: new HttpParams().set('mode', mode) },
    );
  }
}
