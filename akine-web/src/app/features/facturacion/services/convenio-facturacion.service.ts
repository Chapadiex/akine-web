import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  ActualizarArancelesRequest,
  ActualizarConvenioRequest,
  Convenio,
  ConvenioVersion,
  FinanciadorSalud,
  NuevoArancelRequest,
  NuevoConvenioRequest,
  PlanFinanciador,
  Prestacion,
  RenovarConvenioRequest,
} from '../models/facturacion.models';

@Injectable({ providedIn: 'root' })
export class ConvenioFacturacionService {
  private api = inject(ApiClient);

  listByConsultorio(consultorioId: string): Observable<Convenio[]> {
    return this.api.get<Convenio[]>(API.convenios.byConsultorio(consultorioId));
  }

  findById(id: string): Observable<Convenio> {
    return this.api.get<Convenio>(API.convenios.byId(id));
  }

  create(consultorioId: string, req: NuevoConvenioRequest): Observable<Convenio> {
    return this.api.post<Convenio>(API.convenios.create(consultorioId), req);
  }

  update(id: string, req: ActualizarConvenioRequest): Observable<Convenio> {
    return this.api.patch<Convenio>(API.convenios.update(id), req);
  }

  cambiarEstado(id: string, estado: string, motivo?: string): Observable<Convenio> {
    return this.api.patch<Convenio>(API.convenios.cambiarEstado(id), { estado, motivo });
  }

  agregarArancel(convenioId: string, req: NuevoArancelRequest): Observable<Convenio> {
    return this.api.post<Convenio>(API.convenios.agregarArancel(convenioId), req);
  }

  renovar(id: string, req: RenovarConvenioRequest): Observable<Convenio> {
    return this.api.post<Convenio>(API.convenios.renovar(id), req);
  }

  bulkUpdateAranceles(id: string, req: ActualizarArancelesRequest): Observable<Convenio> {
    return this.api.post<Convenio>(API.convenios.bulkUpdateAranceles(id), req);
  }

  versiones(id: string): Observable<ConvenioVersion[]> {
    return this.api.get<ConvenioVersion[]>(API.convenios.versiones(id));
  }

  nomenclador(): Observable<Prestacion[]> {
    return this.api.get<Prestacion[]>(API.nomenclador.list);
  }

  financiadoresByConsultorio(consultorioId: string): Observable<FinanciadorSalud[]> {
    return this.api.get<FinanciadorSalud[]>(API.financiadores.byConsultorio(consultorioId));
  }

  planesByFinanciador(financiadorId: string): Observable<PlanFinanciador[]> {
    return this.api.get<PlanFinanciador[]>(API.financiadores.planesByFinanciador(financiadorId));
  }
}
