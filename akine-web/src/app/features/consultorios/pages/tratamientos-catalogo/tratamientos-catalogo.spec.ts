import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { TratamientoCatalogService } from '../../services/tratamiento-catalog.service';
import { TratamientosCatalogoPage } from './tratamientos-catalogo';

describe('TratamientosCatalogoPage', () => {
  let fixture: ComponentFixture<TratamientosCatalogoPage>;
  let service: jasmine.SpyObj<TratamientoCatalogService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<TratamientoCatalogService>('TratamientoCatalogService', ['get', 'upsert', 'restoreDefaults']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    service.get.and.returnValue(of({
      consultorioId: 'consultorio-1',
      version: '1.0.0',
      monedaNomenclador: 'ARS',
      pais: 'AR',
      observaciones: ['obs'],
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
    } as any));
    service.upsert.and.callFake((_consultorioId, request) => of({ consultorioId: 'consultorio-1', ...request } as any));
    service.restoreDefaults.and.returnValue(service.get('consultorio-1'));

    await TestBed.configureTestingModule({
      imports: [TratamientosCatalogoPage],
      providers: [
        { provide: TratamientoCatalogService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ErrorMapperService, useValue: { toMessage: () => 'error-controlado' } },
        {
          provide: ActivatedRoute,
          useValue: {
            pathFromRoot: [{ snapshot: { paramMap: convertToParamMap({ id: 'consultorio-1' }) } }],
            snapshot: { paramMap: convertToParamMap({ id: 'consultorio-1' }) },
          },
        },
      ],
    }).compileComponents();
  });

  it('loads and renders the configured treatment', () => {
    fixture = TestBed.createComponent(TratamientosCatalogoPage);
    fixture.detectChanges();

    expect(service.get).toHaveBeenCalledWith('consultorio-1');
    expect(fixture.nativeElement.textContent).toContain('Terapia manual');
    expect(fixture.nativeElement.textContent).toContain('Tecnica / componente');
  });

  it('persists activation toggle through the service', () => {
    fixture = TestBed.createComponent(TratamientosCatalogoPage);
    fixture.detectChanges();

    fixture.componentInstance.confirmToggle();
    expect(service.upsert).not.toHaveBeenCalled();

    fixture.componentInstance.askToggle((fixture.componentInstance.maestro()?.tratamientos ?? [])[0]);
    fixture.componentInstance.confirmToggle();

    expect(service.upsert).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows mapped error when load fails', () => {
    service.get.and.returnValue(throwError(() => new Error('boom')));
    fixture = TestBed.createComponent(TratamientosCatalogoPage);
    fixture.detectChanges();

    expect(toast.error).toHaveBeenCalledWith('error-controlado');
  });
});
