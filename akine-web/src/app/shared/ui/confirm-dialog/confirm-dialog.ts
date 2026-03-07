import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

type ConfirmDialogVariant =
  | 'destructive'
  | 'positive'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'warning'
  | 'danger';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div
        class="dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="$event.stopPropagation()"
      >
        <h3 class="dialog-title">{{ title() }}</h3>
        <p class="dialog-msg">{{ message() }}</p>
        <div class="dialog-actions">
          <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
          <button
            type="button"
            class="btn-confirm"
            [class.btn-confirm--positive]="isPositive()"
            [class.btn-confirm--warning]="isWarning()"
            (click)="confirmed.emit()">
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      width: min(420px, 90vw);
      box-shadow: var(--shadow-lg);
    }
    .dialog-title { font-size: 1.125rem; font-weight: 700; margin-bottom: .5rem; }
    .dialog-msg   { color: var(--text-muted); margin-bottom: 1.5rem; }
    .dialog-actions { display: flex; gap: .75rem; justify-content: flex-end; }
    .btn-cancel {
      padding: .5rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white);
      cursor: pointer; font-size: .9rem;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-confirm {
      padding: .5rem 1rem; border: none;
      border-radius: var(--radius); background: var(--error);
      color: #fff; cursor: pointer; font-size: .9rem; font-weight: 600;
    }
    .btn-confirm.btn-confirm--positive {
      background: var(--primary);
    }
    .btn-confirm.btn-confirm--warning {
      background: var(--warning);
      color: #1f2937;
    }
    .btn-confirm:hover { opacity: .9; }
  `],
})
export class ConfirmDialog {
  title   = input.required<string>();
  message = input.required<string>();
  variant = input<ConfirmDialogVariant>('destructive');
  confirmLabel = input<string>('Confirmar');
  confirmed = output<void>();
  cancelled = output<void>();

  isPositive(): boolean {
    return this.variant() === 'positive' || this.variant() === 'primary';
  }

  isWarning(): boolean {
    return this.variant() === 'warning';
  }
}
