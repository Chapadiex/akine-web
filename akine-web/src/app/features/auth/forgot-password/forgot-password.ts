import {
  Component,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Forgot Password — Placeholder
 *
 * El flujo de recuperación de contraseña (reset-password via token en email)
 * no está implementado en el backend aún (Módulo 1 no lo incluye).
 * Esta pantalla es un placeholder informativo.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  readonly showContactInfo = signal(true);
}
