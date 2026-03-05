import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-account-suspended-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-suspended.html',
  styleUrl: './account-suspended.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSuspendedPage {}
