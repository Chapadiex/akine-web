import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { GenerarLoteOsRequest, LoteFacturacionOs } from '../models/facturacion.models';

@Injectable({ providedIn: 'root' })
export class LoteFacturacionOsService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<LoteFacturacionOs[]> {
    return this.api.get<LoteFacturacionOs[]>(API.lotesOs.list(consultorioId));
  }

  byId(consultorioId: string, loteId: string): Observable<LoteFacturacionOs> {
    return this.api.get<LoteFacturacionOs>(API.lotesOs.byId(consultorioId, loteId));
  }

  generar(consultorioId: string, req: GenerarLoteOsRequest): Observable<LoteFacturacionOs> {
    return this.api.post<LoteFacturacionOs>(API.lotesOs.generar(consultorioId), req);
  }

  cerrar(consultorioId: string, loteId: string): Observable<LoteFacturacionOs> {
    return this.api.post<LoteFacturacionOs>(API.lotesOs.cerrar(consultorioId, loteId), {});
  }

  presentar(consultorioId: string, loteId: string): Observable<LoteFacturacionOs> {
    return this.api.post<LoteFacturacionOs>(API.lotesOs.presentar(consultorioId, loteId), {});
  }
}
