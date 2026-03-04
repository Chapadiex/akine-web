import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { CreateSubscriptionRequest } from '../../models/subscription.models';

const SUCCESS_MESSAGE =
  'Su solicitud fue enviada correctamente. La suscripci\u00f3n ser\u00e1 habilitada una vez aprobada por el administrador.';

@Component({
  selector: 'app-subscription-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './subscription-signup.html',
  styleUrl: './subscription-signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSignupPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly subscriptionService = inject(SubscriptionService);

  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    owner: this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      documentoFiscal: ['', [Validators.required, Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.maxLength(30)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    }),
    company: this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      cuit: ['', [Validators.required, Validators.maxLength(20)]],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      city: ['', [Validators.required, Validators.maxLength(150)]],
      province: ['', [Validators.required, Validators.maxLength(150)]],
    }),
    baseConsultorio: this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      address: ['', [Validators.required, Validators.maxLength(500)]],
      phone: ['', [Validators.required, Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    }),
  });

  readonly disabled = computed(() => this.loading() || this.successMessage() !== null);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const request = this.form.getRawValue() as CreateSubscriptionRequest;
    this.subscriptionService.create(request).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || SUCCESS_MESSAGE);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.mapError(error));
      },
    });
  }

  control(path: string): AbstractControl | null {
    return this.form.get(path);
  }

  hasError(path: string, errorCode: string): boolean {
    const control = this.control(path);
    return !!control && control.touched && control.hasError(errorCode);
  }

  private mapError(error: HttpErrorResponse): string {
    if (!error.error) {
      return 'No pudimos enviar tu solicitud. Intenta nuevamente.';
    }

    const payload = error.error as {
      message?: string;
      detail?: string;
      title?: string;
      fields?: Record<string, string>;
    };

    if (payload.message) return payload.message;
    if (payload.detail) return payload.detail;
    if (payload.title) return payload.title;

    if (error.status === 409) {
      return 'Ya existe un registro con ese email o CUIT. Verifica los datos.';
    }

    if (error.status === 422) {
      return 'Hay errores de validacion en el formulario.';
    }

    return 'No pudimos enviar tu solicitud. Intenta nuevamente.';
  }
}
