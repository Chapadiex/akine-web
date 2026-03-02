import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="👤"
      title="Colaboradores"
      description="Alta, baja y modificación de profesionales y administrativos del consultorio."
    />
  `,
})
export class Colaboradores {}
