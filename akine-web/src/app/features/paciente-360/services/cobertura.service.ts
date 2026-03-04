import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Attachment, Insurance, Payment } from '../models/paciente-360.models';

interface CoberturaData {
  insurance: Insurance;
  attachments: Attachment[];
}

@Injectable({ providedIn: 'root' })
export class CoberturaService {
  private readonly http = inject(HttpClient);

  getCobertura(pacienteId: string): Observable<CoberturaData> {
    return this.http.get<Record<string, CoberturaData>>('/assets/mocks/cobertura.json').pipe(
      map(data => {
        const found = data[pacienteId];
        if (!found) return { insurance: { obraSocialNombre: '', plan: '', nroAfiliado: '', vigente: false }, attachments: [] };
        return found;
      }),
    );
  }

  getPagos(pacienteId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>('/assets/mocks/pagos.json').pipe(
      map(items => items
        .filter(p => p.pacienteId === pacienteId)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      ),
    );
  }
}
