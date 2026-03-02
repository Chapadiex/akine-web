import { RoleName } from '../../core/auth/models/auth.models';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: RoleName[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/app/inicio', label: 'Inicio', icon: 'IN', roles: [] },
  { path: '/app/turnos', label: 'Turnos', icon: 'TU', roles: [] },
  {
    path: '/app/pacientes',
    label: 'Pacientes',
    icon: 'PA',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/paciente/alta',
    label: 'Mi Ficha',
    icon: 'MF',
    roles: ['PACIENTE'],
  },
  {
    path: '/app/historia-clinica',
    label: 'Historia Clinica',
    icon: 'HC',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'],
  },
  {
    path: '/app/colaboradores',
    label: 'Colaboradores',
    icon: 'CO',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
  },
  {
    path: '/app/obras-sociales',
    label: 'Obras Sociales',
    icon: 'OS',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/caja',
    label: 'Caja',
    icon: 'CJ',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/reportes',
    label: 'Reportes',
    icon: 'RE',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
  },
  {
    path: '/app/consultorios',
    label: 'Consultorios',
    icon: 'CL',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL', 'ADMINISTRATIVO'],
  },
];