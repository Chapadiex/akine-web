import { ConsultorioCompletenessSnapshot } from '../models/consultorio-completeness.models';
import { evaluateConsultorioCompletenessSnapshot } from '../utils/consultorio-completeness';

describe('evaluateConsultorioCompletenessSnapshot', () => {
  function createSnapshot(
    override: Partial<ConsultorioCompletenessSnapshot> = {},
  ): ConsultorioCompletenessSnapshot {
    return {
      consultorio: {
        id: 'c1',
        name: 'FISIKS',
        address: 'Av. Siempre Viva 123',
        phone: '1155550000',
        email: 'info@fisiks.com',
        mapLatitude: -34.6037,
        mapLongitude: -58.3816,
        status: 'ACTIVE',
        documentDisplayName: 'FISIKS',
        documentShowAddress: true,
        documentShowPhone: true,
        createdAt: '2026-03-14T00:00:00Z',
        updatedAt: '2026-03-14T00:00:00Z',
      },
      boxes: [
        {
          id: 'b1',
          consultorioId: 'c1',
          nombre: 'Box 1',
          tipo: 'BOX',
          capacityType: 'LIMITED',
          capacity: 2,
          activo: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
      profesionales: [
        {
          id: 'p1',
          consultorioId: 'c1',
          nombre: 'Ana',
          apellido: 'Perez',
          matricula: 'M-123',
          especialidades: ['Kinesiologia'],
          activo: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
      horarios: [
        {
          id: 'h1',
          consultorioId: 'c1',
          diaSemana: 'MONDAY',
          horaApertura: '08:00',
          horaCierre: '12:00',
          activo: true,
        },
      ],
      duraciones: [{ id: 'd1', consultorioId: 'c1', minutos: 30 }],
      ...override,
    };
  }

  it('marks the consultorio as complete when all required layers are valid', () => {
    const result = evaluateConsultorioCompletenessSnapshot(createSnapshot());

    expect(result.isComplete).toBeTrue();
    expect(result.hasCriticalMissing).toBeFalse();
    expect(result.completionPercentage).toBe(100);
    expect(result.layers.every((layer) => layer.isComplete)).toBeTrue();
  });

  it('treats listed schedules without explicit activo flag as usable', () => {
    const result = evaluateConsultorioCompletenessSnapshot(
      createSnapshot({
        horarios: [
          {
            id: 'h1',
            consultorioId: 'c1',
            diaSemana: 'MONDAY',
            horaApertura: '08:00',
            horaCierre: '12:00',
            activo: undefined as unknown as boolean,
          },
        ],
      }),
    );

    expect(result.sections.find((section) => section.key === 'horarios')?.isComplete).toBeTrue();
  });

  it('accepts schedule times returned with seconds', () => {
    const result = evaluateConsultorioCompletenessSnapshot(
      createSnapshot({
        horarios: [
          {
            id: 'h1',
            consultorioId: 'c1',
            diaSemana: 'MONDAY',
            horaApertura: '08:00:00',
            horaCierre: '23:00:00',
            activo: true,
          },
        ],
      }),
    );

    expect(result.sections.find((section) => section.key === 'horarios')?.isComplete).toBeTrue();
  });

  it('requires core data to complete the basic layer', () => {
    const result = evaluateConsultorioCompletenessSnapshot(
      createSnapshot({
        consultorio: {
          id: 'c1',
          name: 'FISIKS',
          address: '',
          phone: '',
          email: '',
          status: 'ACTIVE',
          createdAt: '2026-03-14T00:00:00Z',
          updatedAt: '2026-03-14T00:00:00Z',
        },
      }),
    );

    expect(result.layers.find((layer) => layer.key === 'basic')?.isComplete).toBeFalse();
    expect(result.sections.find((section) => section.key === 'basic')?.missingItems).toEqual([
      'direccion completa',
      'email valido',
      'telefono valido',
      'ubicacion en mapa',
    ]);
  });

  it('reports missing operational sections when required data is absent', () => {
    const result = evaluateConsultorioCompletenessSnapshot(
      createSnapshot({
        boxes: [],
        horarios: [],
        duraciones: [],
      }),
    );

    expect(result.layers.find((layer) => layer.key === 'operational')?.isComplete).toBeFalse();
    expect(result.sections.find((section) => section.key === 'boxes')?.missingItems).toContain('al menos 1 box activo');
    expect(result.sections.find((section) => section.key === 'horarios')?.missingItems).toContain('al menos 1 tramo horario activo');
    expect(result.sections.find((section) => section.key === 'intervalos')?.missingItems).toContain('al menos 1 intervalo de turnos');
  });

  it('detects invalid active box capacity and overlapping schedules', () => {
    const result = evaluateConsultorioCompletenessSnapshot(
      createSnapshot({
        boxes: [
          {
            id: 'b1',
            consultorioId: 'c1',
            nombre: 'Box 1',
            tipo: 'BOX',
            capacityType: 'LIMITED',
            capacity: 0,
            activo: true,
            createdAt: '',
            updatedAt: '',
          },
        ],
        horarios: [
          {
            id: 'h1',
            consultorioId: 'c1',
            diaSemana: 'MONDAY',
            horaApertura: '08:00',
            horaCierre: '11:00',
            activo: true,
          },
          {
            id: 'h2',
            consultorioId: 'c1',
            diaSemana: 'MONDAY',
            horaApertura: '10:30',
            horaCierre: '12:00',
            activo: true,
          },
        ],
      }),
    );

    expect(result.sections.find((section) => section.key === 'boxes')?.missingItems).toContain('capacidad valida en box Box 1');
    expect(result.sections.find((section) => section.key === 'horarios')?.missingItems).toContain('sin superposicion en Lunes');
  });

  it('requires document visibility setup to complete the documental layer', () => {
    const result = evaluateConsultorioCompletenessSnapshot(
      createSnapshot({
        consultorio: {
          id: 'c1',
          name: 'FISIKS',
          address: 'Av. Siempre Viva 123',
          phone: '1155550000',
          email: 'info@fisiks.com',
          mapLatitude: -34.6037,
          mapLongitude: -58.3816,
          status: 'ACTIVE',
          createdAt: '2026-03-14T00:00:00Z',
          updatedAt: '2026-03-14T00:00:00Z',
        },
      }),
    );

    expect(result.layers.find((layer) => layer.key === 'documental')?.isComplete).toBeFalse();
    expect(result.sections.find((section) => section.key === 'documental')?.missingItems).toContain('configuracion de visibilidad documental');
  });
});
