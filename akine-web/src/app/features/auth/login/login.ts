import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

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
      next: () => {
        const target = this.authService.hasRole('PACIENTE')
          ? '/app/paciente/alta'
          : '/app';
        void this.router.navigate([target]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.resolveErrorMessage(err));
      },
    });
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    const apiErr = err.error as Partial<ApiError> & {
      detail?: string;
      title?: string;
      type?: string;
    };

    if (
      err.status === 403 &&
      (apiErr?.type === 'urn:akine:error:subscription-not-active' ||
        apiErr?.detail?.toLowerCase().includes('suscripcion'))
    ) {
      return 'La suscripcion del consultorio no esta vigente. Contacta al administrador de plataforma.';
    }

    return (
      apiErr?.message ??
      apiErr?.detail ??
      apiErr?.title ??
      this.defaultErrorMessage(err.status)
    );
  }

  private defaultErrorMessage(status: number): string {
    if (status === 401) return 'Email o contrasena incorrectos.';
    if (status === 429) return 'Demasiados intentos. Espera unos minutos.';
    return 'No pudimos conectar con el servidor. Intenta nuevamente.';
  }
}
