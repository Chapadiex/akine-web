import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="📊"
      title="Reportes"
      description="Estadísticas de consultas, facturación, obras sociales y ocupación de agenda."
    />
  `,
})
export class Reportes {}
