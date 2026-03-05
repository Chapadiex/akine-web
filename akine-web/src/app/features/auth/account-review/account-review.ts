import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-account-review-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-review.html',
  styleUrl: './account-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReviewPage {}
