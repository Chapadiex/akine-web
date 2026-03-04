import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ClinicalEvent } from '../models/paciente-360.models';

@Injectable({ providedIn: 'root' })
export class HistoriaClinicaService {
  private readonly http = inject(HttpClient);

  list(pacienteId: string): Observable<ClinicalEvent[]> {
    return this.http.get<ClinicalEvent[]>('/assets/mocks/clinical-events.json').pipe(
      map(events => events
        .filter(e => e.pacienteId === pacienteId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      ),
    );
  }

  getById(id: string): Observable<ClinicalEvent> {
    return this.http.get<ClinicalEvent[]>('/assets/mocks/clinical-events.json').pipe(
      map(events => {
        const found = events.find(e => e.id === id);
        if (!found) throw new Error('Evento no encontrado');
        return found;
      }),
    );
  }
}
