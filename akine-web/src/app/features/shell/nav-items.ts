import { RoleName } from '../../core/auth/models/auth.models';

export type QueryParams = Record<string, string>;

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: RoleName[];
  queryParams?: QueryParams;
  children?: NavItem[];
  dividerBefore?: boolean;
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
    title: 'Operaci\u00f3n',
    items: [
      {
        path: '/app/inicio',
        label: 'Inicio',
        icon: 'home',
        roles: ALL_STAFF,
      },
      {
        path: '/app/turnos/hoy',
        label: 'Agenda',
        icon: 'calendar',
        roles: ALL_STAFF,
        children: [
          { path: '/app/turnos/agenda', label: 'Calendario', icon: 'calendar-grid', roles: ALL_STAFF },
        ],
      },
      {
        path: '/app/pacientes',
        label: 'Paciente 360',
        icon: 'users',
        roles: STAFF_WITH_ADMIN,
        dividerBefore: true,
      },
      {
        path: '/app/historia-clinica',
        label: 'Atenci\u00f3n',
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
            label: 'Historia cl\u00ednica',
            icon: 'file-medical',
            roles: CLINICAL_STAFF,
          },
          {
            path: '/app/historia-clinica',
            label: 'Evoluciones / diagn\u00f3sticos',
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
    title: 'Administraci\u00f3n',
    items: [
      {
        path: '/app/cobertura',
        label: 'Cobertura',
        icon: 'shield-check',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/cobertura/financiadores', label: 'Financiadores', icon: 'building', roles: STAFF_WITH_ADMIN },
          { path: '/app/cobertura/planes', label: 'Planes', icon: 'layers', roles: STAFF_WITH_ADMIN },
        ],
      },
      {
        path: '/app/facturacion',
        label: 'Facturaci\u00f3n',
        icon: 'receipt',
        roles: STAFF_WITH_ADMIN,
        children: [
          { path: '/app/facturacion/convenios', label: 'Convenios', icon: 'handshake', roles: STAFF_WITH_ADMIN },
          { path: '/app/facturacion/lotes', label: 'Lotes / Presentaci\u00f3n', icon: 'inventory', roles: STAFF_WITH_ADMIN },
          { path: '/app/facturacion/conciliacion', label: 'Conciliaci\u00f3n', icon: 'account-balance', roles: STAFF_WITH_ADMIN },
        ],
      },
      {
        path: '/app/consultorios',
        label: 'Consultorios 360',
        icon: 'building',
        roles: STAFF_WITH_ADMIN,
        children: [
          {
            path: '/app/equipo',
            label: 'Colaboradores',
            icon: 'users',
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
    ],
  },
  {
    id: 'plataforma',
    title: 'Plataforma',
    items: [
      {
        path: '/app/admin/suscripciones',
        label: 'Suscripci\u00f3n',
        icon: 'credit-card',
        roles: PLATFORM_ADMIN,
        children: [
          { path: '/app/admin/suscripciones', label: 'Plan SaaS', icon: 'layers', roles: PLATFORM_ADMIN },
          { path: '/app/admin/suscripciones', label: 'Facturaci\u00f3n', icon: 'receipt-text', roles: PLATFORM_ADMIN },
          {
            path: '/app/admin/suscripciones',
            label: 'L\u00edmites / usuarios',
            icon: 'users-gear',
            roles: PLATFORM_ADMIN,
          },
        ],
      },
    ],
  },
];
