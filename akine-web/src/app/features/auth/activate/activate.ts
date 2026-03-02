import {
  Component,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ApiError } from '../../../core/auth/models/auth.models';

type PageState = 'activating' | 'success' | 'error' | 'resend' | 'resend-success';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './activate.html',
  styleUrl: './activate.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Activate implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<PageState>('activating');
  readonly errorMessage = signal<string | null>(null);
  readonly loading = signal(false);

  readonly resendForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get resendEmail() { return this.resendForm.controls.email; }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.activateWithToken(token);
    } else {
      // No token in URL → show resend form directly
      this.state.set('resend');
    }
  }

  private activateWithToken(token: string): void {
    this.state.set('activating');
    this.authService.activate(token).subscribe({
      next: () => this.state.set('success'),
      error: (err: HttpErrorResponse) => {
        this.state.set('error');
        const apiErr = err.error as Partial<ApiError>;
        this.errorMessage.set(
          apiErr?.message ?? 'El enlace de activación es inválido o expiró.',
        );
      },
    });
  }

  showResend(): void {
    this.state.set('resend');
  }

  submitResend(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const email = this.resendForm.getRawValue().email!;
    this.authService.resendActivation(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.state.set('resend-success');
      },
      error: () => {
        this.loading.set(false);
        // Always show success to avoid email enumeration
        this.state.set('resend-success');
      },
    });
  }
}
