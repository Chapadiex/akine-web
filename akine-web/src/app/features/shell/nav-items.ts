import { RoleName } from '../../core/auth/models/auth.models';

export type QueryParams = Record<string, string>;

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: RoleName[];
  queryParams?: QueryParams;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'operacion',
    title: 'Operacion',
    items: [
      { path: '/app/inicio', label: 'Dashboard', icon: 'DA', roles: [] },
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
        label: 'Sesiones',
        icon: 'SE',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'],
      },
      {
        path: '/app/caja',
        label: 'Caja',
        icon: 'CJ',
        roles: ['ADMINISTRATIVO'],
      },
      {
        path: '/app/paciente/alta',
        label: 'Mi Ficha',
        icon: 'MF',
        roles: ['PACIENTE'],
      },
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuracion',
    items: [
      {
        path: '/app/consultorios/:consultorioId/horarios',
        label: 'Agenda (horarios, duraciones, feriados, disponibilidad)',
        icon: 'AG',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
        children: [
          {
            path: '/app/consultorios/:consultorioId/horarios',
            label: 'Horarios',
            icon: 'HO',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/duraciones',
            label: 'Duraciones',
            icon: 'DU',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/feriados',
            label: 'Feriados',
            icon: 'FE',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/asignaciones',
            label: 'Disponibilidad',
            icon: 'DP',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
        ],
      },
      {
        path: '/app/consultorios/:consultorioId/boxes',
        label: 'Consultorio y espacios (boxes)',
        icon: 'CE',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
      },
      {
        path: '/app/admin/suscripciones',
        label: 'Suscripciones SaaS',
        icon: 'SA',
        roles: ['ADMIN'],
      },
      {
        path: '/app/profesionales',
        label: 'Equipo',
        icon: 'EQ',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
        children: [
          {
            path: '/app/profesionales',
            label: 'Profesionales',
            icon: 'PR',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/empleados',
            label: 'Administrativos',
            icon: 'AD',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/profesionales',
            label: 'Invitaciones',
            icon: 'IV',
            queryParams: { estado: 'INVITADO' },
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
        ],
      },
      {
        path: '/app/obras-sociales',
        label: 'Obras Sociales y Convenios',
        icon: 'OS',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
      },
      {
        path: '/app/consultorios/:consultorioId/especialidades',
        label: 'Catalogos',
        icon: 'CA',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
        children: [
          {
            path: '/app/consultorios/:consultorioId/especialidades',
            label: 'Especialidades',
            icon: 'ES',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/antecedentes-catalogo',
            label: 'Antecedentes',
            icon: 'AN',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
        ],
      },
    ],
  },
  {
    id: 'reportes',
    title: 'Reportes',
    items: [
      {
        path: '/app/reportes',
        label: 'Reportes',
        icon: 'RE',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
        children: [
          {
            path: '/app/reportes',
            label: 'Turnos (ocupacion, ausentismo)',
            icon: 'RT',
            queryParams: { section: 'turnos' },
            roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
          },
          {
            path: '/app/reportes',
            label: 'Caja (ingresos/egresos)',
            icon: 'RC',
            queryParams: { section: 'caja' },
            roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
          },
          {
            path: '/app/reportes',
            label: 'OS (facturado vs cobrado)',
            icon: 'RO',
            queryParams: { section: 'os' },
            roles: ['ADMIN', 'PROFESIONAL_ADMIN'],
          },
        ],
      },
    ],
  },
];
