import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="📅"
      title="Turnos"
      description="Agenda visual, confirmación automática, recordatorios y manejo de cancelaciones."
    />
  `,
})
export class Turnos {}
