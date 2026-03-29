import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { BoxService } from '../../consultorios/services/box.service';
import { ConsultorioService } from '../../consultorios/services/consultorio.service';
import { ConfiguracionConsultorioService } from '../../consultorios/services/configuracion-consultorio.service';
import { DuracionService } from '../../consultorios/services/duracion.service';
import { HorarioService } from '../../consultorios/services/horario.service';
import { DayOfWeek, HorarioRequest } from '../../consultorios/models/agenda.models';
import { BoxTipo, Consultorio } from '../../consultorios/models/consultorio.models';

export interface SetupWizardData {
  consultorioNombre: string;
  salaNombre: string;
  salaTipo: BoxTipo;
  dias: DayOfWeek[];
  horaApertura: string;
  horaCierre: string;
  intervalMinutos: number;
  arancelParticular: number;
}

@Injectable({ providedIn: 'root' })
export class SetupWizardService {
  private readonly consultorioSvc = inject(ConsultorioService);
  private readonly boxSvc = inject(BoxService);
  private readonly horarioSvc = inject(HorarioService);
  private readonly duracionSvc = inject(DuracionService);
  private readonly configuracionSvc = inject(ConfiguracionConsultorioService);

  setup(data: SetupWizardData): Observable<Consultorio> {
    return this.consultorioSvc.create({ name: data.consultorioNombre }).pipe(
      switchMap((consultorio) => {
        const horarios: HorarioRequest[] = data.dias.map((diaSemana) => ({
          diaSemana,
          horaApertura: data.horaApertura,
          horaCierre: data.horaCierre,
        }));

        return forkJoin({
          box: this.boxSvc.create(consultorio.id, {
            nombre: data.salaNombre,
            tipo: data.salaTipo,
            capacityType: 'UNLIMITED',
          }),
          horarios: this.horarioSvc.createBatch(consultorio.id, horarios),
          duracion: this.duracionSvc.add(consultorio.id, data.intervalMinutos),
          configuracion: this.configuracionSvc.upsert(consultorio.id, {
            arancelParticularPorSesion: data.arancelParticular,
          }),
        }).pipe(map(() => consultorio));
      }),
    );
  }
}
