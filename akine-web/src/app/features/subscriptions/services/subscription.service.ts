import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client.service';
import { API } from '../../../core/api/api-endpoints';
import {
  ApproveSubscriptionRequest,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  PagedSubscriptionListResponse,
  RejectSubscriptionRequest,
  SubscriptionSummary,
  SuspendSubscriptionRequest,
} from '../models/subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(ApiClient);

  create(
    request: CreateSubscriptionRequest,
  ): Observable<CreateSubscriptionResponse> {
    return this.api.post<CreateSubscriptionResponse>(API.subscriptions.create, request);
  }

  listAdmin(params: {
    status?: string;
    page?: number;
    size?: number;
  }): Observable<PagedSubscriptionListResponse> {
    const query: Record<string, string | number> = {};
    if (params.status) query['status'] = params.status;
    if (params.page !== undefined) query['page'] = params.page;
    if (params.size !== undefined) query['size'] = params.size;

    return this.api.get<PagedSubscriptionListResponse>(API.admin.subscriptions, query);
  }

  approve(
    subscriptionId: string,
    request: ApproveSubscriptionRequest,
  ): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(
      API.admin.approveSubscription(subscriptionId),
      request,
    );
  }

  reject(
    subscriptionId: string,
    request: RejectSubscriptionRequest,
  ): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(
      API.admin.rejectSubscription(subscriptionId),
      request,
    );
  }

  suspend(
    subscriptionId: string,
    request: SuspendSubscriptionRequest,
  ): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(
      API.admin.suspendSubscription(subscriptionId),
      request,
    );
  }

  reactivate(subscriptionId: string): Observable<SubscriptionSummary> {
    return this.api.patch<SubscriptionSummary>(
      API.admin.reactivateSubscription(subscriptionId),
      {},
    );
  }
}
