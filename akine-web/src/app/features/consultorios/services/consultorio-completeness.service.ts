import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import {
  ConsultorioCompleteness,
  ConsultorioCompletenessSnapshot,
} from '../models/consultorio-completeness.models';
import { Consultorio } from '../models/consultorio.models';
import { evaluateConsultorioCompletenessSnapshot } from '../utils/consultorio-completeness';
import { BoxService } from './box.service';
import { ConsultorioService } from './consultorio.service';
import { DuracionService } from './duracion.service';
import { HorarioService } from './horario.service';
import { ProfesionalService } from './profesional.service';

@Injectable({ providedIn: 'root' })
export class ConsultorioCompletenessService {
  private readonly consultorioSvc = inject(ConsultorioService);
  private readonly boxSvc = inject(BoxService);
  private readonly profesionalSvc = inject(ProfesionalService);
  private readonly horarioSvc = inject(HorarioService);
  private readonly duracionSvc = inject(DuracionService);

  loadSnapshot(
    consultorioId: string,
    consultorio?: Consultorio | null,
  ): Observable<ConsultorioCompletenessSnapshot> {
    return forkJoin({
      consultorio: consultorio ? of(consultorio) : this.consultorioSvc.getById(consultorioId),
      boxes: this.boxSvc.list(consultorioId),
      profesionales: this.profesionalSvc.list(consultorioId),
      horarios: this.horarioSvc.list(consultorioId),
      duraciones: this.duracionSvc.list(consultorioId),
    });
  }

  loadCompleteness(
    consultorioId: string,
    consultorio?: Consultorio | null,
  ): Observable<ConsultorioCompleteness> {
    return this.loadSnapshot(consultorioId, consultorio).pipe(
      map((snapshot) => evaluateConsultorioCompletenessSnapshot(snapshot)),
    );
  }
}
