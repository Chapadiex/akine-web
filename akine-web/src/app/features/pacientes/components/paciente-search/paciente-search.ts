import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-paciente-search',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="search-bar" [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="query" placeholder="Buscar por DNI o apellido/nombre" />
      <button type="submit" [disabled]="form.invalid">Buscar</button>
    </form>
  `,
  styles: [`
    .search-bar { display: flex; gap: .6rem; align-items: center; margin-bottom: 1rem; }
    .search-bar input {
      min-width: 240px; padding: .55rem .75rem; border: 1px solid var(--border);
      border-radius: var(--radius); outline: none;
    }
    .search-bar button {
      padding: .55rem 1rem; border: none; border-radius: var(--radius);
      background: var(--primary); color: #fff; font-weight: 600; cursor: pointer;
    }
    .search-bar button:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class PacienteSearch {
  search = output<string>();
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    query: ['', [Validators.required, Validators.maxLength(100)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.search.emit(this.form.getRawValue().query.trim());
  }
}
