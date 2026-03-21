export type SubscriptionStatus =
  | 'DRAFT'
  | 'EMAIL_PENDING'
  | 'PAYMENT_PENDING'
  | 'SETUP_PENDING'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'PENDING_RENEWAL'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED';

export interface OwnerPayload {
  firstName: string;
  lastName: string;
  documentoFiscal: string;
  email: string;
  phone: string;
  password: string;
}

export interface CompanyPayload {
  name: string;
  cuit: string;
  address: string;
  city: string;
  province: string;
}

export interface ClinicPayload {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface CreateSubscriptionDraftRequest {
  planCode: string;
  billingCycle: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface CreateSubscriptionRequest {
  planCode: string;
  billingCycle: string;
  owner: OwnerPayload;
  company: CompanyPayload;
  baseConsultorio: ClinicPayload;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  status: SubscriptionStatus;
  message: string;
  trackingToken: string;
}

export interface SubscriptionStatusResponse {
  id: string;
  status: SubscriptionStatus;
  planCode: string | null;
  billingCycle: string | null;
  onboardingStep: string | null;
  trackingToken: string | null;
  submittedForApprovalAt: string | null;
  requestedAt: string;
  startDate: string | null;
  endDate: string | null;
  rejectionReason: string | null;
}

export interface SubscriptionOwnerInfo {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SubscriptionCompanyInfo {
  id: string;
  name: string;
  cuit: string;
  city: string;
  province: string;
}

export interface SubscriptionConsultorioInfo {
  id: string;
  name: string;
  address: string;
}

export interface SubscriptionSummary {
  id: string;
  status: SubscriptionStatus;
  planCode: string | null;
  billingCycle: string | null;
  onboardingStep: string | null;
  trackingToken: string | null;
  submittedForApprovalAt: string | null;
  requestedAt: string;
  startDate: string | null;
  endDate: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
  owner: SubscriptionOwnerInfo;
  company: SubscriptionCompanyInfo;
  baseConsultorio: SubscriptionConsultorioInfo;
}

export interface SubscriptionAuditItem {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface SubscriptionDetail {
  subscription: SubscriptionSummary;
  auditTrail: SubscriptionAuditItem[];
}

export interface PagedSubscriptionListResponse {
  content: SubscriptionSummary[];
  page: number;
  size: number;
  totalElements: number;
}

export interface ApproveSubscriptionRequest {
  startDate: string;
  endDate: string;
}

export interface RejectSubscriptionRequest {
  reason?: string;
}

export interface SuspendSubscriptionRequest {
  reason?: string;
}

// ── Phase 4: Self-service del owner ──────────────────────────────────────────

export interface ChangePlanRequest {
  planCode: string;
}

export interface PlanInfo {
  code: string;
  nombre: string;
  descripcion: string | null;
  precioMensual: number;
}

// ── Phase 5: Métricas SaaS admin ─────────────────────────────────────────────

export interface VencimientoProximo {
  nroConsultorio: string | null;
  razonSocial: string | null;
  endDate: string;
  diasRestantes: number;
}

export interface SaasMetrics {
  totalSuscripciones: Record<string, number>;
  distribucionPlanes: Record<string, number>;
  mrr: {
    total: number;
    porPlan: Record<string, number>;
  };
  vencimientosProximos: VencimientoProximo[];
  nuevasSuscripcionesUltimos30Dias: number;
  churnsUltimos30Dias: number;
}
