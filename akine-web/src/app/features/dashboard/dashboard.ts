import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { UserProfile } from '../../core/auth/models/auth.models';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly userProfile = signal<UserProfile | null>(null);
  readonly loadingProfile = signal(true);

  ngOnInit(): void {
    this.authService.getMyProfile().subscribe({
      next: (profile) => {
        this.userProfile.set(profile);
        this.loadingProfile.set(false);
      },
      error: (_err: HttpErrorResponse) => {
        this.loadingProfile.set(false);
      },
    });
  }

}
