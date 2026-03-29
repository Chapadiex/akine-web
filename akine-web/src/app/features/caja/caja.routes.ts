import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards/role.guard';

export const CAJA_ROUTES: Routes = [
  { path: '', redirectTo: 'hoy', pathMatch: 'full' },
  {
    path: 'hoy',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
    loadComponent: () =>
      import('./pages/caja-diaria-page/caja-diaria-page').then((m) => m.CajaDiariaPage),
  },
  {
    path: 'cobrar',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
    loadComponent: () =>
      import('./pages/cobro-paciente-page/cobro-paciente-page').then((m) => m.CobroPacientePage),
  },
  {
    path: 'egreso',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
    loadComponent: () =>
      import('./pages/egreso-caja-page/egreso-caja-page').then((m) => m.EgresoCajaPage),
  },
  {
    path: 'liquidacion/:liquidacionId',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
    loadComponent: () =>
      import('./pages/liquidacion-sesion-page/liquidacion-sesion-page').then(
        (m) => m.LiquidacionSesionPage,
      ),
  },
];
