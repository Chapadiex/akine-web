import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../../services/subscription.service';
import { SubscriptionDetail, SubscriptionStatus, SubscriptionSummary } from '../../models/subscription.models';

interface StatusTab {
  value: SubscriptionStatus;
  label: string;
}

@Component({
  selector: 'app-admin-subscriptions-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-subscriptions.html',
  styleUrl: './admin-subscriptions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSubscriptionsPage implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly tabs: StatusTab[] = [
    { value: 'PENDING_APPROVAL', label: 'Pendientes' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'PENDING_RENEWAL', label: 'Renovación pendiente' },
    { value: 'SETUP_PENDING', label: 'Pedir info' },
    { value: 'SUSPENDED', label: 'Suspendidas' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'EXPIRED', label: 'Vencidas' },
  ];

  readonly activeStatus = signal<SubscriptionStatus>('PENDING_APPROVAL');
  readonly loading = signal(false);
  readonly actionLoading = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly detail = signal<SubscriptionDetail | null>(null);

  readonly items = signal<SubscriptionSummary[]>([]);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);

  readonly pendingApproveId = signal<string | null>(null);
  readonly approveForm = this.fb.group({
    startDate: [this.todayIso(), [Validators.required]],
    endDate: [this.plusDaysIso(30), [Validators.required]],
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalElements() / this.size())));

  ngOnInit(): void {
    this.load();
  }

  selectStatus(status: SubscriptionStatus): void {
    if (status === this.activeStatus()) return;
    this.activeStatus.set(status);
    this.page.set(0);
    this.pendingApproveId.set(null);
    this.detail.set(null);
    this.errorMessage.set(null);
    this.actionError.set(null);
    this.load();
  }

  openDetail(subscriptionId: string): void {
    this.detail.set(null);
    this.subscriptionService.getAdminDetail(subscriptionId).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error) => this.actionError.set(this.mapError(error)),
    });
  }

  closeDetail(): void {
    this.detail.set(null);
  }

  previousPage(): void {
    if (this.page() <= 0 || this.loading()) return;
    this.page.update((p) => p - 1);
    this.load();
  }

  nextPage(): void {
    if (this.page() + 1 >= this.totalPages() || this.loading()) return;
    this.page.update((p) => p + 1);
    this.load();
  }

  beginApprove(subscriptionId: string): void {
    this.pendingApproveId.set(subscriptionId);
    this.approveForm.setValue({
      startDate: this.todayIso(),
      endDate: this.plusDaysIso(30),
    });
    this.actionError.set(null);
  }

  cancelApprove(): void {
    this.pendingApproveId.set(null);
    this.actionError.set(null);
  }

  confirmApprove(): void {
    if (!this.pendingApproveId()) return;
    if (this.approveForm.invalid) {
      this.approveForm.markAllAsTouched();
      return;
    }
    const values = this.approveForm.getRawValue();
    if (values.startDate > values.endDate) {
      this.actionError.set('La fecha de inicio no puede ser posterior a la fecha de vencimiento.');
      return;
    }

    const id = this.pendingApproveId()!;
    this.actionLoading.set(`approve:${id}`);
    this.subscriptionService.approve(id, { startDate: values.startDate, endDate: values.endDate }).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.pendingApproveId.set(null);
        this.load();
      },
      error: (error) => {
        this.actionLoading.set(null);
        this.actionError.set(this.mapError(error));
      },
    });
  }

  reject(subscriptionId: string, reason: string): void {
    this.act(`reject:${subscriptionId}`, () => this.subscriptionService.reject(subscriptionId, { reason }), true);
  }

  requestInfo(subscriptionId: string, reason: string): void {
    this.act(`request:${subscriptionId}`, () => this.subscriptionService.requestInfo(subscriptionId, reason), true);
  }

  suspend(subscriptionId: string, reason: string): void {
    this.act(`suspend:${subscriptionId}`, () => this.subscriptionService.suspend(subscriptionId, { reason }), true);
  }

  reactivate(subscriptionId: string): void {
    this.act(`reactivate:${subscriptionId}`, () => this.subscriptionService.reactivate(subscriptionId), true);
  }

  renewAdmin(subscriptionId: string): void {
    this.act(`renew:${subscriptionId}`, () => this.subscriptionService.renew(subscriptionId), true);
  }

  isBusy(action: string, id: string): boolean {
    return this.actionLoading() === `${action}:${id}`;
  }

  daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const end = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  chipClass(status: SubscriptionStatus): string {
    if (status === 'PENDING_RENEWAL') return 'chip chip--pending-renewal';
    return 'chip';
  }

  formatInstant(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  private act(actionKey: string, request: () => any, reload: boolean): void {
    this.actionLoading.set(actionKey);
    this.actionError.set(null);
    request().subscribe({
      next: () => {
        this.actionLoading.set(null);
        if (reload) this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.actionLoading.set(null);
        this.actionError.set(this.mapError(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.subscriptionService
      .listAdmin({ status: this.activeStatus(), page: this.page(), size: this.size() })
      .subscribe({
        next: (response) => {
          this.items.set(response.content);
          this.page.set(response.page);
          this.size.set(response.size);
          this.totalElements.set(response.totalElements);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(this.mapError(error));
        },
      });
  }

  private mapError(error: HttpErrorResponse): string {
    const body = error.error as { message?: string; detail?: string; title?: string };
    return body?.message ?? body?.detail ?? body?.title ?? 'No pudimos completar la operación.';
  }

  private todayIso(): string {
    return this.toIsoLocal(new Date());
  }

  private plusDaysIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return this.toIsoLocal(d);
  }

  private toIsoLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
