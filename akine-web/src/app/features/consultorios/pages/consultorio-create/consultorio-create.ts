import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioRequest } from '../../models/consultorio.models';
import { ConsultorioService } from '../../services/consultorio.service';
import {
  optionalPhoneValidator,
  trimmedRequiredValidator,
} from '../../utils/consultorio-form-rules';

@Component({
  selector: 'app-consultorio-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-shell">
      <header class="page-header">
        <a routerLink="/app/consultorios" class="back-link"><- Volver</a>
        <h1>Nuevo consultorio</h1>
      </header>

      <form class="create-layout" [formGroup]="form" (ngSubmit)="submit()">
        <section class="card">
          <div class="card-head">
            <h2>Datos iniciales</h2>
          </div>

          <div class="grid grid-two">
            <label class="field field-full">
              <span>Nombre del consultorio *</span>
              <input #nameInput type="text" formControlName="name" placeholder="Ej: Consultorio Central" />
              @if (showError('name', 'required')) {
                <small>Ingresa el nombre del consultorio.</small>
              }
            </label>

            <label class="field field-full">
              <span>Dirección completa <em class="optional">(opcional)</em></span>
              <textarea rows="2" formControlName="address"></textarea>
            </label>

            <label class="field">
              <span>Teléfono <em class="optional">(opcional)</em></span>
              <input type="tel" formControlName="phone" placeholder="Ej: 1155550000" />
              @if (showError('phone', 'phone')) {
                <small>Usa una longitud mínima razonable.</small>
              }
            </label>

            <label class="field">
              <span>Email <em class="optional">(opcional)</em></span>
              <input type="email" formControlName="email" placeholder="info@consultorio.com" />
              @if (showError('email', 'email')) {
                <small>Ingresa un email válido.</small>
              }
            </label>
          </div>
        </section>

        <footer class="actions">
          <a routerLink="/app/consultorios" class="btn-ghost">Cancelar</a>
          <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando...' : 'Guardar' }}</button>
        </footer>
      </form>
    </div>
  `,
  styles: [`
    .page-shell { max-width: 880px; margin: 0 auto; padding: 1.25rem; display: grid; gap: .9rem; }
    .page-header { display: grid; gap: .22rem; }
    .page-header h1 { margin: 0; font-size: clamp(1.55rem, 2.7vw, 2rem); line-height: 1.08; color: var(--text); }
    .back-link { color: var(--text-muted); text-decoration: none; font-size: .82rem; font-weight: 600; }
    .create-layout { display: grid; gap: .85rem; }
    .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: .95rem; box-shadow: var(--shadow-sm); }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
    .card-head h2 { margin: 0; font-size: 1rem; color: var(--text); }
    .grid { display: grid; gap: .85rem; }
    .grid-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .field { display: grid; gap: .34rem; }
    .field-full { grid-column: 1 / -1; }
    .field span { font-size: .8rem; font-weight: 700; color: var(--text); }
    .optional { font-weight: 400; color: var(--text-muted); font-size: .75rem; font-style: normal; }
    .field input, .field textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--white);
      padding: .72rem .8rem;
      font: inherit;
      color: var(--text);
    }
    .field input:focus, .field textarea:focus { outline: none; border-color: color-mix(in srgb, var(--primary) 36%, var(--border)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent); }
    .field small { color: var(--error); font-size: .76rem; font-weight: 600; margin: 0; }
    .actions { display: flex; justify-content: flex-end; align-items: center; gap: .55rem; }
    .btn-primary, .btn-secondary, .btn-ghost {
      border-radius: 10px;
      padding: .72rem .92rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      font: inherit;
    }
    .btn-primary { border: 1px solid var(--primary); background: var(--primary); color: #fff; }
    .btn-ghost { border: 1px solid transparent; color: var(--text-muted); background: transparent; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    @media (max-width: 900px) {
      .grid-two { grid-template-columns: 1fr; }
      .actions { flex-direction: column-reverse; align-items: stretch; }
      .btn-primary, .btn-ghost { width: 100%; text-align: center; }
    }
  `],
})
export class ConsultorioCreatePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly consultorioSvc = inject(ConsultorioService);
  private readonly consultorioCtx = inject(ConsultorioContextService);

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [trimmedRequiredValidator]],
    address: [''],
    phone: ['', [optionalPhoneValidator]],
    email: ['', [Validators.email]],
  });

  ngOnInit(): void {
    queueMicrotask(() => this.nameInput?.nativeElement.focus());
  }

  showError(controlName: keyof typeof this.form.controls, error: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError(error);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.buildRequest();
    this.consultorioSvc.create(payload).subscribe({
      next: (saved) => {
        this.consultorioCtx.reloadAndSelect(saved.id);
        this.toast.success('Consultorio creado correctamente.');
        void this.router.navigate(['/app/consultorios', saved.id, 'resumen']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private buildRequest(): ConsultorioRequest {
    const values = this.form.getRawValue();
    return {
      name: values.name.trim(),
      address: values.address.trim() || undefined,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
    };
  }
}
