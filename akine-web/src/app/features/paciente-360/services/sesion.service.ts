import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Session } from '../models/paciente-360.models';

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly http = inject(HttpClient);

  list(pacienteId: string): Observable<Session[]> {
    return this.http.get<Session[]>('/assets/mocks/sesiones.json').pipe(
      map(items => items
        .filter(s => s.pacienteId === pacienteId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      ),
    );
  }
}
