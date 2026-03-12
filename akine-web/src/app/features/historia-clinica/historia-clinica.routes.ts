import { Routes } from '@angular/router';

export const HISTORIA_CLINICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/historia-clinica-paciente/historia-clinica-paciente').then(
        (m) => m.HistoriaClinicaPacientePage,
      ),
  },
  {
    path: 'bandeja',
    loadComponent: () =>
      import('./historia-clinica').then((m) => m.HistoriaClinica),
  },
  {
    path: 'sesion/:sesionId',
    loadComponent: () =>
      import('./pages/sesion-page/sesion-page').then((m) => m.SesionPage),
  },
];
