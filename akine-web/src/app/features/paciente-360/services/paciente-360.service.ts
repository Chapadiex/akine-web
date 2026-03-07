import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import { Paciente } from '../../pacientes/models/paciente.models';
import { PacienteService } from '../../pacientes/services/paciente.service';
import {
  Patient360Atenciones,
  Patient360Diagnosticos,
  Patient360Header,
  Patient360HistoriaClinica,
  Patient360ObraSocial,
  Patient360Pagos,
  Patient360Summary,
  Patient360Turnos,
} from '../models/paciente-360.models';

@Injectable({ providedIn: 'root' })
export class Paciente360Service {
  private readonly api = inject(ApiClient);
  private readonly pacienteSvc = inject(PacienteService);

  getHeader(consultorioId: string, pacienteId: string): Observable<Patient360Header> {
    return this.api.get<Patient360Header>(API.pacientes360.header(consultorioId, pacienteId)).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return this.pacienteSvc.getById(pacienteId, consultorioId).pipe(
          map((patient) => this.toLegacyHeader(consultorioId, patient)),
        );
      }),
    );
  }

  getSummary(consultorioId: string, pacienteId: string): Observable<Patient360Summary> {
    return this.api.get<Patient360Summary>(API.pacientes360.resumen(consultorioId, pacienteId)).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return this.pacienteSvc.getById(pacienteId, consultorioId).pipe(
          map((patient) => this.toLegacySummary(patient)),
        );
      }),
    );
  }

  getHistoriaClinica(
    consultorioId: string,
    pacienteId: string,
    params?: { tipo?: string; profesionalId?: string; from?: string; to?: string; page?: number; size?: number },
  ): Observable<Patient360HistoriaClinica> {
    return this.api.get<Patient360HistoriaClinica>(
      API.pacientes360.historiaClinica(consultorioId, pacienteId),
      this.cleanParams(params),
    ).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return of({
          profesionales: [],
          items: [],
          page: params?.page ?? 0,
          size: params?.size ?? 20,
          total: 0,
        });
      }),
    );
  }

  getDiagnosticos(
    consultorioId: string,
    pacienteId: string,
    params?: { page?: number; size?: number },
  ): Observable<Patient360Diagnosticos> {
    return this.api.get<Patient360Diagnosticos>(
      API.pacientes360.diagnosticos(consultorioId, pacienteId),
      this.cleanParams(params),
    ).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return of({
          totalActivos: 0,
          ultimaFechaRegistrada: null,
          items: [],
          page: params?.page ?? 0,
          size: params?.size ?? 20,
          total: 0,
        });
      }),
    );
  }

  getAtenciones(
    consultorioId: string,
    pacienteId: string,
    params?: { profesionalId?: string; from?: string; to?: string; page?: number; size?: number },
  ): Observable<Patient360Atenciones> {
    return this.api.get<Patient360Atenciones>(
      API.pacientes360.atenciones(consultorioId, pacienteId),
      this.cleanParams(params),
    ).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return of({
          total: 0,
          ultimaAsistencia: null,
          profesionales: [],
          items: [],
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        });
      }),
    );
  }

  getTurnos(
    consultorioId: string,
    pacienteId: string,
    params?: {
      scope?: string;
      profesionalId?: string;
      estado?: string;
      from?: string;
      to?: string;
      page?: number;
      size?: number;
    },
  ): Observable<Patient360Turnos> {
    return this.api.get<Patient360Turnos>(
      API.pacientes360.turnos(consultorioId, pacienteId),
      this.cleanParams(params),
    ).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return of({
          scope: params?.scope ?? 'all',
          proximosCount: 0,
          historicosCount: 0,
          canceladosCount: 0,
          profesionales: [],
          items: [],
          page: params?.page ?? 0,
          size: params?.size ?? 20,
          total: 0,
        });
      }),
    );
  }

  getObraSocial(consultorioId: string, pacienteId: string): Observable<Patient360ObraSocial> {
    return this.api.get<Patient360ObraSocial>(API.pacientes360.obraSocial(consultorioId, pacienteId)).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return this.pacienteSvc.getById(pacienteId, consultorioId).pipe(
          map((patient) => this.toLegacyObraSocial(patient)),
        );
      }),
    );
  }

  getPagos(
    consultorioId: string,
    pacienteId: string,
    params?: { page?: number; size?: number },
  ): Observable<Patient360Pagos> {
    return this.api.get<Patient360Pagos>(
      API.pacientes360.pagos(consultorioId, pacienteId),
      this.cleanParams(params),
    ).pipe(
      catchError((err) => {
        if (!this.shouldFallback(err)) throw err;
        return of({
          summary: {
            saldoPendiente: 0,
            totalCobrado: 0,
            ultimoPagoMonto: 0,
            ultimoPagoFecha: null,
            deudaVencida: 0,
          },
          items: [],
          conciliacion: [],
          page: params?.page ?? 0,
          size: params?.size ?? 20,
          total: 0,
        });
      }),
    );
  }

  private cleanParams(
    params?: Record<string, string | number | undefined>,
  ): Record<string, string | number> | undefined {
    if (!params) return undefined;
    const out = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    ) as Record<string, string | number>;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private shouldFallback(err: { status?: number } | null | undefined): boolean {
    return err?.status === 404 || err?.status === 405;
  }

  private toLegacyHeader(consultorioId: string, patient: Paciente): Patient360Header {
    const coberturaResumen = this.buildCoberturaResumen(patient);
    return {
      id: patient.id,
      consultorioId,
      dni: patient.dni,
      nombre: patient.nombre,
      apellido: patient.apellido,
      telefono: patient.telefono ?? null,
      email: patient.email ?? null,
      fechaNacimiento: patient.fechaNacimiento ?? null,
      sexo: patient.sexo ?? null,
      domicilio: patient.domicilio ?? null,
      nacionalidad: patient.nacionalidad ?? null,
      estadoCivil: patient.estadoCivil ?? null,
      profesion: patient.profesion ?? null,
      obraSocialNombre: patient.obraSocialNombre ?? null,
      obraSocialPlan: patient.obraSocialPlan ?? null,
      obraSocialNroAfiliado: patient.obraSocialNroAfiliado ?? null,
      activo: patient.activo,
      coberturaVigente: !!patient.obraSocialNombre,
      coberturaResumen,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  private toLegacySummary(patient: Paciente): Patient360Summary {
    return {
      kpis: {
        proximoTurnoFecha: null,
        proximoTurnoProfesional: null,
        proximoTurnoEstado: null,
        ultimaAtencionFecha: null,
        ultimaAtencionProfesional: null,
        ultimaAtencionResumen: null,
        diagnosticosActivos: 0,
        sesionesMes: 0,
        coberturaEstado: patient.obraSocialNombre ? 'Cobertura declarada' : 'Sin cobertura',
        saldoPendiente: 0,
      },
      alertas: patient.obraSocialNombre
        ? []
        : [{ tipo: 'info', mensaje: 'Paciente sin cobertura cargada.', route: '../obra-social' }],
      proximasAcciones: [
        { tipo: 'info', etiqueta: 'Revisar ficha administrativa', route: '../resumen', fechaReferencia: null },
      ],
      actividadReciente: [],
    };
  }

  private toLegacyObraSocial(patient: Paciente): Patient360ObraSocial {
    return {
      overview: {
        obraSocialNombre: patient.obraSocialNombre ?? null,
        plan: patient.obraSocialPlan ?? null,
        nroAfiliado: patient.obraSocialNroAfiliado ?? null,
        vigente: !!patient.obraSocialNombre,
        fechaVencimiento: null,
        tipoCobertura: null,
        valorCobertura: null,
        tipoCoseguro: null,
        valorCoseguro: null,
        observacionesPlan: null,
      },
      coverage: {
        prestacionesSinAutorizacion: null,
        sesionesUsadasMes: 0,
        sesionesDisponibles: null,
        autorizacionRequerida: false,
        estadoCobertura: patient.obraSocialNombre ? 'Declarada en ficha' : 'Sin cobertura',
      },
      adjuntos: [],
    };
  }

  private buildCoberturaResumen(patient: Paciente): string {
    if (!patient.obraSocialNombre) return 'Sin cobertura';
    const plan = patient.obraSocialPlan?.trim();
    return plan ? `${patient.obraSocialNombre} - ${plan}` : patient.obraSocialNombre;
  }
}
