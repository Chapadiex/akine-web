export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type BoxCapacidadTipo = 'UNLIMITED' | 'LIMITED';

export const DIAS_SEMANA: { key: DayOfWeek; label: string }[] = [
  { key: 'MONDAY', label: 'Lunes' },
  { key: 'TUESDAY', label: 'Martes' },
  { key: 'WEDNESDAY', label: 'Miercoles' },
  { key: 'THURSDAY', label: 'Jueves' },
  { key: 'FRIDAY', label: 'Viernes' },
  { key: 'SATURDAY', label: 'Sabado' },
  { key: 'SUNDAY', label: 'Domingo' },
];

export interface ConsultorioHorario {
  id: string;
  consultorioId: string;
  diaSemana: DayOfWeek;
  horaApertura: string;
  horaCierre: string;
  activo: boolean;
}

export interface HorarioRequest {
  diaSemana: DayOfWeek;
  horaApertura: string;
  horaCierre: string;
}

export interface ConsultorioDuracion {
  id: string;
  consultorioId: string;
  minutos: number;
}

export interface ProfesionalAsignado {
  id: string;
  profesionalId: string;
  consultorioId: string;
  profesionalNombre: string;
  profesionalApellido: string;
  activo: boolean;
}

export interface DisponibilidadProfesional {
  id: string;
  profesionalId: string;
  consultorioId: string;
  diaSemana: DayOfWeek;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface DisponibilidadRequest {
  diaSemana: DayOfWeek;
  horaInicio: string;
  horaFin: string;
}
