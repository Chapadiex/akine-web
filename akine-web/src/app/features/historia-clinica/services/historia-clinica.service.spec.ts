import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HistoriaClinicaService } from './historia-clinica.service';

describe('HistoriaClinicaService', () => {
  let service: HistoriaClinicaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HistoriaClinicaService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(HistoriaClinicaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests workspace with query params', () => {
    service
      .getWorkspace('consultorio-1', {
        pacienteId: 'paciente-1',
        profesionalId: 'profesional-1',
        estado: 'BORRADOR',
        page: 1,
        size: 10,
      })
      .subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url.endsWith('/api/v1/consultorios/consultorio-1/historia-clinica/workspace'),
    );

    expect(req.request.params.get('pacienteId')).toBe('paciente-1');
    expect(req.request.params.get('profesionalId')).toBe('profesional-1');
    expect(req.request.params.get('estado')).toBe('BORRADOR');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');

    req.flush({
      profesionales: [],
      items: [],
      page: 1,
      size: 10,
      total: 0,
    });
  });

  it('uploads attachments as multipart form data', () => {
    const file = new File(['hola'], 'nota.pdf', { type: 'application/pdf' });
    service.uploadAdjunto('consultorio-1', 'paciente-1', 'sesion-1', file).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.method === 'POST' &&
        request.url.endsWith(
          '/api/v1/consultorios/consultorio-1/historia-clinica/pacientes/paciente-1/sesiones/sesion-1/adjuntos',
        ),
    );

    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('file')).toEqual(file);

    req.flush({
      id: 'adjunto-1',
      sesionId: 'sesion-1',
      originalFilename: 'nota.pdf',
      contentType: 'application/pdf',
      sizeBytes: 4,
      createdAt: '2026-03-07T10:00:00Z',
    });
  });
});
