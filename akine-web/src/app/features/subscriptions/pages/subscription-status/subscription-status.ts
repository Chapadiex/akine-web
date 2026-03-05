import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-subscription-status-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subscription-status.html',
  styleUrl: './subscription-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptionService = inject(SubscriptionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly onboardingStep = signal<string | null>(null);
  readonly requestedAt = signal<string | null>(null);
  readonly rejectionReason = signal<string | null>(null);

  constructor() {
    const trackingToken = this.route.snapshot.paramMap.get('trackingToken');
    if (!trackingToken) {
      this.loading.set(false);
      this.error.set('Tracking token inválido.');
      return;
    }
    this.subscriptionService.getByTrackingToken(trackingToken).subscribe({
      next: (response) => {
        this.status.set(response.status);
        this.onboardingStep.set(response.onboardingStep);
        this.requestedAt.set(response.requestedAt);
        this.rejectionReason.set(response.rejectionReason);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No encontramos una suscripción asociada a ese token.');
      },
    });
  }
}
