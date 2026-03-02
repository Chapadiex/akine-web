import { RoleName } from '../../core/auth/models/auth.models';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** Empty = visible to ALL authenticated users */
  roles: RoleName[];
}

/**
 * Navigation items for the App Shell sidebar.
 * Filtered at runtime by AuthService.userRoles().
 *
 * To protect a route by role, list the allowed roles.
 * Empty array means any authenticated user can see it.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    path: '/app/inicio',
    label: 'Inicio',
    icon: '⊞',
    roles: [],
  },
  {
    path: '/app/turnos',
    label: 'Turnos',
    icon: '📅',
    roles: [],
  },
  {
    path: '/app/pacientes',
    label: 'Pacientes',
    icon: '👥',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/historia-clinica',
    label: 'Historia Clínica',
    icon: '📋',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'],
  },
  {
    path: '/app/colaboradores',
    label: 'Colaboradores',
    icon: '👤',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
  },
  {
    path: '/app/obras-sociales',
    label: 'Obras Sociales',
    icon: '💳',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/caja',
    label: 'Caja',
    icon: '💰',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/reportes',
    label: 'Reportes',
    icon: '📊',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
  },
  {
    path: '/app/consultorios',
    label: 'Consultorios',
    icon: '🏥',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL', 'ADMINISTRATIVO'],
  },
];
