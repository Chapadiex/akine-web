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
        path: '/app/consultorios/:consultorioId/agenda/horarios-atencion',
        label: 'Agenda (horarios, cobertura, intervalos, feriados)',
        icon: 'AG',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
        children: [
          {
            path: '/app/consultorios/:consultorioId/agenda/horarios-atencion',
            label: 'Horarios de atencion',
            icon: 'HO',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/intervalo-turnos',
            label: 'Intervalo de turnos',
            icon: 'DU',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/feriados-cierres',
            label: 'Feriados y cierres',
            icon: 'FE',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/cobertura-profesionales',
            label: 'Cobertura profesional',
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
        path: '/app/consultorios/:consultorioId/configuracion/especialidades',
        label: 'Configuracion clinica',
        icon: 'CA',
        roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
        children: [
          {
            path: '/app/consultorios/:consultorioId/configuracion/especialidades',
            label: 'Especialidades',
            icon: 'ES',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/configuracion/cargos-personal',
            label: 'Cargos del personal',
            icon: 'CG',
            roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'],
          },
          {
            path: '/app/consultorios/:consultorioId/configuracion/plantillas-antecedentes',
            label: 'Plantillas de antecedentes',
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
