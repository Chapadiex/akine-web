import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyState } from '../empty-state/empty-state';

/**
 * Generic placeholder shown while a feature module is under development.
 * Usage: <app-coming-soon icon="📌" title="Turnos" />
 */
@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-empty-state
      [icon]="icon()"
      [title]="title()"
      [description]="description()"
      badge="Próximamente"
    />
  `,
})
export class ComingSoon {
  icon = input.required<string>();
  title = input.required<string>();
  description = input('Este módulo estará disponible próximamente.');
}
