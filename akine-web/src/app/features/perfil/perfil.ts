import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      icon="👤"
      title="Mi Perfil"
      description="Editá tus datos personales, cambiá tu contraseña y configurá notificaciones."
    />
  `,
})
export class Perfil {}
