import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-selector',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login-selector.html',
  styleUrl: './login-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginSelectorPage {}
