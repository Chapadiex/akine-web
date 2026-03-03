import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Paciente, PacienteRequest, PacienteSearchResult } from '../models/paciente.models';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly api = inject(ApiClient);

  createMe(req: PacienteRequest): Observable<Paciente> {
    return this.api.post<Paciente>(API.pacientes.me, req);
  }

  getMe(): Observable<Paciente> {
    return this.api.get<Paciente>(API.pacientes.me);
  }

  createAdmin(consultorioId: string, req: PacienteRequest): Observable<Paciente> {
    return this.api.post<Paciente>(API.pacientes.create(consultorioId), req);
  }

  list(consultorioId: string): Observable<PacienteSearchResult[]> {
    return this.api.get<PacienteSearchResult[]>(API.pacientes.list(consultorioId)).pipe(
      // Compatibilidad con backend viejo sin GET /api/v1/pacientes
      catchError((err: { status?: number }) => {
        if (err?.status === 404 || err?.status === 405) {
          return this.listFromLegacySearch(consultorioId);
        }
        return throwError(() => err);
      }),
    );
  }

  search(consultorioId: string, dni?: string, q?: string): Observable<PacienteSearchResult[]> {
    return this.api.get<PacienteSearchResult[]>(API.pacientes.search(consultorioId, dni, q));
  }

  getById(id: string, consultorioId: string): Observable<Paciente> {
    return this.api.get<Paciente>(API.pacientes.byId(id, consultorioId));
  }

  private listFromLegacySearch(consultorioId: string): Observable<PacienteSearchResult[]> {
    // Backend legado: no tiene GET /pacientes y search limita por query.
    // Se consultan varias letras frecuentes y se mergea/deduplica.
    const probes = ['a', 'e', 'i', 'o', 'u', 'n', 'r', 's', 'l', 'm', 'd', 't'];
    return forkJoin(
      probes.map((q) =>
        this.search(consultorioId, undefined, q).pipe(
          catchError(() => of([] as PacienteSearchResult[])),
        ),
      ),
    ).pipe(
      map((chunks) => {
        const mapById = new Map<string, PacienteSearchResult>();
        for (const arr of chunks) {
          for (const item of arr) {
            if (!item.linkedToConsultorio) continue;
            if (!mapById.has(item.id)) mapById.set(item.id, item);
          }
        }
        return Array.from(mapById.values());
      }),
    );
  }
}
