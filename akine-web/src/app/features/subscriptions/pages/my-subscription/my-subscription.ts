import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../../services/subscription.service';
import { PlanInfo, SubscriptionStatus, SubscriptionStatusResponse } from '../../models/subscription.models';

@Component({
  selector: 'app-my-subscription-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './my-subscription.html',
  styleUrl: './my-subscription.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySubscriptionPage implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly suscripcion = signal<SubscriptionStatusResponse | null>(null);
  readonly planes = signal<PlanInfo[]>([]);
  readonly changePlanOpen = signal(false);
  readonly actionLoading = signal<string | null>(null);

  readonly changePlanForm = this.fb.group({
    planCode: ['', [Validators.required]],
  });

  readonly daysUntilExpiry = computed(() => {
    const s = this.suscripcion();
    if (!s?.endDate) return null;
    return this.daysUntil(s.endDate);
  });

  ngOnInit(): void {
    this.load();
  }

  renew(): void {
    const id = this.suscripcion()?.id;
    if (!id) return;
    this.actionLoading.set('renew');
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.subscriptionService.renew(id).subscribe({
      next: (res) => {
        this.suscripcion.set(res);
        this.actionLoading.set(null);
        this.actionSuccess.set('Suscripción renovada. Nuevo vencimiento: ' + (res.endDate ?? '-'));
      },
      error: (err: HttpErrorResponse) => {
        this.actionLoading.set(null);
        this.actionError.set(this.mapError(err));
      },
    });
  }

  openChangePlan(): void {
    this.changePlanOpen.set(true);
    this.changePlanForm.reset();
    this.actionError.set(null);
    this.actionSuccess.set(null);
    if (this.planes().length === 0) {
      this.subscriptionService.getPlanes().subscribe({
        next: (ps) => this.planes.set(ps),
        error: () => this.planes.set([]),
      });
    }
  }

  cancelChangePlan(): void {
    this.changePlanOpen.set(false);
    this.actionError.set(null);
  }

  confirmChangePlan(): void {
    if (this.changePlanForm.invalid) {
      this.changePlanForm.markAllAsTouched();
      return;
    }
    const id = this.suscripcion()?.id;
    if (!id) return;
    const { planCode } = this.changePlanForm.getRawValue();
    this.actionLoading.set('changePlan');
    this.actionError.set(null);
    this.subscriptionService.changePlan(id, { planCode }).subscribe({
      next: (res) => {
        this.suscripcion.update((s) => (s ? { ...s, planCode: res.planCode, status: res.status } : s));
        this.actionLoading.set(null);
        this.changePlanOpen.set(false);
        this.actionSuccess.set('Plan actualizado a ' + res.planCode);
      },
      error: (err: HttpErrorResponse) => {
        this.actionLoading.set(null);
        this.actionError.set(this.mapError(err));
      },
    });
  }

  chipClass(status: SubscriptionStatus): string {
    const map: Partial<Record<SubscriptionStatus, string>> = {
      ACTIVE: 'chip chip--active',
      PENDING_RENEWAL: 'chip chip--pending-renewal',
      SUSPENDED: 'chip chip--suspended',
      EXPIRED: 'chip chip--expired',
      REJECTED: 'chip chip--expired',
    };
    return map[status] ?? 'chip';
  }

  bannerClass(): string {
    const days = this.daysUntilExpiry();
    if (days === null) return '';
    if (days < 0) return 'expiry-banner expiry-banner--expired';
    if (days <= 7) return 'expiry-banner expiry-banner--urgent';
    if (days <= 30) return 'expiry-banner expiry-banner--warning';
    return '';
  }

  bannerMessage(): string {
    const days = this.daysUntilExpiry();
    const s = this.suscripcion();
    if (days === null) return '';
    if (days < 0) return 'Tu suscripción ha vencido.';
    if (days === 0) return 'Tu suscripción vence hoy. Renovála para evitar interrupciones.';
    if (days <= 7) return `Tu suscripción vence en ${days} día${days === 1 ? '' : 's'}. Renovála para evitar interrupciones.`;
    return `Tu suscripción vence el ${s?.endDate ?? ''}.`;
  }

  canRenew(): boolean {
    const status = this.suscripcion()?.status;
    return status === 'ACTIVE' || status === 'PENDING_RENEWAL' || status === 'EXPIRED';
  }

  canChangePlan(): boolean {
    const status = this.suscripcion()?.status;
    return status === 'ACTIVE' || status === 'PENDING_RENEWAL';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR').format(price);
  }

  daysUntil(dateStr: string): number {
    const end = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.subscriptionService.getMySuscripcion().subscribe({
      next: (res) => {
        this.suscripcion.set(res);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.suscripcion.set(null);
        } else {
          this.errorMessage.set(this.mapError(err));
        }
        this.loading.set(false);
      },
    });
  }

  private mapError(error: HttpErrorResponse): string {
    const body = error.error as { message?: string; detail?: string; title?: string };
    return body?.message ?? body?.detail ?? body?.title ?? 'No pudimos completar la operación.';
  }
}
