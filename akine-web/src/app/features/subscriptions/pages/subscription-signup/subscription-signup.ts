import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { SubscriptionService } from '../../services/subscription.service';
import { SubscriptionStatusResponse } from '../../models/subscription.models';

type SignupStep = 1 | 2 | 3 | 4 | 5 | 6;

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
  readonly step = signal<SignupStep>(1);
  readonly errorMessage = signal<string | null>(null);
  readonly successState = signal<SubscriptionStatusResponse | null>(null);
  readonly subscriptionId = signal<string | null>(null);
  readonly trackingToken = signal<string | null>(null);

  readonly form = this.fb.group({
    planCode: ['STARTER', [Validators.required]],
    billingCycle: ['TRIAL', [Validators.required]],
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

  readonly disabled = computed(() => this.loading() || this.successState() !== null);
  readonly progress = computed(() => Math.round((this.step() / 6) * 100));

  private track(event: string): void {
    const w = window as unknown as { dataLayer?: unknown[] };
    if (!Array.isArray(w.dataLayer)) w.dataLayer = [];
    w.dataLayer.push({ event });
  }

  nextStep(): void {
    this.errorMessage.set(null);
    const step = this.step();
    if (step < 6) this.step.set((step + 1) as SignupStep);
  }

  prevStep(): void {
    this.errorMessage.set(null);
    const step = this.step();
    if (step > 1) this.step.set((step - 1) as SignupStep);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const planCode = this.form.controls.planCode.value;
    const billingCycle = this.form.controls.billingCycle.value;
    const owner = this.form.controls.owner.getRawValue();
    const company = this.form.controls.company.getRawValue();
    const clinic = this.form.controls.baseConsultorio.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);
    this.track('start_signup');

    this.subscriptionService
      .createDraft({
        planCode,
        billingCycle,
        ownerEmail: owner.email,
        ownerPassword: owner.password,
      })
      .pipe(
        switchMap((draft) => {
          this.subscriptionId.set(draft.subscriptionId);
          this.trackingToken.set(draft.trackingToken);

          return forkJoin([
            this.subscriptionService.updateOwner(draft.subscriptionId, owner),
            this.subscriptionService.updateCompany(draft.subscriptionId, company),
            this.subscriptionService.updateClinic(draft.subscriptionId, clinic),
          ]).pipe(
            switchMap(() =>
              this.subscriptionService.simulatePayment(
                draft.subscriptionId,
                `SIM-${draft.subscriptionId.slice(0, 8).toUpperCase()}`,
              ),
            ),
            switchMap((paymentState) => {
              this.track('payment_simulated');
              return of(paymentState);
            }),
            switchMap(() => this.subscriptionService.submitForApproval(draft.subscriptionId)),
          );
        }),
      )
      .subscribe({
        next: (state) => {
          this.track('submitted_for_approval');
          this.successState.set(state);
          this.step.set(6);
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
    const payload = error.error as { message?: string; detail?: string; title?: string } | null;
    if (payload?.message) return payload.message;
    if (payload?.detail) return payload.detail;
    if (payload?.title) return payload.title;
    if (error.status === 409) return 'Ya existe un registro con ese email o CUIT.';
    return 'No pudimos completar la suscripción. Reintentá en unos minutos.';
  }
}
