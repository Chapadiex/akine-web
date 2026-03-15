import {
  BoxCapacidadTipo,
  ConsultorioDuracion,
  ConsultorioHorario,
  DayOfWeek,
  DIAS_SEMANA,
} from '../models/agenda.models';
import {
  ConsultorioCompleteness,
  ConsultorioCompletenessLayer,
  ConsultorioCompletenessSection,
  ConsultorioCompletenessSnapshot,
} from '../models/consultorio-completeness.models';
import { Box, Profesional } from '../models/consultorio.models';
import {
  evaluateConsultorioBasicMissingItems,
  evaluateConsultorioDocumentMissingItems,
  normalizeText,
} from './consultorio-form-rules';

const VALID_BOX_TYPES = new Set(['BOX', 'GIMNASIO', 'OFICINA']);
const VALID_CAPACITY_TYPES = new Set<BoxCapacidadTipo>(['UNLIMITED', 'LIMITED']);
const DAY_ORDER = new Map<DayOfWeek, number>(DIAS_SEMANA.map((day, index) => [day.key, index]));

export function evaluateConsultorioCompletenessSnapshot(
  snapshot: ConsultorioCompletenessSnapshot,
): ConsultorioCompleteness {
  const sections: ConsultorioCompletenessSection[] = [
    buildSection('basic', 'Datos basicos', evaluateConsultorioBasicMissingItems(snapshot.consultorio), 'resumen'),
    buildSection('boxes', 'Boxes', evaluateBoxesMissingItems(snapshot.boxes), 'boxes'),
    buildSection('profesionales', 'Profesionales', evaluateProfesionalesMissingItems(snapshot.profesionales), 'profesionales'),
    buildSection('horarios', 'Horarios', evaluateHorariosMissingItems(snapshot.horarios), 'agenda/horarios-atencion'),
    buildSection('intervalos', 'Intervalos', evaluateDuracionesMissingItems(snapshot.duraciones), 'agenda/intervalo-turnos'),
    buildSection('documental', 'Documentos', evaluateConsultorioDocumentMissingItems(snapshot.consultorio), 'editar?step=impresion'),
  ];

  const layers = buildLayers(snapshot, sections);
  const missingItems = layers.flatMap((layer) => layer.missingItems.map((item) => `${layer.label}: ${item}`));
  const completedLayers = layers.filter((layer) => layer.isComplete).length;

  return {
    isComplete: layers.every((layer) => layer.isComplete),
    hasCriticalMissing: layers.some((layer) => (layer.key === 'basic' || layer.key === 'operational') && !layer.isComplete),
    completionPercentage: Math.round((completedLayers / layers.length) * 100),
    missingItems,
    layers,
    sections,
  };
}

function buildLayers(
  snapshot: ConsultorioCompletenessSnapshot,
  sections: ConsultorioCompletenessSection[],
): ConsultorioCompletenessLayer[] {
  const basicSection = sections.find((section) => section.key === 'basic')!;
  const documentalSection = sections.find((section) => section.key === 'documental')!;
  const operationalMissing = [
    ...resolveOperationalStateMissingItems(snapshot),
    ...sections
      .filter((section) => ['boxes', 'profesionales', 'horarios', 'intervalos'].includes(section.key))
      .flatMap((section) => section.missingItems),
  ];

  return [
    {
      key: 'basic',
      label: 'Datos basicos completos',
      shortLabel: 'Basico',
      isComplete: basicSection.isComplete,
      missingItems: basicSection.missingItems,
      helperText: basicSection.isComplete ? 'Nombre, contacto, direccion y mapa listos.' : 'Faltan datos esenciales del consultorio.',
    },
    {
      key: 'operational',
      label: 'Listo para operar',
      shortLabel: 'Operativo',
      isComplete: operationalMissing.length === 0,
      missingItems: unique(operationalMissing),
      helperText: operationalMissing.length === 0 ? 'Estado activo y configuracion operativa principal lista.' : 'Faltan datos o configuraciones para la operacion diaria.',
    },
    {
      key: 'documental',
      label: 'Listo para impresion',
      shortLabel: 'Documental',
      isComplete: documentalSection.isComplete,
      missingItems: documentalSection.missingItems,
      helperText: documentalSection.isComplete ? 'Membrete y visibilidad documental definidos.' : 'Falta definir la configuracion de documentos.',
    },
  ];
}

