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

const ALL_STAFF: RoleName[] = ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL', 'ADMINISTRATIVO'];
const STAFF_WITH_ADMIN: RoleName[] = ['ADMIN', 'PROFESIONAL_ADMIN', 'ADMINISTRATIVO'];
const CLINICAL_STAFF: RoleName[] = ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'];
const PLATFORM_ADMIN: RoleName[] = ['ADMIN'];
const PATIENT_ONLY: RoleName[] = ['PACIENTE'];

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'operacion',
    title: 'Operacion',
    items: [
      {
        path: '/app/inicio',
        label: 'Inicio',
        icon: 'IN',
        roles: ALL_STAFF,
        children: [
          { path: '/app/inicio', label: 'Dashboard', icon: 'DA', roles: ALL_STAFF },
        ],
      },
      {
        path: '/app/turnos',
        label: 'Agenda',
        icon: 'AG',
        roles: ALL_STAFF,
        children: [
          { path: '/app/turnos', label: 'Calendario', icon: 'CA', roles: ALL_STAFF },
          {
            path: '/app/consultorios/:consultorioId/agenda/cobertura-profesionales',
            label: 'Disponibilidad profesional',
            icon: 'DP',
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/intervalo-turnos',
            label: 'Intervalos de turnos',
            icon: 'IT',
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/feriados-cierres',
            label: 'Feriados y cierres',
            icon: 'FE',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
      {
        path: '/app/pacientes',
        label: 'Pacientes',
        icon: 'PA',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/pacientes', label: 'Listado de pacientes', icon: 'LI', roles: STAFF_WITH_ADMIN },
          { path: '/app/pacientes', label: 'Alta de paciente', icon: 'AL', roles: STAFF_WITH_ADMIN },
          { path: '/app/pacientes', label: 'Paciente 360', icon: '36', roles: STAFF_WITH_ADMIN },
        ],
      },
      {
        path: '/app/historia-clinica',
        label: 'Atencion',
        icon: 'AT',
        roles: CLINICAL_STAFF,
        children: [
          {
            path: '/app/historia-clinica',
            label: 'Sesiones / atenciones',
            icon: 'SE',
            roles: CLINICAL_STAFF,
          },
          {
            path: '/app/historia-clinica',
            label: 'Historia clinica',
            icon: 'HC',
            roles: CLINICAL_STAFF,
          },
          {
            path: '/app/historia-clinica',
            label: 'Evoluciones / diagnosticos',
            icon: 'EV',
            roles: CLINICAL_STAFF,
          },
        ],
      },
      {
        path: '/app/caja',
        label: 'Caja',
        icon: 'CJ',
        roles: ['ADMINISTRATIVO'],
        children: [
          { path: '/app/caja', label: 'Cobros', icon: 'CO', roles: ['ADMINISTRATIVO'] },
          { path: '/app/caja', label: 'Movimientos', icon: 'MO', roles: ['ADMINISTRATIVO'] },
          { path: '/app/caja', label: 'Cierres', icon: 'CI', roles: ['ADMINISTRATIVO'] },
        ],
      },
      {
        path: '/app/paciente/alta',
        label: 'Mi ficha',
        icon: 'MF',
        roles: PATIENT_ONLY,
      },
    ],
  },
  {
    id: 'administracion',
    title: 'Administracion',
    items: [
      {
        path: '/app/profesionales',
        label: 'Equipo',
        icon: 'EQ',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/profesionales', label: 'Profesionales', icon: 'PR', roles: STAFF_WITH_ADMIN },
          { path: '/app/empleados', label: 'Administrativos', icon: 'AD', roles: STAFF_WITH_ADMIN },
          {
            path: '/app/profesionales',
            label: 'Invitaciones',
            icon: 'IV',
            queryParams: { estado: 'INVITADO' },
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/configuracion/cargos-personal',
            label: 'Cargos del personal',
            icon: 'CG',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
      {
        path: '/app/obras-sociales',
        label: 'Cobertura',
        icon: 'CO',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/obras-sociales', label: 'Obras sociales', icon: 'OS', roles: STAFF_WITH_ADMIN },
          { path: '/app/obras-sociales', label: 'Planes', icon: 'PL', roles: STAFF_WITH_ADMIN },
          { path: '/app/obras-sociales', label: 'Convenios', icon: 'CV', roles: STAFF_WITH_ADMIN },
        ],
      },
      {
        path: '/app/consultorios',
        label: 'Consultorio',
        icon: 'CN',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/consultorios', label: 'Consultorios', icon: 'CT', roles: STAFF_WITH_ADMIN },
          {
            path: '/app/consultorios/:consultorioId/boxes',
            label: 'Espacios / boxes',
            icon: 'BX',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
      {
        path: '/app/consultorios/:consultorioId/configuracion/especialidades',
        label: 'Clinica',
        icon: 'CL',
        roles: STAFF_WITH_ADMIN,
        children: [
          {
            path: '/app/consultorios/:consultorioId/configuracion/especialidades',
            label: 'Especialidades',
            icon: 'ES',
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/configuracion/plantillas-antecedentes',
            label: 'Plantillas de antecedentes',
            icon: 'AN',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
    ],
  },
  {
    id: 'plataforma',
    title: 'Plataforma',
    items: [
      {
        path: '/app/admin/suscripciones',
        label: 'Suscripcion',
        icon: 'SA',
        roles: PLATFORM_ADMIN,
        children: [
          { path: '/app/admin/suscripciones', label: 'Plan SaaS', icon: 'PL', roles: PLATFORM_ADMIN },
          { path: '/app/admin/suscripciones', label: 'Facturacion', icon: 'FA', roles: PLATFORM_ADMIN },
          {
            path: '/app/admin/suscripciones',
            label: 'Limites / usuarios',
            icon: 'LU',
            roles: PLATFORM_ADMIN,
          },
        ],
      },
    ],
  },
];
