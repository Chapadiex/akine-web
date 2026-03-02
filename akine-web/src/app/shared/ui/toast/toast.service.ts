import { Injectable, signal } from '@angular/core';
import { Toast, ToastType } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string, duration = 4000): void {
    this.push('success', message, duration);
  }

  error(message: string, duration = 5000): void {
    this.push('error', message, duration);
  }

  info(message: string, duration = 4000): void {
    this.push('info', message, duration);
  }

  warning(message: string, duration = 4500): void {
    this.push('warning', message, duration);
  }

  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(type: ToastType, message: string, duration: number): void {
    const id = crypto.randomUUID();
    this._toasts.update((list) => [...list, { id, type, message, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
