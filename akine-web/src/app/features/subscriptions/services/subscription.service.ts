import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  ApproveSubscriptionRequest,
  ClinicPayload,
  CompanyPayload,
  CreateSubscriptionDraftRequest,
  CreateSubscriptionResponse,
  OwnerPayload,
  PagedSubscriptionListResponse,
  RejectSubscriptionRequest,
  SubscriptionDetail,
  SubscriptionStatusResponse,
  SubscriptionSummary,
  SuspendSubscriptionRequest,
} from '../models/subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(ApiClient);

  createDraft(request: CreateSubscriptionDraftRequest): Observable<CreateSubscriptionResponse> {
    return this.api.post<CreateSubscriptionResponse>(API.subscriptions.createDraft, request);
  }

  updateOwner(subscriptionId: string, request: OwnerPayload): Observable<SubscriptionStatusResponse> {
    return this.api.patch<SubscriptionStatusResponse>(
      API.subscriptions.updateOwner(subscriptionId),
      request,
    );
  }

  updateCompany(subscriptionId: string, request: CompanyPayload): Observable<SubscriptionStatusResponse> {
    return this.api.patch<SubscriptionStatusResponse>(
      API.subscriptions.updateCompany(subscriptionId),
      request,
    );
  }

  updateClinic(subscriptionId: string, request: ClinicPayload): Observable<SubscriptionStatusResponse> {
    return this.api.patch<SubscriptionStatusResponse>(
      API.subscriptions.updateClinic(subscriptionId),
      request,
    );
  }

  simulatePayment(subscriptionId: string, paymentReference: string): Observable<SubscriptionStatusResponse> {
    return this.api.patch<SubscriptionStatusResponse>(
      API.subscriptions.simulatePayment(subscriptionId),
      { paymentReference },
    );
  }

  submitForApproval(subscriptionId: string): Observable<SubscriptionStatusResponse> {
    return this.api.post<SubscriptionStatusResponse>(API.subscriptions.submitApproval(subscriptionId), {});
  }

  getByTrackingToken(trackingToken: string): Observable<SubscriptionStatusResponse> {
    return this.api.get<SubscriptionStatusResponse>(API.subscriptions.statusByTracking(trackingToken));
  }

  listAdmin(params: { status?: string; page?: number; size?: number }): Observable<PagedSubscriptionListResponse> {
    const query: Record<string, string | number> = {};
    if (params.status) query['status'] = params.status;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.size !== undefined) query['size'] = params.size;
    return this.api.get<PagedSubscriptionListResponse>(API.admin.subscriptions, query);
  }

  getAdminDetail(subscriptionId: string): Observable<SubscriptionDetail> {
    return this.api.get<SubscriptionDetail>(API.admin.subscriptionDetail(subscriptionId));
  }

  approve(subscriptionId: string, request: ApproveSubscriptionRequest): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(API.admin.approveSubscription(subscriptionId), request);
  }

  reject(subscriptionId: string, request: RejectSubscriptionRequest): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(API.admin.rejectSubscription(subscriptionId), request);
  }

  requestInfo(subscriptionId: string, reason: string): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(API.admin.requestInfoSubscription(subscriptionId), { reason });
  }

  suspend(subscriptionId: string, request: SuspendSubscriptionRequest): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(API.admin.suspendSubscription(subscriptionId), request);
  }

  reactivate(subscriptionId: string): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(API.admin.reactivateSubscription(subscriptionId), {});
  }
}
