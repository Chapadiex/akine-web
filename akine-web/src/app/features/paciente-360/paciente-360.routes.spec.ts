import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { roleGuard } from '../../core/auth/guards/role.guard';
import { PACIENTE_360_ROUTES } from './paciente-360.routes';

describe('PACIENTE_360_ROUTES', () => {
  const clinicalPaths = ['historia-clinica', 'diagnosticos', 'atenciones'];

  function routeFor(path: string) {
    return PACIENTE_360_ROUTES.find((route) => route.path === path);
  }

  it('protects clinical tabs with roleGuard and clinical roles', () => {
    for (const path of clinicalPaths) {
      const route = routeFor(path);

      expect(route).withContext(`route ${path} should exist`).toBeDefined();
      expect(route?.canActivate).toContain(roleGuard);
      expect(route?.data?.['roles']).toEqual(['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL']);
    }
  });

  it('redirects ADMINISTRATIVO users away from clinical tabs', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            hasAnyRole: () => false,
          },
        },
      ],
    });

    const snapshot = { data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/app/pacientes/paciente-1/historia-clinica' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => roleGuard(snapshot, state)) as UrlTree;

    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/unauthorized');
  });
});
