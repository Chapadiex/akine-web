import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, concatMap, from, map, of, reduce, switchMap, throwError } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { CreateFeriadoRequest, Feriado } from '../../turnos/models/turno.models';

export interface FeriadoSyncResponse {
  year: number;
  fetched: number;
  created: number;
  skippedExisting: number;
}

@Injectable({ providedIn: 'root' })
export class FeriadoService {
  private api = inject(ApiClient);
  private http = inject(HttpClient);

  list(consultorioId: string, year?: number): Observable<Feriado[]> {
    const params: Record<string, string | number> = {};
    if (year) params['year'] = year;
    return this.api.get<Feriado[]>(API.feriados.list(consultorioId), params);
  }

  create(consultorioId: string, req: CreateFeriadoRequest): Observable<Feriado> {
    return this.api.post<Feriado>(API.feriados.create(consultorioId), req);
  }

  delete(consultorioId: string, feriadoId: string): Observable<void> {
    return this.api.delete<void>(API.feriados.delete(consultorioId, feriadoId));
  }

  syncNacionales(consultorioId: string, year: number): Observable<FeriadoSyncResponse> {
    return this.api.post<FeriadoSyncResponse>(API.feriados.syncNacionales(consultorioId, year), {});
  }

  syncNacionalesCompat(consultorioId: string, year: number): Observable<FeriadoSyncResponse> {
    return this.syncNacionales(consultorioId, year).pipe(
      catchError((err) => {
        const status = Number(err?.status ?? 0);
        const shouldUseCompat =
          status === 0 ||
          status === 404 ||
          status === 405 ||
          status >= 500;

        if (!shouldUseCompat) {
          return throwError(() => err);
        }
        return this.syncNacionalesLegacy(consultorioId, year);
      })
    );
  }

  private syncNacionalesLegacy(consultorioId: string, year: number): Observable<FeriadoSyncResponse> {
    return this.http.get<ArgentinaDatosFeriadoItem[]>(`https://api.argentinadatos.com/v1/feriados/${year}`).pipe(
      switchMap((items) => {
        const uniqueByDate = new Map<string, ArgentinaDatosFeriadoItem>();
        for (const item of items ?? []) {
          if (!item?.fecha || !item?.nombre) continue;
          if (!uniqueByDate.has(item.fecha)) uniqueByDate.set(item.fecha, item);
        }

        const normalized = Array.from(uniqueByDate.values());
        const fetched = normalized.length;
        if (fetched === 0) {
          return of({ year, fetched: 0, created: 0, skippedExisting: 0 });
        }

        return from(normalized).pipe(
          concatMap((item) =>
            this.create(consultorioId, {
              fecha: item.fecha,
              descripcion: this.buildDescripcion(item),
            }).pipe(
              map(() => 1),
              catchError((err) => {
                if (err?.status === 409) return of(0);
                return throwError(() => err);
              })
            )
          ),
          reduce((acc, current) => acc + current, 0),
          map((created) => ({ year, fetched, created, skippedExisting: fetched - created }))
        );
      })
    );
  }

  private buildDescripcion(item: ArgentinaDatosFeriadoItem): string {
    const base = item.tipo ? `${item.nombre} (${item.tipo})` : item.nombre;
    return base.length > 200 ? base.slice(0, 200) : base;
  }
}

interface ArgentinaDatosFeriadoItem {
  fecha: string;
  tipo?: string;
  nombre: string;
}
