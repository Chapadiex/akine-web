import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { ToastType } from './toast.model';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
  warning: '!',
};

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;
  readonly icons = ICONS;

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
