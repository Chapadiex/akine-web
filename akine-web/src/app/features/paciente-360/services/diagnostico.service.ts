import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Diagnosis } from '../models/paciente-360.models';

@Injectable({ providedIn: 'root' })
export class DiagnosticoService {
  private readonly http = inject(HttpClient);

  list(pacienteId: string): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>('/assets/mocks/diagnosticos.json').pipe(
      map(items => items.filter(d => d.pacienteId === pacienteId)),
    );
  }
}
