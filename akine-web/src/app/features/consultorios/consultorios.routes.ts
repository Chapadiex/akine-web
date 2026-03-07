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
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      {
        path: 'resumen',
        loadComponent: () =>
          import('./pages/consultorio-resumen/consultorio-resumen').then(
            (m) => m.ConsultorioResumenPage,
          ),
      },
      {
        path: 'boxes',
        loadComponent: () =>
          import('./pages/box-list/box-list').then((m) => m.BoxListPage),
      },
      {
        path: 'profesionales',
        loadComponent: () =>
          import('./pages/profesional-list/profesional-list').then((m) => m.ProfesionalListPage),
      },
      {
        path: 'agenda',
        children: [
          { path: '', redirectTo: 'horarios-atencion', pathMatch: 'full' },
          {
            path: 'horarios-atencion',
            loadComponent: () =>
              import('./pages/horarios-list/horarios-list').then((m) => m.HorariosListPage),
          },
          {
            path: 'cobertura-profesionales',
            loadComponent: () =>
              import('./pages/asignaciones-list/asignaciones-list').then(
                (m) => m.AsignacionesListPage,
              ),
          },
          {
            path: 'intervalo-turnos',
            loadComponent: () =>
              import('./pages/duraciones-list/duraciones-list').then((m) => m.DuracionesListPage),
          },
          {
            path: 'feriados-cierres',
            loadComponent: () =>
              import('./pages/feriados-list/feriados-list').then((m) => m.FeriadosListPage),
          },
          {
            path: 'profesionales/:profId/disponibilidad',
            loadComponent: () =>
              import('./pages/disponibilidad-list/disponibilidad-list').then(
                (m) => m.DisponibilidadListPage,
              ),
          },
        ],
      },
      {
        path: 'configuracion',
        children: [
          { path: '', redirectTo: 'especialidades', pathMatch: 'full' },
          {
            path: 'especialidades',
            loadComponent: () =>
              import('./pages/especialidades-list/especialidades-list').then(
                (m) => m.EspecialidadesListPage,
              ),
          },
          {
            path: 'cargos-personal',
            loadComponent: () =>
              import('./pages/cargos-empleado-list/cargos-empleado-list').then(
                (m) => m.CargosEmpleadoListPage,
              ),
          },
          {
            path: 'plantillas-antecedentes',
            loadComponent: () =>
              import('./pages/antecedentes-catalogo/antecedentes-catalogo').then(
                (m) => m.AntecedentesCatalogoPage,
              ),
          },
        ],
      },

      // Legacy URLs retained for compatibility.
      { path: 'horarios', redirectTo: 'agenda/horarios-atencion', pathMatch: 'full' },
      {
        path: 'asignaciones',
        redirectTo: 'agenda/cobertura-profesionales',
        pathMatch: 'full',
      },
      { path: 'duraciones', redirectTo: 'agenda/intervalo-turnos', pathMatch: 'full' },
      { path: 'feriados', redirectTo: 'agenda/feriados-cierres', pathMatch: 'full' },
      {
        path: 'antecedentes-catalogo',
        redirectTo: 'configuracion/plantillas-antecedentes',
        pathMatch: 'full',
      },
      {
        path: 'especialidades',
        redirectTo: 'configuracion/especialidades',
        pathMatch: 'full',
      },
      {
        path: 'cargos-empleado',
        redirectTo: 'configuracion/cargos-personal',
        pathMatch: 'full',
      },
      {
        path: 'profesionales/:profId/disponibilidad',
        redirectTo: 'agenda/profesionales/:profId/disponibilidad',
        pathMatch: 'full',
      },
    ],
  },
];
