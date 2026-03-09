import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  DiagnosticosMedicos,
  UpsertDiagnosticosMedicosRequest,
} from '../models/diagnosticos-medicos.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DiagnosticosMedicosService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  get(consultorioId: string): Observable<DiagnosticosMedicos> {
    return this.api.get<DiagnosticosMedicos>(API.consultorios.diagnosticosMedicos(consultorioId));
  }

  upsert(
    consultorioId: string,
    request: UpsertDiagnosticosMedicosRequest,
  ): Observable<DiagnosticosMedicos> {
    return this.api.put<DiagnosticosMedicos>(API.consultorios.diagnosticosMedicos(consultorioId), request);
  }

  restoreDefaults(consultorioId: string, mode: 'RESET' | 'ADD_MISSING'): Observable<DiagnosticosMedicos> {
    return this.http.post<DiagnosticosMedicos>(
      `${this.apiBase}${API.consultorios.diagnosticosMedicosRestoreDefaults(consultorioId)}`,
      {},
      { params: new HttpParams().set('mode', mode) },
    );
  }
}
