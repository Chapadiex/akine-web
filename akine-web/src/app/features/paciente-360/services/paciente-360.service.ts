import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Paciente } from '../../pacientes/models/paciente.models';
import { PatientAlert, PatientSummary } from '../models/paciente-360.models';

@Injectable({ providedIn: 'root' })
export class Paciente360Service {
  private readonly http = inject(HttpClient);

  getDetail(id: string): Observable<Paciente> {
    return this.http.get<Paciente[]>('/assets/mocks/paciente-detail.json').pipe(
      map(list => {
        const found = list.find(p => p.id === id);
        if (!found) throw new Error('Paciente no encontrado');
        return found;
      }),
    );
  }

  getSummary(pacienteId: string): Observable<PatientSummary> {
    // In production this would be a single API call; here we compose from mock data
    return this.http.get<Paciente[]>('/assets/mocks/paciente-detail.json').pipe(
      map(() => {
        const alertas: PatientAlert[] = [
          { id: 'a1', tipo: 'WARNING', mensaje: 'Obra social vence en 15 días' },
          { id: 'a2', tipo: 'ERROR', mensaje: 'Sin atención hace +60 días' },
        ];

        const summary: PatientSummary = {
          proximoTurnoId: 't1',
          proximoTurnoFecha: '2026-03-05T10:30:00Z',
          proximoTurnoProfesional: 'Dr. García — Centro A, Box 2',
          proximoTurnoEstado: 'CONFIRMADO',
          ultimaAtencionId: 's1',
          ultimaAtencionFecha: '2026-02-24T15:00:00Z',
          ultimaAtencionProfesional: 'Dra. López',
          ultimaAtencionResumen: 'Sesión de seguimiento',
          diagnosticosActivos: [
            { id: 'd1', pacienteId: pacienteId, nombre: 'Trastorno de ansiedad generalizada', estado: 'ACTIVO', fechaInicio: '2024-12-15' },
            { id: 'd2', pacienteId: pacienteId, nombre: 'Cervicalgia crónica', estado: 'ACTIVO', fechaInicio: '2024-06-10' },
            { id: 'd3', pacienteId: pacienteId, nombre: 'Hipotiroidismo', estado: 'ACTIVO', fechaInicio: '2023-01-20' },
          ],
          alertas,
        };
        return summary;
      }),
    );
  }
}
