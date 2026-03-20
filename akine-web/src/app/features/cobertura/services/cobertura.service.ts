import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FinanciadorSalud, PlanFinanciador, PacienteCobertura } from '../models/cobertura.models';

@Injectable({
  providedIn: 'root'
})
export class CoberturaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/api/v1/cobertura`;

  // Financiadores
  getFinanciadores(consultorioId: string): Observable<FinanciadorSalud[]> {
    return this.http.get<FinanciadorSalud[]>(`${this.apiUrl}/financiadores`, {
      params: { consultorioId }
    });
  }

  seedFinanciadores(consultorioId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/financiadores/seed`, null, {
      params: { consultorioId }
    });
  }

  getFinanciadorById(id: string): Observable<FinanciadorSalud> {
    return this.http.get<FinanciadorSalud>(`${this.apiUrl}/financiadores/${id}`);
  }

  createFinanciador(financiador: FinanciadorSalud): Observable<FinanciadorSalud> {
    return this.http.post<FinanciadorSalud>(`${this.apiUrl}/financiadores`, financiador);
  }

  updateFinanciador(id: string, financiador: FinanciadorSalud): Observable<FinanciadorSalud> {
    return this.http.put<FinanciadorSalud>(`${this.apiUrl}/financiadores/${id}`, financiador);
  }

  // Planes
  getPlanesByFinanciador(financiadorId: string): Observable<PlanFinanciador[]> {
    return this.http.get<PlanFinanciador[]>(`${this.apiUrl}/planes/financiador/${financiadorId}`);
  }

  createPlan(plan: PlanFinanciador): Observable<PlanFinanciador> {
    return this.http.post<PlanFinanciador>(`${this.apiUrl}/planes`, plan);
  }

  updatePlan(id: string, plan: PlanFinanciador): Observable<PlanFinanciador> {
    return this.http.put<PlanFinanciador>(`${this.apiUrl}/planes/${id}`, plan);
  }

  // Paciente Cobertura
  getCoberturasPaciente(pacienteId: string): Observable<PacienteCobertura[]> {
    return this.http.get<PacienteCobertura[]>(`${this.apiUrl}/pacientes/${pacienteId}/coberturas`);
  }

  createPacienteCobertura(cobertura: PacienteCobertura): Observable<PacienteCobertura> {
    return this.http.post<PacienteCobertura>(`${this.apiUrl}/pacientes`, cobertura);
  }
}
