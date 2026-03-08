import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Paciente360Service } from '../../services/paciente-360.service';
import { HistoriaClinicaPage } from './historia-clinica';

class ConsultorioContextStub {
  readonly selectedConsultorioId = signal('consultorio-1');
}

describe('Paciente360 HistoriaClinicaPage', () => {
  let fixture: ComponentFixture<HistoriaClinicaPage>;
  let component: HistoriaClinicaPage;
  let svc: jasmine.SpyObj<Paciente360Service>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj<Paciente360Service>('Paciente360Service', ['getHistoriaClinica']);
    svc.getHistoriaClinica.and.returnValue(
      of({
        profesionales: [],
        items: [],
        page: 0,
        size: 20,
        total: 0,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [HistoriaClinicaPage],
      providers: [
        provideRouter([]),
        { provide: Paciente360Service, useValue: svc },
        { provide: ConsultorioContextService, useClass: ConsultorioContextStub },
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              snapshot: {
                paramMap: convertToParamMap({ patientId: 'paciente-1' }),
              },
            },
          },
        },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
        { provide: ErrorMapperService, useValue: { toMessage: () => 'error-controlado' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriaClinicaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('builds workspace query params from current patient and filters', () => {
    component.filters.profesionalId = 'profesional-1';
    component.filters.from = '2026-03-01';
    component.filters.to = '2026-03-31';

    expect(component.workspaceQueryParams()).toEqual({
      pacienteId: 'paciente-1',
      profesionalId: 'profesional-1',
      from: '2026-03-01',
      to: '2026-03-31',
    });
  });

  it('renders the global workspace link', () => {
    expect(fixture.nativeElement.textContent).toContain('Global');
  });
});
