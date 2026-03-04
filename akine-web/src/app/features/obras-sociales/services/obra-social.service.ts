import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  ObraSocial,
  ObraSocialFilters,
  ObraSocialUpsertRequest,
  PagedObraSocialList,
  ObraSocialEstado,
} from '../models/obra-social.models';

@Injectable({ providedIn: 'root' })
export class ObraSocialService {
  private readonly api = inject(ApiClient);

  list(consultorioId: string, filters: ObraSocialFilters): Observable<PagedObraSocialList> {
    return this.api.get<PagedObraSocialList>(API.obrasSociales.list(consultorioId, filters));
  }

  getById(consultorioId: string, id: string): Observable<ObraSocial> {
    return this.api.get<ObraSocial>(API.obrasSociales.byId(consultorioId, id));
  }

  create(consultorioId: string, req: ObraSocialUpsertRequest): Observable<ObraSocial> {
    return this.api.post<ObraSocial>(API.obrasSociales.create(consultorioId), req);
  }

  update(consultorioId: string, id: string, req: ObraSocialUpsertRequest): Observable<ObraSocial> {
    return this.api.put<ObraSocial>(API.obrasSociales.update(consultorioId, id), req);
  }

  changeStatus(consultorioId: string, id: string, estado: ObraSocialEstado): Observable<ObraSocial> {
    return this.api.patch<ObraSocial>(API.obrasSociales.changeEstado(consultorioId, id), { estado });
  }
}

