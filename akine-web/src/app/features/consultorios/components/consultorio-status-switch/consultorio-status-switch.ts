import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-consultorio-status-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="status-field" [class.status-field-disabled]="disabled()">
      <span class="status-label">{{ label() }}</span>

      <button
        type="button"
        class="status-toggle"
        role="switch"
        [class.status-toggle-on]="checked()"
        [disabled]="disabled()"
        [attr.aria-checked]="checked()"
        [attr.aria-label]="ariaLabel()"
        (click)="handleToggle()"
      >
        <span class="status-toggle-track">
          <span class="status-toggle-thumb"></span>
        </span>
        <span class="status-toggle-text">{{ checked() ? 'Activo' : 'Inactivo' }}</span>
      </button>
    </div>
  `,
  styles: [`
    .status-field {
      display: grid;
      gap: .3rem;
      min-width: 0;
    }

    .status-label {
      color: var(--text);
      font-size: .74rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .status-toggle {
      display: inline-flex;
      align-items: center;
      gap: .55rem;
      width: fit-content;
      min-height: 2rem;
      padding: .28rem .58rem .28rem .36rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--white);
      color: var(--text);
      font: inherit;
      cursor: pointer;
      transition: border-color .16s ease, background-color .16s ease;
    }

    .status-toggle-track {
      position: relative;
      width: 1.9rem;
      height: 1.06rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--bg);
      flex: 0 0 auto;
      transition: border-color .16s ease, background-color .16s ease;
    }

    .status-toggle-thumb {
      position: absolute;
      top: .1rem;
      left: .1rem;
      width: .66rem;
      height: .66rem;
      border-radius: 999px;
      background: var(--white);
      box-shadow: 0 1px 3px rgb(15 23 42 / .18);
      transition: transform .16s ease, background-color .16s ease;
    }

    .status-toggle-text {
      color: var(--text);
      font-size: .76rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .status-toggle-on {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
    }

    .status-toggle-on .status-toggle-track {
      border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
      background: color-mix(in srgb, var(--primary) 12%, var(--white));
    }

    .status-toggle-on .status-toggle-thumb {
      transform: translateX(.78rem);
      background: var(--primary);
    }

    .status-field-disabled .status-toggle {
      cursor: default;
    }

    .status-toggle:disabled {
      opacity: 1;
    }
  `],
})
export class ConsultorioStatusSwitchComponent {
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly label = input('Estado');
  readonly checkedChange = output<boolean>();

  ariaLabel(): string {
    if (this.disabled()) {
      return `Estado del consultorio: ${this.checked() ? 'Activo' : 'Inactivo'}`;
    }

    return this.checked()
      ? 'Marcar consultorio como inactivo'
      : 'Marcar consultorio como activo';
  }

  handleToggle(): void {
    if (this.disabled()) {
      return;
    }

    this.checkedChange.emit(!this.checked());
  }
}
