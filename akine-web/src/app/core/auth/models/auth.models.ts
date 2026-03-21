// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type RoleName =
  | 'ADMIN'
  | 'PROFESIONAL_ADMIN'
  | 'PROFESIONAL'
  | 'ADMINISTRATIVO'
  | 'PACIENTE';

// ─── Responses ────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
  accountState: string;
  defaultRole: RoleName | string;
  allowedRoles: RoleName[] | string[];
  consultorioIds: string[];
  profesionalId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // milliseconds
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  roles: RoleName[];
  consultorioIds: string[];
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterPatientRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface RegisterProfessionalRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  consultorioName: string;
  consultorioAddress?: string;
  consultorioPhone?: string;
}

export interface ActivateRequest {
  token: string;
}

export interface ResendActivationRequest {
  email: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserContext {
  tipo: 'PROFESIONAL' | 'EMPLEADO' | 'NONE';
  // Profesional
  matricula: string | null;
  especialidades: string[] | null;
  nroDocumento: string | null;
  domicilio: string | null;
  // Empleado
  cargo: string | null;
  dni: string | null;
}

// ─── Error format (RFC-7807 compatible) ───────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
