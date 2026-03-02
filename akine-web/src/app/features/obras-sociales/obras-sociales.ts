import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-obras-sociales',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="💳"
      title="Obras Sociales"
      description="Prestaciones por cobertura, liquidaciones y reportes para facturación."
    />
  `,
})
export class ObrasSociales {}
