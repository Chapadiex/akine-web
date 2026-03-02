/**
 * Single source of truth for all backend API paths.
 * Matches exactly the endpoints exposed by akine-api (v1).
 *
 * ─── Contrato activo ──────────────────────────────────────────────────────────
 * Swagger/OpenAPI: http://localhost:8080/swagger-ui.html
 * OpenAPI JSON:    http://localhost:8080/v3/api-docs
 *
 * ─── Decisión: Refresh Token ──────────────────────────────────────────────────
 * ACTUAL:  refresh token en body JSON → almacenado en localStorage.
 *          Riesgo: XSS puede leer localStorage.
 * FUTURO:  httpOnly cookie (XSS-resistant).
 *          Requiere: backend → Set-Cookie header + CSRF config, frontend → sin storage explícito.
 *          Prioridad: sprint de seguridad tras Módulo 2 (Turnos).
 */
export const API = {
  auth: {
    login: '/api/v1/auth/login',
    refresh: '/api/v1/auth/refresh',
    logout: '/api/v1/auth/logout',
    registerPatient: '/api/v1/auth/register/patient',
    registerProfessional: '/api/v1/auth/register/professional',
    activate: '/api/v1/auth/activate',
    resendActivation: '/api/v1/auth/resend-activation',
  },
  users: {
    me: '/api/v1/users/me',
    mePassword: '/api/v1/users/me/password',
  },
  admin: {
    users: '/api/v1/admin/users',
    userRoles: (id: string) => `/api/v1/admin/users/${id}/roles`,
  },
  consultorios: {
    list:            '/api/v1/consultorios',
    create:          '/api/v1/consultorios',
    byId:            (id: string) => `/api/v1/consultorios/${id}`,
    update:          (id: string) => `/api/v1/consultorios/${id}`,
    inactivate:      (id: string) => `/api/v1/consultorios/${id}`,
    boxes:           (cid: string) => `/api/v1/consultorios/${cid}/boxes`,
    boxById:         (cid: string, id: string) => `/api/v1/consultorios/${cid}/boxes/${id}`,
    profesionales:   (cid: string) => `/api/v1/consultorios/${cid}/profesionales`,
    profesionalById: (cid: string, id: string) => `/api/v1/consultorios/${cid}/profesionales/${id}`,
    horarios:           (cid: string) => `/api/v1/consultorios/${cid}/horarios`,
    horarioDia:         (cid: string, dia: string) => `/api/v1/consultorios/${cid}/horarios/${dia}`,
    duraciones:         (cid: string) => `/api/v1/consultorios/${cid}/duraciones`,
    duracionMin:        (cid: string, min: number) => `/api/v1/consultorios/${cid}/duraciones/${min}`,
    asignaciones:       (cid: string) => `/api/v1/consultorios/${cid}/asignaciones`,
    asignacionProf:     (cid: string, profId: string) => `/api/v1/consultorios/${cid}/asignaciones/${profId}`,
    disponibilidad:     (cid: string, profId: string) => `/api/v1/consultorios/${cid}/profesionales/${profId}/disponibilidad`,
    disponibilidadById: (cid: string, profId: string, id: string) => `/api/v1/consultorios/${cid}/profesionales/${profId}/disponibilidad/${id}`,
    boxCapacidad:       (cid: string, boxId: string) => `/api/v1/consultorios/${cid}/boxes/${boxId}/capacidad`,
  },
} as const;
