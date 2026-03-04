import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { alreadyAuthGuard } from './core/auth/guards/already-auth.guard';
import { roleGuard } from './core/auth/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // ─── Público ──────────────────────────────────────────────────────────────
  {
    path: 'home',
    loadComponent: () =>
      import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'suscribirme',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./features/subscriptions/pages/subscription-signup/subscription-signup').then(
        (m) => m.SubscriptionSignupPage,
      ),
  },

  // ─── Auth (público, bloqueado si ya autenticado) ───────────────────────────
  {
    path: 'login',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    redirectTo: 'suscribirme',
    pathMatch: 'full',
  },
  {
    path: 'activate',
    loadComponent: () =>
      import('./features/auth/activate/activate').then((m) => m.Activate),
  },
  {
    path: 'forgot-password',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword,
      ),
  },

  // ─── App Shell (requiere autenticación) ───────────────────────────────────
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'turnos',
        loadComponent: () =>
          import('./features/turnos/turnos').then((m) => m.Turnos),
        loadChildren: () =>
          import('./features/turnos/turnos.routes').then((m) => m.TURNO_ROUTES),
      },
      {
        path: 'pacientes',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
        loadComponent: () =>
          import('./features/pacientes/pacientes').then((m) => m.Pacientes),
      },
      {
        path: 'pacientes/:patientId',
        loadComponent: () =>
          import('./features/paciente-360/paciente-360').then((m) => m.Paciente360),
        loadChildren: () =>
          import('./features/paciente-360/paciente-360.routes').then(
            (m) => m.PACIENTE_360_ROUTES,
          ),
      },
      {
        path: 'paciente/alta',
        canActivate: [roleGuard],
        data: { roles: ['PACIENTE'] },
        loadComponent: () =>
          import('./features/pacientes/pages/paciente-self-alta/paciente-self-alta').then(
            (m) => m.PacienteSelfAltaPage,
          ),
      },
      {
        path: 'historia-clinica',
        loadComponent: () =>
          import('./features/historia-clinica/historia-clinica').then(
            (m) => m.HistoriaClinica,
          ),
      },
      {
        path: 'colaboradores',
        redirectTo: 'profesionales',
        pathMatch: 'full',
      },
      {
        path: 'profesionales',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
        loadComponent: () =>
          import('./features/colaboradores/pages/profesionales-list/profesionales-list').then(
            (m) => m.ProfesionalesListPage,
          ),
      },
      {
        path: 'empleados',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
        loadComponent: () =>
          import('./features/colaboradores/pages/empleados-list/empleados-list').then(
            (m) => m.EmpleadosListPage,
          ),
      },
      {
        path: 'obras-sociales',
        loadComponent: () =>
          import('./features/obras-sociales/obras-sociales').then(
            (m) => m.ObrasSociales,
          ),
      },
      {
        path: 'caja',
        loadComponent: () =>
          import('./features/caja/caja').then((m) => m.Caja),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: 'consultorios',
        loadComponent: () =>
          import('./features/consultorios/consultorios').then((m) => m.Consultorios),
        loadChildren: () =>
          import('./features/consultorios/consultorios.routes').then((m) => m.CONSULTORIO_ROUTES),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/perfil').then((m) => m.Perfil),
      },
      {
        path: 'admin/suscripciones',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/subscriptions/pages/admin-subscriptions/admin-subscriptions').then(
            (m) => m.AdminSubscriptionsPage,
          ),
      },
    ],
  },

  // ─── Compatibilidad hacia atrás ───────────────────────────────────────────
  { path: 'dashboard', redirectTo: '/app/inicio', pathMatch: 'full' },

  { path: '**', redirectTo: 'home' },
];
