import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards/role.guard';

export const PACIENTE_360_ROUTES: Routes = [
  { path: '', redirectTo: 'resumen', pathMatch: 'full' },
  {
    path: 'resumen',
    loadComponent: () =>
      import('./pages/resumen/resumen').then(m => m.ResumenPage),
  },
  {
    path: 'historia-clinica',
    loadComponent: () =>
      import('./pages/historia-clinica/historia-clinica').then(m => m.HistoriaClinicaPage),
  },
  {
    path: 'diagnosticos',
    loadComponent: () =>
      import('./pages/diagnosticos/diagnosticos').then(m => m.DiagnosticosPage),
  },
  {
    path: 'atenciones',
    loadComponent: () =>
      import('./pages/atenciones/atenciones').then(m => m.AtencionesPage),
  },
  {
    path: 'turnos',
    loadComponent: () =>
      import('./pages/turnos/turnos-paciente').then(m => m.TurnosPacientePage),
  },
  {
    path: 'obra-social',
    loadComponent: () =>
      import('./pages/cobertura/cobertura').then(m => m.CoberturaPage),
  },
  {
    path: 'pagos',
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./pages/pagos/pagos').then(m => m.PagosPage),
  },
];
