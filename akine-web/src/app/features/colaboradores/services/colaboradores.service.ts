import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  CargoEmpleadoCatalogo,
  CargoEmpleadoUpsertRequest,
  ColaboradorEmpleado,
  ColaboradorEstadoRequest,
  ColaboradorProfesional,
  EmpleadoColaboradorRequest,
  ProfesionalColaboradorRequest,
} from '../models/colaboradores.models';

@Injectable({ providedIn: 'root' })
export class ColaboradoresService {
  private readonly api = inject(ApiClient);

  listProfesionales(
    consultorioId: string,
    filters?: { q?: string; matricula?: string; especialidades?: string[]; activo?: boolean },
  ): Observable<ColaboradorProfesional[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.matricula) params.set('matricula', filters.matricula);
    if (filters?.activo !== undefined) params.set('activo', String(filters.activo));
    for (const especialidad of filters?.especialidades ?? []) {
      params.append('especialidades', especialidad);
    }
    const query = params.toString();
    const base = API.consultorios.colaboradoresProfesionales(consultorioId);
    return this.api.get<ColaboradorProfesional[]>(query ? `${base}?${query}` : base);
  }

  getProfesional(consultorioId: string, profesionalId: string): Observable<ColaboradorProfesional> {
    return this.api.get<ColaboradorProfesional>(
      API.consultorios.colaboradorProfesionalById(consultorioId, profesionalId),
    );
  }

  createProfesional(
    consultorioId: string,
    req: ProfesionalColaboradorRequest,
  ): Observable<ColaboradorProfesional> {
    return this.api.post<ColaboradorProfesional>(
      API.consultorios.colaboradoresProfesionales(consultorioId),
      req,
    );
  }

  updateProfesional(
    consultorioId: string,
    profesionalId: string,
    req: ProfesionalColaboradorRequest,
  ): Observable<ColaboradorProfesional> {
    return this.api.put<ColaboradorProfesional>(
      API.consultorios.colaboradorProfesionalById(consultorioId, profesionalId),
      req,
    );
  }

  changeProfesionalEstado(
    consultorioId: string,
    profesionalId: string,
    req: ColaboradorEstadoRequest,
  ): Observable<ColaboradorProfesional> {
    return this.api.patch<ColaboradorProfesional>(
      API.consultorios.colaboradorProfesionalEstado(consultorioId, profesionalId),
      req,
    );
  }

  crearCuentaProfesional(
    consultorioId: string,
    profesionalId: string,
    email?: string,
  ): Observable<ColaboradorProfesional> {
    return this.api.post<ColaboradorProfesional>(
      API.consultorios.colaboradorProfesionalCrearCuenta(consultorioId, profesionalId),
      email ? { email } : {},
    );
  }

  reenviarActivacionProfesional(
    consultorioId: string,
    profesionalId: string,
  ): Observable<ColaboradorProfesional> {
    return this.api.post<ColaboradorProfesional>(
      API.consultorios.colaboradorProfesionalReenviar(consultorioId, profesionalId),
      {},
    );
  }

  listEmpleados(
    consultorioId: string,
    filters?: { q?: string; cargo?: string; activo?: boolean },
  ): Observable<ColaboradorEmpleado[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.cargo) params.set('cargo', filters.cargo);
    if (filters?.activo !== undefined) params.set('activo', String(filters.activo));
    const query = params.toString();
    const base = API.consultorios.colaboradoresEmpleados(consultorioId);
    return this.api.get<ColaboradorEmpleado[]>(query ? `${base}?${query}` : base);
  }

  listCargosEmpleado(
    consultorioId: string,
    filters?: { search?: string; includeInactive?: boolean },
  ): Observable<CargoEmpleadoCatalogo[]> {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    if (filters?.includeInactive !== undefined) params.set('includeInactive', String(filters.includeInactive));
    const query = params.toString();
    const base = API.consultorios.colaboradorCargosEmpleado(consultorioId);
    return this.api.get<CargoEmpleadoCatalogo[]>(query ? `${base}?${query}` : base);
  }

  createCargoEmpleado(consultorioId: string, req: CargoEmpleadoUpsertRequest): Observable<CargoEmpleadoCatalogo> {
    return this.api.post<CargoEmpleadoCatalogo>(API.consultorios.colaboradorCargosEmpleado(consultorioId), req);
  }

  updateCargoEmpleado(
    consultorioId: string,
    cargoId: string,
    req: CargoEmpleadoUpsertRequest,
  ): Observable<CargoEmpleadoCatalogo> {
    return this.api.put<CargoEmpleadoCatalogo>(
      API.consultorios.colaboradorCargoEmpleadoById(consultorioId, cargoId),
      req,
    );
  }

  activateCargoEmpleado(consultorioId: string, cargoId: string): Observable<CargoEmpleadoCatalogo> {
    return this.api.patch<CargoEmpleadoCatalogo>(
      API.consultorios.colaboradorCargoEmpleadoActivar(consultorioId, cargoId),
      {},
    );
  }

  deactivateCargoEmpleado(consultorioId: string, cargoId: string): Observable<CargoEmpleadoCatalogo> {
    return this.api.patch<CargoEmpleadoCatalogo>(
      API.consultorios.colaboradorCargoEmpleadoDesactivar(consultorioId, cargoId),
      {},
    );
  }

  getEmpleado(consultorioId: string, empleadoId: string): Observable<ColaboradorEmpleado> {
    return this.api.get<ColaboradorEmpleado>(
      API.consultorios.colaboradorEmpleadoById(consultorioId, empleadoId),
    );
  }

  createEmpleado(
    consultorioId: string,
    req: EmpleadoColaboradorRequest,
  ): Observable<ColaboradorEmpleado> {
    return this.api.post<ColaboradorEmpleado>(API.consultorios.colaboradoresEmpleados(consultorioId), req);
  }

  updateEmpleado(
    consultorioId: string,
    empleadoId: string,
    req: EmpleadoColaboradorRequest,
  ): Observable<ColaboradorEmpleado> {
    return this.api.put<ColaboradorEmpleado>(
      API.consultorios.colaboradorEmpleadoById(consultorioId, empleadoId),
      req,
    );
  }

  changeEmpleadoEstado(
    consultorioId: string,
    empleadoId: string,
    req: ColaboradorEstadoRequest,
  ): Observable<ColaboradorEmpleado> {
    return this.api.patch<ColaboradorEmpleado>(
      API.consultorios.colaboradorEmpleadoEstado(consultorioId, empleadoId),
      req,
    );
  }

  reenviarActivacionEmpleado(consultorioId: string, empleadoId: string): Observable<ColaboradorEmpleado> {
    return this.api.post<ColaboradorEmpleado>(
      API.consultorios.colaboradorEmpleadoReenviar(consultorioId, empleadoId),
      {},
    );
  }
}
