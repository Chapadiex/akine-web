import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-section-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-section-header">
      <div class="page-section-header__copy">
        <div class="page-section-header__inline">
          @switch (titleLevel()) {
            @case ('h2') {
              <h2>{{ title() }}</h2>
            }
            @case ('h3') {
              <h3>{{ title() }}</h3>
            }
            @default {
              <h1>{{ title() }}</h1>
            }
          }
          <p class="page-section-header__description">{{ description() }}</p>
        </div>
      </div>

      <div class="page-section-header__actions">
        <ng-content select="[header-actions]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .page-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .9rem;
      min-width: 0;
    }

    .page-section-header__copy {
      flex: 1 1 auto;
      min-width: 0;
      max-width: min(960px, 100%);
    }

    .page-section-header__inline {
      display: flex;
      align-items: baseline;
      gap: .55rem;
      min-width: 0;
      flex-wrap: nowrap;
    }

    .page-section-header :is(h1, h2, h3) {
      margin: 0;
      font-size: 1.28rem;
      line-height: 1.1;
      color: var(--text);
      white-space: nowrap;
    }

    .page-section-header__description {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.2;
      font-size: .9rem;
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .page-section-header__actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: .5rem;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .page-section-header {
        flex-direction: column;
        align-items: stretch;
      }

      .page-section-header__inline {
        gap: .4rem;
        flex-wrap: wrap;
      }

      .page-section-header :is(h1, h2, h3) {
        white-space: normal;
      }

      .page-section-header__description {
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
      }

      .page-section-header__actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  `],
})
export class PageSectionHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly titleLevel = input<'h1' | 'h2' | 'h3'>('h1');
}
