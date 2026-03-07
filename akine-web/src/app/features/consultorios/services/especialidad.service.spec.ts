import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EspecialidadService } from './especialidad.service';
import { environment } from '../../../../environments/environment';

describe('EspecialidadService', () => {
  let service: EspecialidadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EspecialidadService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EspecialidadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map list endpoint with query params', () => {
    service.list('cid-1', { search: 'kine', includeInactive: true }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/especialidades?search=kine&includeInactive=true`,
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should map create endpoint', () => {
    service.create('cid-1', { nombre: 'Kinesiologia' }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/especialidades`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Kinesiologia' });
    req.flush({});
  });

  it('should map update endpoint', () => {
    service.update('cid-1', 'esp-1', { nombre: 'Fisiatria' }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/especialidades/esp-1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Fisiatria' });
    req.flush({});
  });

  it('should map activate/deactivate endpoints', () => {
    service.activate('cid-1', 'esp-1').subscribe();
    const activateReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/especialidades/esp-1/activar`,
    );
    expect(activateReq.request.method).toBe('PATCH');
    activateReq.flush({});

    service.deactivate('cid-1', 'esp-1').subscribe();
    const deactivateReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/especialidades/esp-1/desactivar`,
    );
    expect(deactivateReq.request.method).toBe('PATCH');
    deactivateReq.flush({});
  });
});
