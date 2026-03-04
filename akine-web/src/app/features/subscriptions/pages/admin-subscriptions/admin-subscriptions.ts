import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../../services/subscription.service';
import {
  SubscriptionStatus,
  SubscriptionSummary,
} from '../../models/subscription.models';

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
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'EXPIRED', label: 'Vencidas' },
    { value: 'SUSPENDED', label: 'Suspendidas' },
  ];

  readonly activeStatus = signal<SubscriptionStatus>('PENDING');
  readonly loading = signal(false);
  readonly actionLoading = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly items = signal<SubscriptionSummary[]>([]);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly totalElements = signal(0);

  readonly pendingApproveId = signal<string | null>(null);
  readonly approveForm = this.fb.group({
    startDate: [this.todayIso(), [Validators.required]],
    endDate: [this.plusDaysIso(30), [Validators.required]],
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalElements() / this.size())),
  );

  ngOnInit(): void {
    this.load();
  }

  selectStatus(status: SubscriptionStatus): void {
    if (status === this.activeStatus()) return;
    this.activeStatus.set(status);
    this.page.set(0);
    this.pendingApproveId.set(null);
    this.errorMessage.set(null);
    this.actionError.set(null);
    this.load();
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
    this.actionError.set(null);
    this.subscriptionService
      .approve(id, {
        startDate: values.startDate,
        endDate: values.endDate,
      })
      .subscribe({
        next: () => {
          this.actionLoading.set(null);
          this.pendingApproveId.set(null);
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.actionLoading.set(null);
          this.actionError.set(this.mapError(error));
        },
      });
  }

  reject(subscriptionId: string, reason: string): void {
    this.actionLoading.set(`reject:${subscriptionId}`);
    this.actionError.set(null);
    this.subscriptionService
      .reject(subscriptionId, { reason: this.normalizeReason(reason) })
      .subscribe({
        next: () => {
          this.actionLoading.set(null);
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.actionLoading.set(null);
          this.actionError.set(this.mapError(error));
        },
      });
  }

  suspend(subscriptionId: string, reason: string): void {
    this.actionLoading.set(`suspend:${subscriptionId}`);
    this.actionError.set(null);
    this.subscriptionService
      .suspend(subscriptionId, { reason: this.normalizeReason(reason) })
      .subscribe({
        next: () => {
          this.actionLoading.set(null);
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.actionLoading.set(null);
          this.actionError.set(this.mapError(error));
        },
      });
  }

  reactivate(subscriptionId: string): void {
    this.actionLoading.set(`reactivate:${subscriptionId}`);
    this.actionError.set(null);
    this.subscriptionService.reactivate(subscriptionId).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.actionLoading.set(null);
        this.actionError.set(this.mapError(error));
      },
    });
  }

  isBusy(action: string, id: string): boolean {
    return this.actionLoading() === `${action}:${id}`;
  }

  formatInstant(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    return value;
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.subscriptionService
      .listAdmin({
        status: this.activeStatus(),
        page: this.page(),
        size: this.size(),
      })
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
    return (
      body?.message ??
      body?.detail ??
      body?.title ??
      'No pudimos completar la operacion. Intenta nuevamente.'
    );
  }

  private normalizeReason(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
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
