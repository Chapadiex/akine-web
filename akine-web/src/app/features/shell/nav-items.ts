import { RoleName } from '../../core/auth/models/auth.models';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: RoleName[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/app/inicio', label: 'Inicio', icon: 'IN', roles: [] },
  {
    path: '/app/turnos',
    label: 'Turnos (calendario)',
    icon: 'TU',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/pacientes',
    label: 'Pacientes',
    icon: 'PA',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
  },
  {
    path: '/app/historia-clinica',
    label: 'Atenciones (sesiones)',
    icon: 'AT',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'],
  },
  {
    path: '/app/caja',
    label: 'Caja',
    icon: 'CJ',
    roles: ['ADMINISTRATIVO'],
  },
  {
    path: '/app/consultorios',
    label: 'Configuracion',
    icon: 'CF',
    roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
    children: [
      {
        path: '/app/consultorios',
        label: 'Consultorios / Boxes',
        icon: 'CL',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
      },
      {
        path: '/app/colaboradores',
        label: 'Colaboradores',
        icon: 'CO',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
      },
      {
        path: '/app/obras-sociales',
        label: 'Obras Sociales / Convenios',
        icon: 'OS',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
      },
      {
        path: '/app/reportes',
        label: 'Reportes',
        icon: 'RE',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
      },
      {
        path: '/app/consultorios/:consultorioId/antecedentes-catalogo',
        label: 'Antecedentes (catálogo)',
        icon: 'AN',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
      },
    ],
  },
  {
    path: '/app/paciente/alta',
    label: 'Mi Ficha',
    icon: 'MF',
    roles: ['PACIENTE'],
  },
];
