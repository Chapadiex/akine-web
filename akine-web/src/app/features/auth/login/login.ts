import {
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ApiError } from '../../../core/auth/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => void this.router.navigate(['/app']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const apiErr = err.error as Partial<ApiError>;
        this.errorMessage.set(
          apiErr?.message ?? this.defaultErrorMessage(err.status),
        );
      },
    });
  }

  private defaultErrorMessage(status: number): string {
    if (status === 401) return 'Email o contraseña incorrectos.';
    if (status === 429) return 'Demasiados intentos. Esperá unos minutos.';
    return 'No pudimos conectar con el servidor. Intentá nuevamente.';
  }
}
