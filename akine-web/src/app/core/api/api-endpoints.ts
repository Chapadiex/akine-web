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
    activateWithPassword: '/api/v1/auth/activate-with-password',
    rejectActivation: '/api/v1/auth/reject-activation',
    resendActivation: '/api/v1/auth/resend-activation',
  },
  subscriptions: {
    create: '/api/v1/subscriptions',
    createDraft: '/api/v1/subscriptions/draft',
    updateOwner: (id: string) => `/api/v1/subscriptions/${id}/owner`,
    updateCompany: (id: string) => `/api/v1/subscriptions/${id}/company`,
    updateClinic: (id: string) => `/api/v1/subscriptions/${id}/clinic`,
    simulatePayment: (id: string) => `/api/v1/subscriptions/${id}/payment-simulate`,
    submitApproval: (id: string) => `/api/v1/subscriptions/${id}/submit-approval`,
    statusByTracking: (trackingToken: string) => `/api/v1/subscriptions/status/${trackingToken}`,
  },
  users: {
    me: '/api/v1/users/me',
    mePassword: '/api/v1/users/me/password',
  },
  admin: {
    users: '/api/v1/admin/users',
    userRoles: (id: string) => `/api/v1/admin/users/${id}/roles`,
    subscriptions: '/api/v1/admin/subscriptions',
    approveSubscription: (id: string) => `/api/v1/admin/subscriptions/${id}/approve`,
    rejectSubscription: (id: string) => `/api/v1/admin/subscriptions/${id}/reject`,
    requestInfoSubscription: (id: string) => `/api/v1/admin/subscriptions/${id}/request-info`,
    suspendSubscription: (id: string) => `/api/v1/admin/subscriptions/${id}/suspend`,
    reactivateSubscription: (id: string) => `/api/v1/admin/subscriptions/${id}/reactivate`,
    subscriptionDetail: (id: string) => `/api/v1/admin/subscriptions/${id}`,
  },
  pacientes: {
    me: '/api/v1/pacientes/me',
    create: (consultorioId: string) => `/api/v1/pacientes?consultorioId=${consultorioId}`,
    list: (consultorioId: string) => `/api/v1/pacientes?consultorioId=${consultorioId}`,
    byId: (id: string, consultorioId: string) => `/api/v1/pacientes/${id}?consultorioId=${consultorioId}`,
    search: (consultorioId: string, dni?: string, q?: string) => {
      const params = new URLSearchParams({ consultorioId });
      if (dni) params.append('dni', dni);
      if (q) params.append('q', q);
      return `/api/v1/pacientes/search?${params.toString()}`;
    },
  },
  consultorios: {
    list:            '/api/v1/consultorios',
    create:          '/api/v1/consultorios',
    byId:            (id: string) => `/api/v1/consultorios/${id}`,
    update:          (id: string) => `/api/v1/consultorios/${id}`,
    inactivate:      (id: string) => `/api/v1/consultorios/${id}`,
    activate:        (id: string) => `/api/v1/consultorios/${id}/activar`,
    boxes:           (cid: string) => `/api/v1/consultorios/${cid}/boxes`,
    boxById:         (cid: string, id: string) => `/api/v1/consultorios/${cid}/boxes/${id}`,
    profesionales:   (cid: string) => `/api/v1/consultorios/${cid}/profesionales`,
    profesionalById: (cid: string, id: string) => `/api/v1/consultorios/${cid}/profesionales/${id}`,
    profesionalEstado: (cid: string, id: string) => `/api/v1/consultorios/${cid}/profesionales/${id}/estado`,
    horarios:           (cid: string) => `/api/v1/consultorios/${cid}/horarios`,
    horariosBatch:      (cid: string) => `/api/v1/consultorios/${cid}/horarios/batch`,
    horarioDia:         (cid: string, dia: string) => `/api/v1/consultorios/${cid}/horarios/${dia}`,
    horarioTramoById:   (cid: string, id: string) => `/api/v1/consultorios/${cid}/horarios/tramos/${id}`,
    duraciones:         (cid: string) => `/api/v1/consultorios/${cid}/duraciones`,
    duracionMin:        (cid: string, min: number) => `/api/v1/consultorios/${cid}/duraciones/${min}`,
    asignaciones:       (cid: string) => `/api/v1/consultorios/${cid}/asignaciones`,
    asignacionProf:     (cid: string, profId: string) => `/api/v1/consultorios/${cid}/asignaciones/${profId}`,
    disponibilidad:     (cid: string, profId: string) => `/api/v1/consultorios/${cid}/profesionales/${profId}/disponibilidad`,
    disponibilidadById: (cid: string, profId: string, id: string) => `/api/v1/consultorios/${cid}/profesionales/${profId}/disponibilidad/${id}`,
    boxCapacidad:       (cid: string, boxId: string) => `/api/v1/consultorios/${cid}/boxes/${boxId}/capacidad`,
    antecedentesCatalogo: (cid: string) => `/api/v1/consultorios/${cid}/antecedentes-catalogo`,
    antecedentesRestoreDefaults: (cid: string) => `/api/v1/consultorios/${cid}/antecedentes-catalogo/defaults/restore`,
    especialidades: (cid: string) => `/api/v1/consultorios/${cid}/especialidades`,
    especialidadById: (cid: string, especialidadId: string) => `/api/v1/consultorios/${cid}/especialidades/${especialidadId}`,
    especialidadActivar: (cid: string, especialidadId: string) => `/api/v1/consultorios/${cid}/especialidades/${especialidadId}/activar`,
    especialidadDesactivar: (cid: string, especialidadId: string) => `/api/v1/consultorios/${cid}/especialidades/${especialidadId}/desactivar`,
    colaboradoresProfesionales: (cid: string) => `/api/v1/consultorios/${cid}/colaboradores/profesionales`,
    colaboradorProfesionalById: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/profesionales/${id}`,
    colaboradorProfesionalEstado: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/profesionales/${id}/estado`,
    colaboradorProfesionalCrearCuenta: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/profesionales/${id}/crear-cuenta`,
    colaboradorProfesionalReenviar: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/profesionales/${id}/reenviar-activacion`,
    colaboradoresEmpleados: (cid: string) => `/api/v1/consultorios/${cid}/colaboradores/empleados`,
    colaboradorEmpleadoById: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/empleados/${id}`,
    colaboradorEmpleadoEstado: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/empleados/${id}/estado`,
    colaboradorEmpleadoReenviar: (cid: string, id: string) => `/api/v1/consultorios/${cid}/colaboradores/empleados/${id}/reenviar-activacion`,
  },
  turnos: {
    list:           (cid: string) => `/api/v1/consultorios/${cid}/turnos`,
    create:         (cid: string) => `/api/v1/consultorios/${cid}/turnos`,
    reprogramar:    (cid: string, id: string) => `/api/v1/consultorios/${cid}/turnos/${id}/reprogramar`,
    cambiarEstado:  (cid: string, id: string) => `/api/v1/consultorios/${cid}/turnos/${id}/estado`,
    disponibilidad: (cid: string) => `/api/v1/consultorios/${cid}/turnos/disponibilidad`,
    historial:      (cid: string, id: string) => `/api/v1/consultorios/${cid}/turnos/${id}/historial`,
  },
  feriados: {
    list:   (cid: string) => `/api/v1/consultorios/${cid}/feriados`,
    create: (cid: string) => `/api/v1/consultorios/${cid}/feriados`,
    delete: (cid: string, id: string) => `/api/v1/consultorios/${cid}/feriados/${id}`,
  },
  obrasSociales: {
    list: (cid: string, params?: { q?: string; estado?: string; conPlanes?: boolean; page?: number; size?: number }) => {
      const query = new URLSearchParams();
      if (params?.q) query.append('q', params.q);
      if (params?.estado) query.append('estado', params.estado);
      if (params?.conPlanes !== undefined) query.append('conPlanes', String(params.conPlanes));
      if (params?.page !== undefined) query.append('page', String(params.page));
      if (params?.size !== undefined) query.append('size', String(params.size));
      const suffix = query.toString();
      return `/api/v1/consultorios/${cid}/obras-sociales${suffix ? `?${suffix}` : ''}`;
    },
    create: (cid: string) => `/api/v1/consultorios/${cid}/obras-sociales`,
    byId: (cid: string, id: string) => `/api/v1/consultorios/${cid}/obras-sociales/${id}`,
    update: (cid: string, id: string) => `/api/v1/consultorios/${cid}/obras-sociales/${id}`,
    changeEstado: (cid: string, id: string) => `/api/v1/consultorios/${cid}/obras-sociales/${id}/estado`,
  },
} as const;
