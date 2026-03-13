import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AntecedenteCatalogService } from '../../../consultorios/services/antecedente-catalog.service';
import { DiagnosticosMedicosService } from '../../../consultorios/services/diagnosticos-medicos.service';
import { TratamientoCatalogService } from '../../../consultorios/services/tratamiento-catalog.service';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { HistoriaClinicaPacientePage } from './historia-clinica-paciente';

class ConsultorioContextStub {
  readonly selectedConsultorioId = signal('consultorio-1');
  readonly selectedConsultorio = computed(() => ({ id: 'consultorio-1', name: 'Kine Centro' }) as any);
}

describe('HistoriaClinicaPacientePage', () => {
  let fixture: ComponentFixture<HistoriaClinicaPacientePage>;
  let historiaSvc: jasmine.SpyObj<HistoriaClinicaService>;
  let pacienteSvc: jasmine.SpyObj<PacienteService>;
  let antecedenteCatalogSvc: jasmine.SpyObj<AntecedenteCatalogService>;
  let diagnosticosMedicosSvc: jasmine.SpyObj<DiagnosticosMedicosService>;
  let tratamientoCatalogSvc: jasmine.SpyObj<TratamientoCatalogService>;
  let queryParams$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(async () => {
    queryParams$ = new BehaviorSubject(convertToParamMap({}));
    historiaSvc = jasmine.createSpyObj<HistoriaClinicaService>('HistoriaClinicaService', [
      'getWorkspace',
      'getOverview',
      'getTimeline',
      'getAntecedentes',
      'getSesion',
      'createAtencionInicial',
      'createSesion',
      'updateSesion',
      'closeSesion',
      'annulSesion',
      'createDiagnostico',
      'resolveDiagnostico',
      'uploadAdjunto',
      'uploadAtencionInicialAdjunto',
      'downloadAdjunto',
      'deleteAdjunto',
      'updateAntecedentes',
      'listDiagnosticos',
      'listSesiones',
    ]);
    historiaSvc.getWorkspace.and.returnValue(
      of({ profesionales: [{ id: 'prof-1', nombre: 'Dr. House' }], items: [], page: 0, size: 1, total: 4 }),
    );
    historiaSvc.getTimeline.and.returnValue(of([]));
    historiaSvc.getAntecedentes.and.returnValue(of([]));
    historiaSvc.listDiagnosticos.and.returnValue(of([]));
    historiaSvc.listSesiones.and.returnValue(of([]));
    historiaSvc.getSesion.and.returnValue(
      of({
        id: 'sesion-1',
        consultorioId: 'consultorio-1',
        pacienteId: 'paciente-1',
        profesionalId: 'prof-1',
        fechaAtencion: '2026-03-07T10:00:00',
        estado: 'BORRADOR',
        tipoAtencion: 'SEGUIMIENTO',
        origenRegistro: 'MANUAL',
        createdByUserId: 'user-1',
        updatedByUserId: 'user-1',
        createdAt: '2026-03-07T10:00:00Z',
        updatedAt: '2026-03-07T10:00:00Z',
        adjuntos: [],
      } as any),
    );
    pacienteSvc = jasmine.createSpyObj<PacienteService>('PacienteService', ['search', 'createAdmin']);
    pacienteSvc.search.and.returnValue(of([]));
    antecedenteCatalogSvc = jasmine.createSpyObj<AntecedenteCatalogService>('AntecedenteCatalogService', ['get']);
    antecedenteCatalogSvc.get.and.returnValue(
      of({
        categories: [
          {
            code: 'personales',
            name: 'Personales patologicos',
            order: 10,
            active: true,
            items: [{ code: 'alergias', label: 'Alergias', valueType: 'BOOLEAN', active: true, order: 1 }],
          },
        ],
      } as any),
    );
    tratamientoCatalogSvc = jasmine.createSpyObj<TratamientoCatalogService>('TratamientoCatalogService', ['get']);
    tratamientoCatalogSvc.get.and.returnValue(
      of({
        tipos: ['PRINCIPAL', 'TECNICA'],
        categorias: [{ id: 'cat-1', codigo: 'TERAPIA_MANUAL', nombre: 'Terapia manual' }],
        tratamientos: [{
          id: 'tr-1',
          codigoInterno: 'TMN001',
          nombre: 'Terapia manual',
          categoriaCodigo: 'TERAPIA_MANUAL',
          tipo: 'TECNICA',
          descripcion: 'Tecnicas manuales',
          facturable: false,
          requierePrescripcionMedica: false,
          requiereAutorizacion: true,
          duracionSugeridaMinutos: 20,
          modalidades: ['CONSULTORIO'],
          activo: true,
          precioReferencia: null,
          codigosFinanciador: [],
        }],
      } as any),
    );
    diagnosticosMedicosSvc = jasmine.createSpyObj<DiagnosticosMedicosService>('DiagnosticosMedicosService', ['get']);
    diagnosticosMedicosSvc.get.and.returnValue(
      of({
        diagnosticos: [],
        categorias: [],
        tipos: [],
      } as any),
    );

    await TestBed.configureTestingModule({
      imports: [HistoriaClinicaPacientePage],
      providers: [
        provideRouter([]),
        { provide: HistoriaClinicaService, useValue: historiaSvc },
        { provide: PacienteService, useValue: pacienteSvc },
        { provide: AntecedenteCatalogService, useValue: antecedenteCatalogSvc },
        { provide: DiagnosticosMedicosService, useValue: diagnosticosMedicosSvc },
        { provide: TratamientoCatalogService, useValue: tratamientoCatalogSvc },
        { provide: ConsultorioContextService, useClass: ConsultorioContextStub },
        { provide: AuthService, useValue: { currentUser: signal({ profesionalId: 'prof-1' }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info']) },
        { provide: ErrorMapperService, useValue: { toMessage: () => 'error-controlado' } },
      ],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(HistoriaClinicaPacientePage);
    fixture.detectChanges();
  }

  function clickButton(label: string): void {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = buttons.find((item) => item.textContent?.includes(label));
    expect(button).withContext(`button "${label}" not found`).toBeTruthy();
    button!.click();
    fixture.detectChanges();
  }

  function patientOverview(overrides: Record<string, unknown> = {}) {
    return {
      paciente: {
        id: 'paciente-1',
        consultorioId: 'consultorio-1',
        dni: '30111222',
        nombre: 'Ana',
        apellido: 'Perez',
        telefono: '1155555555',
        activo: true,
        diagnosticosActivos: 1,
        updatedAt: '2026-03-07T10:00:00Z',
      },
      legajo: { exists: true, legajoId: 'legajo-1', createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-07T10:00:00Z' },
      alertasClinicas: ['Alergia a diclofenac'],
      antecedentesRelevantes: [{ label: 'Alergia', valueText: 'Diclofenac', critical: true }],
      casosActivos: [{
        diagnosticoId: 'diag-1',
        profesionalId: 'prof-1',
        profesionalNombre: 'Dr. House',
        descripcion: 'Lumbalgia mecanica',
        estado: 'ACTIVO',
        fechaInicio: '2026-03-01',
        cantidadSesiones: 3,
        ultimaEvolucionResumen: 'Dolor en descenso.',
      }],
      ultimaSesion: {
        sesionId: 'sesion-1',
        profesionalId: 'prof-1',
        profesionalNombre: 'Dr. House',
        fechaAtencion: '2026-03-07T10:00:00',
        estado: 'BORRADOR',
        tipoAtencion: 'SEGUIMIENTO',
        resumen: 'Control semanal',
      },
      adjuntosRecientes: [{ id: 'adj-1', originalFilename: 'eco.pdf', sizeBytes: 2048 }],
      profesionalHabitual: 'Dr. House',
      ...overrides,
    } as any;
  }

  it('shows the patient selection empty state by default', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Sin paciente seleccionado');
    expect(fixture.nativeElement.querySelector('.header-search input[type="search"]')).toBeTruthy();
    expect(historiaSvc.getWorkspace).toHaveBeenCalled();
  });

  it('keeps only overview eager and defers the rest until a tab is opened', () => {
    historiaSvc.getOverview.and.returnValue(of(patientOverview()));
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();

    expect(historiaSvc.getOverview).toHaveBeenCalled();
    expect(historiaSvc.getTimeline).not.toHaveBeenCalled();
    expect(historiaSvc.getAntecedentes).not.toHaveBeenCalled();
    expect(historiaSvc.listDiagnosticos).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Estado actual');
    expect(fixture.nativeElement.textContent).toContain('Caso principal');
    expect(fixture.nativeElement.textContent).toContain('Ultimo evento');
  });

  it('loads cases and sessions lazily when entering the cases tab', () => {
    historiaSvc.getOverview.and.returnValue(of(patientOverview()));
    historiaSvc.listDiagnosticos.and.returnValue(of([{ id: 'diag-2', profesionalId: 'prof-1', descripcion: 'Cervicalgia', estado: 'RESUELTO', fechaInicio: '2026-02-01' }] as any));
    historiaSvc.listSesiones.and.returnValue(of([{ id: 'sesion-1', profesionalId: 'prof-1', fechaAtencion: '2026-03-07T10:00:00', estado: 'BORRADOR', tipoAtencion: 'SEGUIMIENTO', resumenClinico: 'Control semanal' }] as any));
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Casos y sesiones');

    expect(historiaSvc.listDiagnosticos).toHaveBeenCalled();
    expect(historiaSvc.listSesiones).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Tratamientos en curso');
  });

  it('loads timeline lazily and renders the load-more pattern', () => {
    historiaSvc.getOverview.and.returnValue(of(patientOverview()));
    historiaSvc.getTimeline.and.returnValue(
      of([
        {
          eventId: 'timeline-1',
          type: 'SESION',
          occurredAt: '2026-03-07T10:00:00',
          profesionalId: 'prof-1',
          profesionalNombre: 'Dr. House',
          title: 'Sesion de seguimiento',
          summary: 'Control semanal',
          statusLabel: 'BORRADOR',
          relatedEntityId: 'sesion-1',
        },
      ] as any),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Timeline');

    expect(historiaSvc.getTimeline).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Timeline');
  });

  it('loads antecedentes and adjuntos lazily in the background tab', () => {
    historiaSvc.getOverview.and.returnValue(of(patientOverview()));
    historiaSvc.getAntecedentes.and.returnValue(of([{ label: 'Alergia', valueText: 'Diclofenac', critical: true }] as any));
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Antecedentes y adjuntos');

    expect(historiaSvc.getAntecedentes).toHaveBeenCalled();
    expect(historiaSvc.getSesion).toHaveBeenCalledWith('consultorio-1', 'paciente-1', 'sesion-1');
    expect(fixture.nativeElement.textContent).toContain('Contexto base del paciente');
  });

  it('shows register-initial-attention CTA when patient has no legajo', () => {
    historiaSvc.getOverview.and.returnValue(
      of(
        patientOverview({
          legajo: { exists: false, legajoId: null, createdAt: null, updatedAt: null },
          casosActivos: [],
          ultimaSesion: null,
          profesionalHabitual: null,
          alertasClinicas: [],
        }),
      ),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Registrar atención inicial');
    expect(fixture.nativeElement.querySelector('.header-search')).toBeNull();
  });

  it('opens register-initial-attention as a 3-step wizard', () => {
    historiaSvc.getOverview.and.returnValue(
      of(
        patientOverview({
          legajo: { exists: false, legajoId: null, createdAt: null, updatedAt: null },
          casosActivos: [],
          ultimaSesion: null,
          profesionalHabitual: null,
          alertasClinicas: [],
        }),
      ),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Registrar atención inicial');

    expect(fixture.nativeElement.querySelectorAll('.wizard-step').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Ingreso clínico');
    expect(fixture.nativeElement.textContent).toContain('Paso 1');
    expect(
      fixture.nativeElement.querySelector('input[formControlName="fechaHora"]')?.value,
    ).withContext('fecha/hora de atención inicial precargada').toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Consulta particular');
  });

  it('validates the first wizard step before moving forward', () => {
    historiaSvc.getOverview.and.returnValue(
      of(
        patientOverview({
          legajo: { exists: false, legajoId: null, createdAt: null, updatedAt: null },
          casosActivos: [],
          ultimaSesion: null,
          profesionalHabitual: null,
          alertasClinicas: [],
        }),
      ),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Registrar atención inicial');
    fixture.componentInstance.createLegajoForm.controls.profesionalId.setValue('', { emitEvent: false });
    fixture.componentInstance.createLegajoForm.controls.fechaHora.setValue('', { emitEvent: false });
    fixture.componentInstance.createLegajoForm.controls.motivoConsultaBreve.setValue('', { emitEvent: false });

    clickButton('Siguiente');

    expect(fixture.componentInstance.createLegajoStep()).toBe(0);

    fixture.componentInstance.createLegajoForm.controls.profesionalId.setValue('prof-1');
    fixture.componentInstance.createLegajoForm.controls.fechaHora.setValue('2026-03-08T10:00');
    fixture.componentInstance.createLegajoForm.controls.motivoConsultaBreve.setValue('Dolor lumbar');
    fixture.detectChanges();

    clickButton('Siguiente');

    expect(fixture.componentInstance.createLegajoStep()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Evaluacion y antecedentes');
  });

  it('adds treatments from the selector with 10 default sessions and observations field', () => {
    historiaSvc.getOverview.and.returnValue(
      of(
        patientOverview({
          legajo: { exists: false, legajoId: null, createdAt: null, updatedAt: null },
          casosActivos: [],
          ultimaSesion: null,
          profesionalHabitual: null,
          alertasClinicas: [],
        }),
      ),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Registrar atención inicial');
    fixture.componentInstance.handleSelectedTreatment('TMN001');
    fixture.detectChanges();

    expect(fixture.componentInstance.createLegajoTratamientos.length).toBe(1);
    expect(fixture.componentInstance.createLegajoForm.controls.planCantidadSesiones.value).toBe('10');
    expect(fixture.componentInstance.createLegajoForm.controls.planCaracterCaso.value).toBe('PARCIAL');
    expect(fixture.componentInstance.createLegajoForm.controls.planObservacionesGenerales.value).toBe('');

    fixture.componentInstance.handleSelectedTreatment('TMN001');

    expect(fixture.componentInstance.createLegajoTratamientos.length).toBe(1);
  });

  it('warns before closing the wizard with unsaved changes', () => {
    historiaSvc.getOverview.and.returnValue(
      of(
        patientOverview({
          legajo: { exists: false, legajoId: null, createdAt: null, updatedAt: null },
          casosActivos: [],
          ultimaSesion: null,
          profesionalHabitual: null,
          alertasClinicas: [],
        }),
      ),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Registrar atención inicial');
    fixture.componentInstance.createLegajoForm.controls.motivoConsultaBreve.setValue('Ingreso inicial');
    fixture.componentInstance.createLegajoForm.controls.motivoConsultaBreve.markAsDirty();
    fixture.componentInstance.createLegajoForm.markAsDirty();
    fixture.detectChanges();

    const closeButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const closeButton = closeButtons.find((item) => item.textContent?.trim() === 'Cerrar');
    expect(closeButton).toBeTruthy();
    closeButton!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Salir del registro de atención inicial');
  });

  it('shows new-case CTA as primary action when patient has legajo but no active cases', () => {
    historiaSvc.getOverview.and.returnValue(
      of(
        patientOverview({
          casosActivos: [],
          profesionalHabitual: null,
          alertasClinicas: [],
        }),
      ),
    );
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();

    expect(fixture.nativeElement.querySelector('.header-actions')?.textContent ?? '').toContain('Nuevo caso clínico');
    expect(fixture.nativeElement.querySelector('.header-actions')?.textContent ?? '').not.toContain('Nueva sesión');
  });

  it('searches by DNI using the patient service', fakeAsync(() => {
    createComponent();

    fixture.componentInstance.patientSearchControl.setValue('31.007.055');
    tick(260);

    expect(pacienteSvc.search).toHaveBeenCalledWith('consultorio-1', '31007055', undefined);
  }));

  it('opens the contextual new-patient modal', () => {
    createComponent();
    clickButton('Nuevo paciente');

    expect(fixture.nativeElement.querySelector('app-paciente-form')).toBeTruthy();
  });

  it('asks for confirmation before clearing a patient with an unsaved draft', () => {
    historiaSvc.getOverview.and.returnValue(of(patientOverview()));
    queryParams$.next(convertToParamMap({ pacienteId: 'paciente-1' }));

    createComponent();
    clickButton('Nueva sesión');

    fixture.componentInstance.sesionForm.controls.motivoConsulta.setValue('Borrador pendiente');
    fixture.componentInstance.sesionForm.controls.motivoConsulta.markAsDirty();
    fixture.componentInstance.sesionForm.markAsDirty();
    fixture.detectChanges();

    clickButton('Limpiar');

    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Hay cambios sin guardar');
  });
});
