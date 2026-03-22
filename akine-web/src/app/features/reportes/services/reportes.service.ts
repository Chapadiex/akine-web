import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  ReporteCajaDia,
  ReporteCopagosPendientes,
  ReporteFacturadoVsCobrado,
  ReporteProductividad,
  ReporteSesionBloqueada,
} from '../models/reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private api = inject(ApiClient);

  cajaDia(consultorioId: string, cajaId: string): Observable<ReporteCajaDia> {
    return this.api.get<ReporteCajaDia>(API.reportes.cajaDia(consultorioId, cajaId));
  }

  facturadoVsCobrado(consultorioId: string): Observable<ReporteFacturadoVsCobrado[]> {
    return this.api.get<ReporteFacturadoVsCobrado[]>(API.reportes.facturadoVsCobrado(consultorioId));
  }

  sesionesBloqueadas(consultorioId: string): Observable<ReporteSesionBloqueada[]> {
    return this.api.get<ReporteSesionBloqueada[]>(API.reportes.sesionesBloqueadas(consultorioId));
  }

  copagosPendientes(consultorioId: string): Observable<ReporteCopagosPendientes[]> {
    return this.api.get<ReporteCopagosPendientes[]>(API.reportes.copagosPendientes(consultorioId));
  }

  productividad(consultorioId: string): Observable<ReporteProductividad[]> {
    return this.api.get<ReporteProductividad[]>(API.reportes.productividad(consultorioId));
  }
}
