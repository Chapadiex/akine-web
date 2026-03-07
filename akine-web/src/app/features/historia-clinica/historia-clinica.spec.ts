import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../core/error/error-mapper.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PacienteService } from '../pacientes/services/paciente.service';
import { HistoriaClinica } from './historia-clinica';
import { HistoriaClinicaService } from './services/historia-clinica.service';

class ConsultorioContextStub {
  readonly selectedConsultorioId = signal('consultorio-1');
  readonly selectedConsultorio = computed(() => ({ id: 'consultorio-1', name: 'Centro Test' }) as any);
}

describe('HistoriaClinica page', () => {
  let fixture: ComponentFixture<HistoriaClinica>;
  let component: HistoriaClinica;
  let historiaSvc: jasmine.SpyObj<HistoriaClinicaService>;
  let routeQueryParams$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: Router;

  beforeEach(async () => {
    routeQueryParams$ = new BehaviorSubject(convertToParamMap({}));
    historiaSvc = jasmine.createSpyObj<HistoriaClinicaService>('HistoriaClinicaService', [
      'getWorkspace',
      'getPaciente',
      'listSesiones',
      'getSesion',
      'createSesion',
      'updateSesion',
      'closeSesion',
      'annulSesion',
      'listDiagnosticos',
      'createDiagnostico',
      'resolveDiagnostico',
      'discardDiagnostico',
      'uploadAdjunto',
      'downloadAdjunto',
      'deleteAdjunto',
    ]);

    historiaSvc.getPaciente.and.returnValue(
      of({
        id: 'paciente-1',
        consultorioId: 'consultorio-1',
        dni: '30111222',
        nombre: 'Ana',
        apellido: 'Perez',
        activo: true,
        diagnosticosActivos: 1,
        updatedAt: '2026-03-07T10:00:00Z',
      } as any),
    );
    historiaSvc.listDiagnosticos.and.returnValue(of([]));
    historiaSvc.listSesiones.and.returnValue(of([]));
    historiaSvc.getSesion.and.returnValue(
      of({
        id: 'sesion-1',
        consultorioId: 'consultorio-1',
        pacienteId: 'paciente-1',
        profesionalId: 'profesional-1',
        fechaAtencion: '2026-03-07T10:00',
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

    await TestBed.configureTestingModule({
      imports: [HistoriaClinica],
      providers: [
        provideRouter([]),
        { provide: HistoriaClinicaService, useValue: historiaSvc },
        { provide: ConsultorioContextService, useClass: ConsultorioContextStub },
        { provide: PacienteService, useValue: { search: () => of([]) } },
        { provide: AuthService, useValue: { currentUser: signal({ profesionalId: 'profesional-1' }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: routeQueryParams$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']) },
        { provide: ErrorMapperService, useValue: { toMessage: () => 'error-controlado' } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(HistoriaClinica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows loading state while workspace request is in flight', () => {
    historiaSvc.getWorkspace.and.returnValue(NEVER);

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Cargando sesiones del consultorio');
  });

  it('shows empty state when workspace has no sessions', () => {
    historiaSvc.getWorkspace.and.returnValue(
      of({ profesionales: [], items: [], page: 0, size: 10, total: 0 }),
    );

    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Sin sesiones');
  });

  it('shows backend error mapped to the UI', () => {
    historiaSvc.getWorkspace.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('error-controlado');
  });

  it('loads patient context from query params and allows applying filters', () => {
    historiaSvc.getWorkspace.and.returnValue(
      of({
        profesionales: [{ id: 'profesional-1', nombre: 'Dr. House' }],
        items: [
          {
            sesionId: 'sesion-1',
            pacienteId: 'paciente-1',
            pacienteNombre: 'Ana',
            pacienteApellido: 'Perez',
            pacienteDni: '30111222',
            profesionalId: 'profesional-1',
            profesionalNombre: 'Dr. House',
            fechaAtencion: '2026-03-07T10:00:00',
            estado: 'BORRADOR',
            tipoAtencion: 'SEGUIMIENTO',
            resumenClinico: 'Control',
            updatedAt: '2026-03-07T10:00:00Z',
          },
        ],
        page: 0,
        size: 10,
        total: 1,
      }),
    );
    historiaSvc.listDiagnosticos.and.returnValue(
      of([
        {
          id: 'diag-1',
          consultorioId: 'consultorio-1',
          pacienteId: 'paciente-1',
          profesionalId: 'profesional-1',
          descripcion: 'Ansiedad',
          estado: 'ACTIVO',
          fechaInicio: '2026-03-01',
          createdAt: '2026-03-01T10:00:00Z',
          updatedAt: '2026-03-01T10:00:00Z',
        } as any,
      ]),
    );
    historiaSvc.listSesiones.and.returnValue(
      of([
        {
          id: 'sesion-1',
          consultorioId: 'consultorio-1',
          pacienteId: 'paciente-1',
          profesionalId: 'profesional-1',
          fechaAtencion: '2026-03-07T10:00',
          estado: 'BORRADOR',
          tipoAtencion: 'SEGUIMIENTO',
          resumenClinico: 'Control',
          origenRegistro: 'MANUAL',
          createdByUserId: 'user-1',
          updatedByUserId: 'user-1',
          createdAt: '2026-03-07T10:00:00Z',
          updatedAt: '2026-03-07T10:00:00Z',
          adjuntos: [],
        } as any,
      ]),
    );
    routeQueryParams$.next(convertToParamMap({ pacienteId: 'paciente-1', sesionId: 'sesion-1' }));

    createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Perez, Ana');

    component.filterForm.patchValue({ estado: 'BORRADOR', q: 'control' });
    component.applyFilters();

    expect(router.navigate).toHaveBeenCalled();
  });
});
