import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  AntecedenteCatalog,
  RestoreDefaultsMode,
  UpsertAntecedenteCatalogRequest,
} from '../models/antecedente-catalog.models';

@Injectable({ providedIn: 'root' })
export class AntecedenteCatalogService {
  private api = inject(ApiClient);

  get(consultorioId: string): Observable<AntecedenteCatalog> {
    return this.api.get<AntecedenteCatalog>(API.consultorios.antecedentesCatalogo(consultorioId));
  }

  upsert(
    consultorioId: string,
    request: UpsertAntecedenteCatalogRequest,
  ): Observable<AntecedenteCatalog> {
    return this.api.put<AntecedenteCatalog>(
      API.consultorios.antecedentesCatalogo(consultorioId),
      request,
    );
  }

  restoreDefaults(
    consultorioId: string,
    mode: RestoreDefaultsMode,
  ): Observable<AntecedenteCatalog> {
    return this.api.post<AntecedenteCatalog>(
      `${API.consultorios.antecedentesRestoreDefaults(consultorioId)}?mode=${mode}`,
      {},
    );
  }
}

