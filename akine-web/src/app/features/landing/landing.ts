import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly currentYear = new Date().getFullYear();
  readonly billing = signal<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  readonly prices = computed(() => {
    const annual = this.billing() === 'ANNUAL';
    return {
      starter: annual ? '$29' : '$39',
      pro: annual ? '$69' : '$89',
      multi: annual ? '$149' : '$189',
      note: annual ? 'facturación anual' : 'facturación mensual',
    };
  });

  setBilling(mode: 'MONTHLY' | 'ANNUAL'): void {
    this.billing.set(mode);
    this.track('view_pricing');
  }

  track(eventName: string): void {
    const w = window as unknown as { dataLayer?: unknown[] };
    if (!Array.isArray(w.dataLayer)) w.dataLayer = [];
    w.dataLayer.push({ event: eventName });
  }
}
