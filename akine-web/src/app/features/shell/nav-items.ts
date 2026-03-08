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
    title: 'Operación',
    items: [
      {
        path: '/app/inicio',
        label: 'Inicio',
        icon: 'home',
        roles: ALL_STAFF,
        children: [
          { path: '/app/inicio', label: 'Dashboard', icon: 'dashboard', roles: ALL_STAFF },
        ],
      },
      {
        path: '/app/turnos',
        label: 'Agenda',
        icon: 'calendar',
        roles: ALL_STAFF,
        children: [
          { path: '/app/turnos', label: 'Calendario', icon: 'calendar-grid', roles: ALL_STAFF },
          {
            path: '/app/consultorios/:consultorioId/agenda/cobertura-profesionales',
            label: 'Disponibilidad profesional',
            icon: 'clock-check',
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/intervalo-turnos',
            label: 'Intervalos de turnos',
            icon: 'timer',
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/agenda/feriados-cierres',
            label: 'Feriados y cierres',
            icon: 'calendar-off',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
      {
        path: '/app/pacientes',
        label: 'Pacientes',
        icon: 'users',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/pacientes', label: 'Listado de pacientes', icon: 'list', roles: STAFF_WITH_ADMIN },
          { path: '/app/pacientes', label: 'Alta de paciente', icon: 'user-plus', roles: STAFF_WITH_ADMIN },
          { path: '/app/pacientes', label: 'Paciente 360', icon: 'user-circle', roles: STAFF_WITH_ADMIN },
        ],
      },
      {
        path: '/app/historia-clinica',
        label: 'Atención',
        icon: 'stethoscope',
        roles: CLINICAL_STAFF,
        children: [
          {
            path: '/app/historia-clinica',
            label: 'Sesiones / atenciones',
            icon: 'activity',
            roles: CLINICAL_STAFF,
          },
          {
            path: '/app/historia-clinica',
            label: 'Historia clínica',
            icon: 'file-medical',
            roles: CLINICAL_STAFF,
          },
          {
            path: '/app/historia-clinica',
            label: 'Evoluciones / diagnósticos',
            icon: 'clipboard-pulse',
            roles: CLINICAL_STAFF,
          },
        ],
      },
      {
        path: '/app/caja',
        label: 'Caja',
        icon: 'wallet',
        roles: ['ADMINISTRATIVO'],
        children: [
          { path: '/app/caja', label: 'Cobros', icon: 'receipt', roles: ['ADMINISTRATIVO'] },
          { path: '/app/caja', label: 'Movimientos', icon: 'arrows-left-right', roles: ['ADMINISTRATIVO'] },
          { path: '/app/caja', label: 'Cierres', icon: 'lock', roles: ['ADMINISTRATIVO'] },
        ],
      },
      {
        path: '/app/paciente/alta',
        label: 'Mi ficha',
        icon: 'id-card',
        roles: PATIENT_ONLY,
      },
    ],
  },
  {
    id: 'administracion',
    title: 'Administración',
    items: [
      {
        path: '/app/profesionales',
        label: 'Equipo',
        icon: 'team',
        roles: STAFF_WITH_ADMIN,
        children: [
          {
            path: '/app/profesionales',
            label: 'Profesionales',
            icon: 'briefcase-medical',
            roles: STAFF_WITH_ADMIN,
          },
          { path: '/app/empleados', label: 'Administrativos', icon: 'briefcase', roles: STAFF_WITH_ADMIN },
          {
            path: '/app/profesionales',
            label: 'Invitaciones',
            icon: 'mail',
            queryParams: { estado: 'INVITADO' },
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/configuracion/cargos-personal',
            label: 'Cargos del personal',
            icon: 'badge',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
      {
        path: '/app/obras-sociales',
        label: 'Cobertura',
        icon: 'shield',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/obras-sociales', label: 'Obras sociales', icon: 'heart-shield', roles: STAFF_WITH_ADMIN },
          { path: '/app/obras-sociales', label: 'Planes', icon: 'layers', roles: STAFF_WITH_ADMIN },
          { path: '/app/obras-sociales', label: 'Convenios', icon: 'handshake', roles: STAFF_WITH_ADMIN },
        ],
      },
      {
        path: '/app/consultorios',
        label: 'Consultorio',
        icon: 'building',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/consultorios', label: 'Consultorios', icon: 'building-grid', roles: STAFF_WITH_ADMIN },
          {
            path: '/app/consultorios/:consultorioId/boxes',
            label: 'Espacios / boxes',
            icon: 'door',
            roles: STAFF_WITH_ADMIN,
          },
        ],
      },
      {
        path: '/app/consultorios/:consultorioId/configuracion/especialidades',
        label: 'Clínica',
        icon: 'clinic',
        roles: STAFF_WITH_ADMIN,
        children: [
          {
            path: '/app/consultorios/:consultorioId/configuracion/especialidades',
            label: 'Especialidades',
            icon: 'spark',
            roles: STAFF_WITH_ADMIN,
          },
          {
            path: '/app/consultorios/:consultorioId/configuracion/plantillas-antecedentes',
            label: 'Plantillas de antecedentes',
            icon: 'clipboard-list',
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
        label: 'Suscripción',
        icon: 'credit-card',
        roles: PLATFORM_ADMIN,
        children: [
          { path: '/app/admin/suscripciones', label: 'Plan SaaS', icon: 'layers', roles: PLATFORM_ADMIN },
          { path: '/app/admin/suscripciones', label: 'Facturación', icon: 'receipt-text', roles: PLATFORM_ADMIN },
          {
            path: '/app/admin/suscripciones',
            label: 'Límites / usuarios',
            icon: 'users-gear',
            roles: PLATFORM_ADMIN,
          },
        ],
      },
    ],
  },
];
