import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { UserContext, UserProfile } from '../../core/auth/models/auth.models';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const nw = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmPassword')?.value as string;
  return nw && confirm && nw !== confirm ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly loading = signal(false);
  readonly profile = signal<UserProfile | null>(null);
  readonly context = signal<UserContext | null>(null);

  readonly profileSuccess = signal<string | null>(null);
  readonly profileError = signal<string | null>(null);
  readonly profileSaving = signal(false);

  readonly passwordSuccess = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSaving = signal(false);

  readonly profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
  });

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    this.load();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const { firstName, lastName, phone } = this.profileForm.getRawValue();
    this.profileSaving.set(true);
    this.profileError.set(null);
    this.profileSuccess.set(null);
    this.authService
      .updateMyProfile({ firstName, lastName, phone: phone || undefined })
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.authService.syncUserFromProfile(updated);
          this.profileSaving.set(false);
          this.profileSuccess.set('Datos actualizados correctamente.');
        },
        error: (err: HttpErrorResponse) => {
          this.profileSaving.set(false);
          this.profileError.set(this.mapError(err));
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordSaving.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);
    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordSuccess.set('Contraseña actualizada correctamente.');
        this.passwordForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.passwordSaving.set(false);
        this.passwordError.set(this.mapError(err));
      },
    });
  }

  fieldError(form: 'profile' | 'password', field: string, error: string): boolean {
    const ctrl =
      form === 'profile' ? this.profileForm.get(field) : this.passwordForm.get(field);
    return !!(ctrl?.touched && ctrl?.hasError(error));
  }

  get passwordMismatch(): boolean {
    return !!(
      this.passwordForm.get('confirmPassword')?.touched &&
      this.passwordForm.hasError('passwordMismatch')
    );
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      profile: this.authService.getMyProfile(),
      context: this.authService.getMyContext(),
    }).subscribe({
      next: ({ profile, context }) => {
        this.profile.set(profile);
        this.profileForm.setValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone ?? '',
        });
        this.context.set(context.tipo !== 'NONE' ? context : null);
        this.loading.set(false);
      },
      error: () => {
        // Fallback: populate form from cached user, context stays null
        const cached = this.authService.currentUser();
        if (cached) {
          this.profileForm.setValue({
            firstName: cached.firstName,
            lastName: cached.lastName,
            phone: '',
          });
        }
        this.loading.set(false);
      },
    });
  }

  private mapError(error: HttpErrorResponse): string {
    const body = error.error as { message?: string; detail?: string; title?: string };
    return body?.message ?? body?.detail ?? body?.title ?? 'No pudimos completar la operación.';
  }
}
