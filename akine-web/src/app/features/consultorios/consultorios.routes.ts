import { Routes } from '@angular/router';

export const CONSULTORIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/consultorio-list/consultorio-list').then((m) => m.ConsultorioListPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/consultorio-detail/consultorio-detail').then((m) => m.ConsultorioDetailPage),
    children: [
      { path: '', redirectTo: 'boxes', pathMatch: 'full' },
      {
        path: 'boxes',
        loadComponent: () =>
          import('./pages/box-list/box-list').then((m) => m.BoxListPage),
      },
      {
        path: 'profesionales',
        loadComponent: () =>
          import('../colaboradores/colaboradores').then((m) => m.Colaboradores),
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./pages/horarios-list/horarios-list').then((m) => m.HorariosListPage),
      },
      {
        path: 'duraciones',
        loadComponent: () =>
          import('./pages/duraciones-list/duraciones-list').then((m) => m.DuracionesListPage),
      },
      {
        path: 'asignaciones',
        loadComponent: () =>
          import('./pages/asignaciones-list/asignaciones-list').then((m) => m.AsignacionesListPage),
      },
      {
        path: 'profesionales/:profId/disponibilidad',
        loadComponent: () =>
          import('./pages/disponibilidad-list/disponibilidad-list').then((m) => m.DisponibilidadListPage),
      },
      {
        path: 'feriados',
        loadComponent: () =>
          import('./pages/feriados-list/feriados-list').then((m) => m.FeriadosListPage),
      },
      {
        path: 'antecedentes-catalogo',
        loadComponent: () =>
          import('./pages/antecedentes-catalogo/antecedentes-catalogo').then(
            (m) => m.AntecedentesCatalogoPage,
          ),
      },
      {
        path: 'especialidades',
        loadComponent: () =>
          import('./pages/especialidades-list/especialidades-list').then(
            (m) => m.EspecialidadesListPage,
          ),
      },
    ],
  },
];
