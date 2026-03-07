import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder-wrap">
      <div class="placeholder-icon">{{ icon() }}</div>
      <h1 class="placeholder-title">{{ title() }}</h1>
      <p class="placeholder-desc">{{ description() }}</p>
      @if (badge()) {
        <span class="placeholder-badge">{{ badge() }}</span>
      }

      @if (actionLabel() && actionRoute()) {
        <a class="btn btn--secondary btn--sm placeholder-action" [routerLink]="actionRoute()!">
          {{ actionLabel() }}
        </a>
      }
    </div>
  `,
  styles: [`
    .placeholder-action {
      margin-top: .95rem;
    }
  `],
})
export class EmptyState {
  icon = input.required<string>();
  title = input.required<string>();
  description = input.required<string>();
  badge = input<string>('');
  actionLabel = input<string>('');
  actionRoute = input<string | null>(null);
}
