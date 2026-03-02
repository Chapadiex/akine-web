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
  consultorioIds: string[];
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

// ─── Error format (RFC-7807 compatible) ───────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
