import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { ConfiguracionConsultorio } from '../models/configuracion-consultorio.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionConsultorioService {
  private api = inject(ApiClient);

  get(consultorioId: string): Observable<ConfiguracionConsultorio> {
    return this.api.get<ConfiguracionConsultorio>(API.configuracionConsultorio.get(consultorioId));
  }

  upsert(consultorioId: string, config: Partial<ConfiguracionConsultorio>): Observable<ConfiguracionConsultorio> {
    return this.api.put<ConfiguracionConsultorio>(API.configuracionConsultorio.upsert(consultorioId), config);
  }
}
