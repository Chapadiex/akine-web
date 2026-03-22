import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { ImputarPagoOsRequest, PagoObraSocial, RegistrarPagoOsRequest } from '../models/facturacion.models';

@Injectable({ providedIn: 'root' })
export class PagoObraSocialService {
  private api = inject(ApiClient);

  list(consultorioId: string): Observable<PagoObraSocial[]> {
    return this.api.get<PagoObraSocial[]>(API.pagosOs.list(consultorioId));
  }

  byLote(consultorioId: string, loteId: string): Observable<PagoObraSocial[]> {
    return this.api.get<PagoObraSocial[]>(API.pagosOs.byLote(consultorioId, loteId));
  }

  registrar(consultorioId: string, req: RegistrarPagoOsRequest): Observable<PagoObraSocial> {
    return this.api.post<PagoObraSocial>(API.pagosOs.registrar(consultorioId), req);
  }

  imputar(consultorioId: string, pagoId: string, req: ImputarPagoOsRequest): Observable<PagoObraSocial> {
    return this.api.post<PagoObraSocial>(API.pagosOs.imputar(consultorioId, pagoId), req);
  }
}
