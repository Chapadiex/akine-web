import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards/role.guard';

export const TURNO_ROUTES: Routes = [
  { path: '', redirectTo: 'hoy', pathMatch: 'full' },
  {
    path: 'hoy',
    loadComponent: () =>
      import('./pages/turnos-hoy/turnos-hoy').then((m) => m.TurnosHoyPage),
  },
  {
    path: 'agenda',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
    loadComponent: () =>
      import('./pages/turnos-agenda/turnos-agenda').then((m) => m.TurnosAgendaPage),
  },
];
