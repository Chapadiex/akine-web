import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="👥"
      title="Pacientes"
      description="Gestión completa del padrón de pacientes con búsqueda, filtros y estado."
    />
  `,
})
export class Pacientes {}
