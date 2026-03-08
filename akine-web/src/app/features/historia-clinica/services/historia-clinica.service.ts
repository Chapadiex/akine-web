import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  AdjuntoClinicoResponse,
  ClinicalDownload,
  CreateHistoriaClinicaRequest,
  DiagnosticoClinicoEstadoRequest,
  DiagnosticoClinicoRequest,
  DiagnosticoClinicoResponse,
  HistoriaClinicaAntecedenteItem,
  HistoriaClinicaAntecedentesUpdateRequest,
  HistoriaClinicaOverview,
  HistoriaClinicaPaciente,
  HistoriaClinicaSesionQuery,
  HistoriaClinicaTimelineEvent,
  HistoriaClinicaWorkspace,
  HistoriaClinicaWorkspaceQuery,
  SesionClinicaRequest,
  SesionClinicaResponse,
} from '../models/historia-clinica.models';

@Injectable({ providedIn: 'root' })
export class HistoriaClinicaService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  getWorkspace(consultorioId: string, params?: HistoriaClinicaWorkspaceQuery): Observable<HistoriaClinicaWorkspace> {
    return this.api.get<HistoriaClinicaWorkspace>(
      API.historiaClinicaGlobal.workspace(consultorioId),
      this.cleanParams(params),
    );
  }

  getPaciente(consultorioId: string, pacienteId: string): Observable<HistoriaClinicaPaciente> {
    return this.api.get<HistoriaClinicaPaciente>(API.historiaClinicaGlobal.paciente(consultorioId, pacienteId));
  }

  getOverview(consultorioId: string, pacienteId: string): Observable<HistoriaClinicaOverview> {
    return this.api.get<HistoriaClinicaOverview>(
      API.historiaClinicaGlobal.overview(consultorioId, pacienteId),
    );
  }

  createLegajo(
    consultorioId: string,
    pacienteId: string,
    body: CreateHistoriaClinicaRequest,
  ): Observable<HistoriaClinicaOverview> {
    return this.api.post<HistoriaClinicaOverview>(
      API.historiaClinicaGlobal.legajo(consultorioId, pacienteId),
      body,
    );
  }

  getAntecedentes(consultorioId: string, pacienteId: string): Observable<HistoriaClinicaAntecedenteItem[]> {
    return this.api.get<HistoriaClinicaAntecedenteItem[]>(
      API.historiaClinicaGlobal.antecedentes(consultorioId, pacienteId),
    );
  }

  updateAntecedentes(
    consultorioId: string,
    pacienteId: string,
    antecedentes: HistoriaClinicaAntecedenteItem[],
  ): Observable<HistoriaClinicaAntecedenteItem[]> {
    const body: HistoriaClinicaAntecedentesUpdateRequest = { antecedentes };
    return this.api.put<HistoriaClinicaAntecedenteItem[]>(
      API.historiaClinicaGlobal.antecedentes(consultorioId, pacienteId),
      body,
    );
  }

  getTimeline(
    consultorioId: string,
    pacienteId: string,
    type = 'all',
  ): Observable<HistoriaClinicaTimelineEvent[]> {
    return this.api.get<HistoriaClinicaTimelineEvent[]>(
      API.historiaClinicaGlobal.timeline(consultorioId, pacienteId),
      this.cleanParams({ type }),
    );
  }

  listSesiones(
    consultorioId: string,
    pacienteId: string,
    params?: HistoriaClinicaSesionQuery,
  ): Observable<SesionClinicaResponse[]> {
    return this.api.get<SesionClinicaResponse[]>(
      API.historiaClinicaGlobal.sesiones(consultorioId, pacienteId),
      this.cleanParams(params),
    );
  }

  getSesion(consultorioId: string, pacienteId: string, sesionId: string): Observable<SesionClinicaResponse> {
    return this.api.get<SesionClinicaResponse>(
      API.historiaClinicaGlobal.sesion(consultorioId, pacienteId, sesionId),
    );
  }

  createSesion(
    consultorioId: string,
    pacienteId: string,
    body: SesionClinicaRequest,
  ): Observable<SesionClinicaResponse> {
    return this.api.post<SesionClinicaResponse>(API.historiaClinicaGlobal.sesiones(consultorioId, pacienteId), body);
  }

  updateSesion(
    consultorioId: string,
    pacienteId: string,
    sesionId: string,
    body: SesionClinicaRequest,
  ): Observable<SesionClinicaResponse> {
    return this.api.put<SesionClinicaResponse>(
      API.historiaClinicaGlobal.sesion(consultorioId, pacienteId, sesionId),
      body,
    );
  }

  closeSesion(consultorioId: string, pacienteId: string, sesionId: string): Observable<SesionClinicaResponse> {
    return this.api.post<SesionClinicaResponse>(
      API.historiaClinicaGlobal.cerrarSesion(consultorioId, pacienteId, sesionId),
      {},
    );
  }

  annulSesion(consultorioId: string, pacienteId: string, sesionId: string): Observable<SesionClinicaResponse> {
    return this.api.post<SesionClinicaResponse>(
      API.historiaClinicaGlobal.anularSesion(consultorioId, pacienteId, sesionId),
      {},
    );
  }

  listDiagnosticos(consultorioId: string, pacienteId: string): Observable<DiagnosticoClinicoResponse[]> {
    return this.api.get<DiagnosticoClinicoResponse[]>(
      API.historiaClinicaGlobal.diagnosticos(consultorioId, pacienteId),
    );
  }

  createDiagnostico(
    consultorioId: string,
    pacienteId: string,
    body: DiagnosticoClinicoRequest,
  ): Observable<DiagnosticoClinicoResponse> {
    return this.api.post<DiagnosticoClinicoResponse>(
      API.historiaClinicaGlobal.diagnosticos(consultorioId, pacienteId),
      body,
    );
  }

  updateDiagnostico(
    consultorioId: string,
    pacienteId: string,
    diagnosticoId: string,
    body: DiagnosticoClinicoRequest,
  ): Observable<DiagnosticoClinicoResponse> {
    return this.api.put<DiagnosticoClinicoResponse>(
      API.historiaClinicaGlobal.diagnostico(consultorioId, pacienteId, diagnosticoId),
      body,
    );
  }

  resolveDiagnostico(
    consultorioId: string,
    pacienteId: string,
    diagnosticoId: string,
    body: DiagnosticoClinicoEstadoRequest,
  ): Observable<DiagnosticoClinicoResponse> {
    return this.api.post<DiagnosticoClinicoResponse>(
      API.historiaClinicaGlobal.resolverDiagnostico(consultorioId, pacienteId, diagnosticoId),
      body,
    );
  }

  discardDiagnostico(
    consultorioId: string,
    pacienteId: string,
    diagnosticoId: string,
    body: DiagnosticoClinicoEstadoRequest,
  ): Observable<DiagnosticoClinicoResponse> {
    return this.api.post<DiagnosticoClinicoResponse>(
      API.historiaClinicaGlobal.descartarDiagnostico(consultorioId, pacienteId, diagnosticoId),
      body,
    );
  }

  uploadAdjunto(
    consultorioId: string,
    pacienteId: string,
    sesionId: string,
    file: File,
  ): Observable<AdjuntoClinicoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<AdjuntoClinicoResponse>(
      API.historiaClinicaGlobal.adjuntos(consultorioId, pacienteId, sesionId),
      formData,
    );
  }

  downloadAdjunto(
    consultorioId: string,
    pacienteId: string,
    adjuntoId: string,
  ): Observable<ClinicalDownload> {
    return this.http
      .get(`${this.apiBase}${API.historiaClinicaGlobal.adjunto(consultorioId, pacienteId, adjuntoId)}`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response: HttpResponse<Blob>) => ({
          filename: this.resolveFilename(response) ?? 'adjunto-clinico',
          blob: response.body ?? new Blob(),
        })),
      );
  }

  deleteAdjunto(consultorioId: string, pacienteId: string, adjuntoId: string): Observable<void> {
    return this.api.delete<void>(API.historiaClinicaGlobal.adjunto(consultorioId, pacienteId, adjuntoId));
  }

  private cleanParams<T extends object>(params?: T): Record<string, string | number> | undefined {
    if (!params) return undefined;
    const out = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) =>
          value !== undefined && value !== null && value !== '' && typeof value !== 'object',
      ),
    ) as Record<string, string | number>;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private resolveFilename(response: HttpResponse<Blob>): string | null {
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    return match?.[1] ?? null;
  }
}
