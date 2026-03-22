import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  AperturaCajaRequest,
  CajaDiaria,
  CierreCajaRequest,
  MovimientoCaja,
} from '../models/caja.models';

@Injectable({ providedIn: 'root' })
export class CajaDiariaService {
  private api = inject(ApiClient);

  abrir(consultorioId: string, req: AperturaCajaRequest): Observable<CajaDiaria> {
    return this.api.post<CajaDiaria>(API.caja.abrir(consultorioId), req);
  }

  byId(consultorioId: string, cajaId: string): Observable<CajaDiaria> {
    return this.api.get<CajaDiaria>(API.caja.byId(consultorioId, cajaId));
  }

  byFecha(consultorioId: string, fecha: string): Observable<CajaDiaria[]> {
    return this.api.get<CajaDiaria[]>(API.caja.byFecha(consultorioId, fecha));
  }

  cerrar(consultorioId: string, cajaId: string, req: CierreCajaRequest): Observable<CajaDiaria> {
    return this.api.post<CajaDiaria>(API.caja.cerrar(consultorioId, cajaId), req);
  }

  movimientos(consultorioId: string, cajaId: string): Observable<MovimientoCaja[]> {
    return this.api.get<MovimientoCaja[]>(API.caja.movimientos(consultorioId, cajaId));
  }
}
