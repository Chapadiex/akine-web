import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="💰"
      title="Caja"
      description="Control de ingresos, pagos, deudas y movimientos diarios del consultorio."
    />
  `,
})
export class Caja {}
