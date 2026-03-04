import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ConsultorioService } from './consultorio.service';
import { environment } from '../../../../environments/environment';

describe('ConsultorioService', () => {
  let service: ConsultorioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConsultorioService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConsultorioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map activate endpoint', () => {
    service.activate('cid-1').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/activar`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush({});
  });
});
