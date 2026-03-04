import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ObraSocialWizard } from './obra-social-wizard';

describe('ObraSocialWizard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObraSocialWizard, NoopAnimationsModule],
    }).compileComponents();
  });

  it('should require email or telefono in step 1', () => {
    const fixture = TestBed.createComponent(ObraSocialWizard);
    const component = fixture.componentInstance;

    component.step1Form.patchValue({
      acronimo: 'OSDE',
      nombreCompleto: 'OSDE 210',
      cuit: '30712345680',
      email: '',
      telefono: '',
    });

    expect(component.step1ContactError()).toBeTrue();
  });

  it('should block submit when there are no plans', () => {
    const fixture = TestBed.createComponent(ObraSocialWizard);
    const component = fixture.componentInstance;
    component.step1Form.patchValue({
      acronimo: 'OSDE',
      nombreCompleto: 'OSDE 210',
      cuit: '30712345680',
      email: 'ok@test.com',
      telefono: '',
    });

    expect(component.canContinueStep1()).toBeTrue();
    expect(component.planes().length).toBe(0);
  });
});
