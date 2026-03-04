export type SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED';

export interface CreateSubscriptionRequest {
  owner: {
    firstName: string;
    lastName: string;
    documentoFiscal: string;
    email: string;
    phone: string;
    password: string;
  };
  company: {
    name: string;
    cuit: string;
    address: string;
    city: string;
    province: string;
  };
  baseConsultorio: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  status: SubscriptionStatus;
  message: string;
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
