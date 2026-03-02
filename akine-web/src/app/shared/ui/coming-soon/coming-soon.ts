import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Generic placeholder shown while a feature module is under development.
 * Usage: <app-coming-soon icon="📅" title="Turnos" />
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder-wrap">
      <div class="placeholder-icon">{{ icon() }}</div>
      <h1 class="placeholder-title">{{ title() }}</h1>
      <p class="placeholder-desc">{{ description() }}</p>
      <span class="placeholder-badge">Próximamente</span>
    </div>
  `,
})
export class ComingSoon {
  icon = input.required<string>();
  title = input.required<string>();
  description = input('Este módulo estará disponible próximamente.');
}
