import {
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ApiError } from '../../../core/auth/models/auth.models';

type UserType = 'patient' | 'professional';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly userType = signal<UserType>('patient');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly registrationSuccess = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(30)]],
    consultorioName: ['', [Validators.maxLength(255)]],
    consultorioAddress: ['', [Validators.maxLength(500)]],
    consultorioPhone: ['', [Validators.maxLength(30)]],
  });

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
  get firstName() { return this.form.controls.firstName; }
  get lastName() { return this.form.controls.lastName; }
  get phone() { return this.form.controls.phone; }
  get consultorioName() { return this.form.controls.consultorioName; }

  selectType(type: UserType): void {
    this.userType.set(type);
    const nameCtrl = this.form.controls.consultorioName;
    if (type === 'professional') {
      nameCtrl.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      nameCtrl.setValidators([Validators.maxLength(255)]);
    }
    nameCtrl.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    const type = this.userType();

    const request$ =
      type === 'patient'
        ? this.authService.registerPatient({
            email: v.email!,
            password: v.password!,
            firstName: v.firstName!,
            lastName: v.lastName!,
            phone: v.phone || undefined,
          })
        : this.authService.registerProfessional({
            email: v.email!,
            password: v.password!,
            firstName: v.firstName!,
            lastName: v.lastName!,
            phone: v.phone || undefined,
            consultorioName: v.consultorioName!,
            consultorioAddress: v.consultorioAddress || undefined,
            consultorioPhone: v.consultorioPhone || undefined,
          });

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.registrationSuccess.set(true);
      },
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
    if (status === 409) return 'Ya existe una cuenta registrada con ese email.';
    if (status === 400) return 'Revisá los datos ingresados.';
    return 'No pudimos completar el registro. Intentá nuevamente.';
  }
}
