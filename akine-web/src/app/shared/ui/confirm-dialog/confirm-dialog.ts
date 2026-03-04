import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h3 class="dialog-title">{{ title() }}</h3>
        <p class="dialog-msg">{{ message() }}</p>
        <div class="dialog-actions">
          <button class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
          <button
            class="btn-confirm"
            [class.positive]="variant() === 'positive'"
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
    .btn-confirm.positive {
      background: var(--primary);
    }
    .btn-confirm:hover { opacity: .9; }
  `],
})
export class ConfirmDialog {
  title   = input.required<string>();
  message = input.required<string>();
  variant = input<'destructive' | 'positive'>('destructive');
  confirmLabel = input<string>('Confirmar');
  confirmed = output<void>();
  cancelled = output<void>();
}
