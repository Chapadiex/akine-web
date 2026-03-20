import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { 
  ConvenioFinanciador, 
  PrestacionArancelable, 
  ConvenioPrestacionValor,
  LotePresentacion,
  ConciliacionAtencion 
} from '../models/facturacion.models';

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/v1/facturacion`;

  // Convenios
  getConveniosByFinanciador(financiadorId: string): Observable<ConvenioFinanciador[]> {
    return this.http.get<ConvenioFinanciador[]>(`${this.apiUrl}/convenios/financiador/${financiadorId}`);
  }

  createConvenio(convenio: ConvenioFinanciador): Observable<ConvenioFinanciador> {
    return this.http.post<ConvenioFinanciador>(`${this.apiUrl}/convenios`, convenio);
  }

  // Prestaciones
  getPrestaciones(): Observable<PrestacionArancelable[]> {
    return this.http.get<PrestacionArancelable[]>(`${this.apiUrl}/prestaciones`);
  }

  // Aranceles
  getArancelesByConvenio(convenioId: string): Observable<ConvenioPrestacionValor[]> {
    return this.http.get<ConvenioPrestacionValor[]>(`${this.apiUrl}/aranceles/convenio/${convenioId}`);
  }

  createArancel(arancel: ConvenioPrestacionValor): Observable<ConvenioPrestacionValor> {
    return this.http.post<ConvenioPrestacionValor>(`${this.apiUrl}/aranceles`, arancel);
  }

  // Lotes
  generarLote(financiadorId: string, convenioId: string, periodo: string): Observable<LotePresentacion> {
    return this.http.post<LotePresentacion>(`${this.apiUrl}/lotes/generar`, null, {
      params: { financiadorId, convenioId, periodo }
    });
  }

  // Conciliación
  getConciliacionPaciente(pacienteId: string): Observable<ConciliacionAtencion[]> {
    return this.http.get<ConciliacionAtencion[]>(`${this.apiUrl}/conciliacion/paciente/${pacienteId}`);
  }
}
