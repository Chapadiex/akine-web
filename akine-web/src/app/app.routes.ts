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
  {
    path: 'suscribirme/estado/:trackingToken',
    loadComponent: () =>
      import('./features/subscriptions/pages/subscription-status/subscription-status').then(
        (m) => m.SubscriptionStatusPage,
      ),
  },

  // ─── Auth (público, bloqueado si ya autenticado) ───────────────────────────
  {
    path: 'login',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./features/auth/login-selector/login-selector').then((m) => m.LoginSelectorPage),
  },
  {
    path: 'login/paciente',
    canActivate: [alreadyAuthGuard],
    data: { expectedRole: 'PACIENTE' },
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'login/profesional',
    canActivate: [alreadyAuthGuard],
    data: { expectedRole: 'PROFESIONAL' },
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'login/administrativo',
    canActivate: [alreadyAuthGuard],
    data: { expectedRole: 'ADMINISTRATIVO' },
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'login/admin',
    canActivate: [alreadyAuthGuard],
    data: { expectedRole: 'ADMIN' },
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
    path: 'activate-account',
    redirectTo: 'activate',
    pathMatch: 'full',
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
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
        loadChildren: () =>
          import('./features/historia-clinica/historia-clinica.routes').then(
            (m) => m.HISTORIA_CLINICA_ROUTES,
          ),
      },
      {
        path: 'equipo',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
        loadComponent: () =>
          import('./features/colaboradores/pages/equipo-list/equipo-list').then(
            (m) => m.EquipoListPage,
          ),
      },
      // Legacy redirects — retained for bookmarks and existing links
      { path: 'colaboradores', redirectTo: 'equipo', pathMatch: 'full' },
      { path: 'profesionales', redirectTo: 'equipo', pathMatch: 'full' },
      { path: 'empleados', redirectTo: 'equipo', pathMatch: 'full' },
      {
        path: 'cobertura',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
        children: [
          { path: '', redirectTo: 'financiadores', pathMatch: 'full' },
          {
            path: 'financiadores',
            loadComponent: () =>
              import('./features/cobertura/pages/financiadores-list/financiadores-list.component').then(
                (m) => m.FinanciadoresListComponent,
              ),
          },
          { path: 'planes', redirectTo: 'financiadores', pathMatch: 'full' },
        ],
      },
      {
        path: 'facturacion',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'] },
        children: [
          {
            path: 'convenios',
            loadComponent: () =>
              import('./features/facturacion/pages/convenios-list/convenios-list.component').then(
                (m) => m.ConveniosListComponent,
              ),
          },
          {
            path: 'lotes',
            loadComponent: () =>
              import('./features/facturacion/pages/lotes-list/lotes-list.component').then(
                (m) => m.LotesListComponent,
              ),
          },
          {
            path: 'conciliacion',
            loadComponent: () =>
              import('./features/facturacion/pages/conciliacion-dashboard/conciliacion-dashboard.component').then(
                (m) => m.ConciliacionDashboardComponent,
              ),
          },
        ],
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
      {
        path: 'admin/saas/metricas',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/subscriptions/pages/saas-metrics/saas-metrics').then(
            (m) => m.SaasMetricsPage,
          ),
      },
      {
        path: 'mi-suscripcion',
        loadComponent: () =>
          import('./features/subscriptions/pages/my-subscription/my-subscription').then(
            (m) => m.MySubscriptionPage,
          ),
      },
    ],
  },
  {
    path: 'account-review',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/account-review/account-review').then((m) => m.AccountReviewPage),
  },
  {
    path: 'account-suspended',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/account-suspended/account-suspended').then((m) => m.AccountSuspendedPage),
  },

  // ─── Compatibilidad hacia atrás ───────────────────────────────────────────
  { path: 'dashboard', redirectTo: '/app/inicio', pathMatch: 'full' },

  { path: '**', redirectTo: 'home' },
];
