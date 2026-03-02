import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="📋"
      title="Historia Clínica"
      description="Evoluciones, adjuntos, diagnósticos y acceso al historial completo por paciente."
    />
  `,
})
export class HistoriaClinica {}
