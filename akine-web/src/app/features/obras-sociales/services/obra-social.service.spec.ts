import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ObraSocialService } from './obra-social.service';
import { environment } from '../../../../environments/environment';

describe('ObraSocialService', () => {
  let service: ObraSocialService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ObraSocialService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ObraSocialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map list endpoint with filters', () => {
    service.list('cid-1', { q: 'osde', estado: 'ACTIVE', conPlanes: true, page: 0, size: 20 }).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/obras-sociales?q=osde&estado=ACTIVE&conPlanes=true&page=0&size=20`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], page: 0, size: 20, total: 0 });
  });

  it('should map change status endpoint', () => {
    service.changeStatus('cid-1', 'os-1', 'INACTIVE').subscribe();

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/api/v1/consultorios/cid-1/obras-sociales/os-1/estado`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'INACTIVE' });
    req.flush({});
  });
});
