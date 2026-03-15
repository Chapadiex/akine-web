import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioCompletenessService } from '../../services/consultorio-completeness.service';
import { ConsultorioService } from '../../services/consultorio.service';
import { ConsultorioListPage } from './consultorio-list';

describe('ConsultorioListPage', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['hasRole', 'hasAnyRole']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        {
          provide: ConsultorioService,
          useValue: jasmine.createSpyObj<ConsultorioService>('ConsultorioService', {
            list: of([]),
          }),
        },
        {
          provide: ConsultorioCompletenessService,
          useValue: jasmine.createSpyObj<ConsultorioCompletenessService>('ConsultorioCompletenessService', {
            loadCompleteness: of({
              isComplete: true,
              hasCriticalMissing: false,
              completionPercentage: 100,
              missingItems: [],
              layers: [],
              sections: [],
            }),
          }),
        },
        {
          provide: ConsultorioContextService,
          useValue: {
            consultorios: () => [],
            reloadAndSelect: () => undefined,
          },
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj<ToastService>('ToastService', ['error', 'success']),
        },
        {
          provide: ErrorMapperService,
          useValue: jasmine.createSpyObj<ErrorMapperService>('ErrorMapperService', {
            toMessage: 'error',
          }),
        },
      ],
    });
  });

  it('visibleItems should hide inactive for non-admin', () => {
    authSpy.hasRole.and.returnValue(false);
    authSpy.hasAnyRole.and.returnValue(true);

    const component = TestBed.runInInjectionContext(() => new ConsultorioListPage());
    component.items.set([
      {
        id: '1',
        name: 'Activo',
        address: '',
        phone: '',
        email: '',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        name: 'Inactivo',
        address: '',
        phone: '',
        email: '',
        status: 'INACTIVE',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    expect(component.visibleItems().map((c) => c.id)).toEqual(['1']);
  });

  it('canEdit should be false for inactive consultorio', () => {
    authSpy.hasAnyRole.and.returnValue(true);
    authSpy.hasRole.and.returnValue(true);

    const component = TestBed.runInInjectionContext(() => new ConsultorioListPage());
    expect(component.canEdit({
      id: '2',
      name: 'Inactivo',
      address: '',
      phone: '',
      email: '',
      status: 'INACTIVE',
      createdAt: '',
      updatedAt: '',
    })).toBeFalse();
  });
});
