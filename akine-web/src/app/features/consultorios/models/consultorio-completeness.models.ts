import { ConsultorioDuracion, ConsultorioHorario } from './agenda.models';
import { Box, Consultorio, Profesional } from './consultorio.models';

export interface ConsultorioCompletenessSection {
  key: string;
  label: string;
  isComplete: boolean;
  missingItems: string[];
  route?: string;
}

export interface ConsultorioCompletenessLayer {
  key: 'basic' | 'operational' | 'documental';
  label: string;
  shortLabel: string;
  isComplete: boolean;
  missingItems: string[];
  helperText: string;
}

export interface ConsultorioCompleteness {
  isComplete: boolean;
  hasCriticalMissing: boolean;
  completionPercentage: number;
  missingItems: string[];
  layers: ConsultorioCompletenessLayer[];
  sections: ConsultorioCompletenessSection[];
}

export interface ConsultorioCompletenessSnapshot {
  consultorio: Consultorio;
  boxes: Box[];
  profesionales: Profesional[];
  horarios: ConsultorioHorario[];
  duraciones: ConsultorioDuracion[];
}
