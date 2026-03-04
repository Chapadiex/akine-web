import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-colaboradores-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class Colaboradores {
  private readonly router = inject(Router);

  constructor() {
    this.router.navigateByUrl('/app/profesionales');
  }
}