function resolveOperationalStateMissingItems(snapshot: ConsultorioCompletenessSnapshot): string[] {
  const missing: string[] = [];
  if (snapshot.consultorio.status !== 'ACTIVE') {
    missing.push('estado activo');
  }
  return missing;
}

function buildSection(
  key: string,
  label: string,
  missingItems: string[],
  route?: string,
): ConsultorioCompletenessSection {
  return {
    key,
    label,
    isComplete: missingItems.length === 0,
    missingItems,
    route,
  };
}

function evaluateBoxesMissingItems(boxes: Box[]): string[] {
  const missing: string[] = [];
  const activeBoxes = boxes.filter((box) => isOperationallyActive(box.activo));

  if (activeBoxes.length === 0) {
    missing.push('al menos 1 box activo');
    return missing;
  }

  for (const box of activeBoxes) {
    const ref = normalizeText(box.nombre) || 'sin nombre';
    if (!normalizeText(box.nombre)) {
      missing.push(`nombre valido en box ${ref}`);
    }
    if (!VALID_BOX_TYPES.has(box.tipo)) {
      missing.push(`tipo valido en box ${ref}`);
    }
    if (!VALID_CAPACITY_TYPES.has(box.capacityType)) {
      missing.push(`tipo de capacidad valido en box ${ref}`);
    }
    if (box.capacityType === 'LIMITED' && !isPositiveInteger(box.capacity)) {
      missing.push(`capacidad valida en box ${ref}`);
    }
  }

  return unique(missing);
}

function evaluateProfesionalesMissingItems(profesionales: Profesional[]): string[] {
  const activeProfessionals = profesionales.filter((profesional) => isOperationallyActive(profesional.activo));
  return activeProfessionals.length > 0 ? [] : ['al menos 1 profesional activo'];
}

function evaluateHorariosMissingItems(horarios: ConsultorioHorario[]): string[] {
  const missing: string[] = [];
  const activeSlots = horarios.filter((horario) => isOperationallyActive(horario.activo));

  if (activeSlots.length === 0) {
    missing.push('al menos 1 tramo horario activo');
    return missing;
  }

  const groupedByDay = new Map<DayOfWeek, ConsultorioHorario[]>();

  for (const horario of activeSlots) {
    const label = dayLabel(horario.diaSemana);
    if (!isValidTime(horario.horaApertura) || !isValidTime(horario.horaCierre)) {
      missing.push(`horario valido en ${label}`);
      continue;
    }

    const start = toMinutes(horario.horaApertura);
    const end = toMinutes(horario.horaCierre);
    if (start >= end) {
      missing.push(`tramo consistente en ${label}`);
      continue;
    }

    const bucket = groupedByDay.get(horario.diaSemana) ?? [];
    bucket.push(horario);
    groupedByDay.set(horario.diaSemana, bucket);
  }

  for (const [day, slots] of groupedByDay) {
    const sorted = [...slots].sort((left, right) => {
      const dayCompare = (DAY_ORDER.get(left.diaSemana) ?? 0) - (DAY_ORDER.get(right.diaSemana) ?? 0);
      if (dayCompare !== 0) return dayCompare;
      return toMinutes(left.horaApertura) - toMinutes(right.horaApertura);
    });

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (toMinutes(current.horaApertura) < toMinutes(previous.horaCierre)) {
        missing.push(`sin superposicion en ${dayLabel(day)}`);
        break;
      }
    }
  }

  return unique(missing);
}

function evaluateDuracionesMissingItems(duraciones: ConsultorioDuracion[]): string[] {
  if (duraciones.length === 0) {
    return ['al menos 1 intervalo de turnos'];
  }

  return duraciones.every((duracion) => isPositiveInteger(duracion.minutos))
    ? []
    : ['intervalos con duracion valida'];
}

function isPositiveInteger(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isValidTime(value: string): boolean {
  return normalizeTimeValue(value) !== null;
}

function toMinutes(value: string): number {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return Number.NaN;

  const [hours, minutes] = normalized.split(':').map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function normalizeTimeValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;

  return `${match[1]}:${match[2]}`;
}

function dayLabel(day: DayOfWeek): string {
  return DIAS_SEMANA.find((item) => item.key === day)?.label ?? day;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function isOperationallyActive(value: boolean | null | undefined): boolean {
  return value !== false;
}
