import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { PrestacionArancelableService } from '../../../facturacion/services/prestacion-arancelable.service';
import { PrestacionArancelable, UnidadFacturacion } from '../../../facturacion/models/facturacion.models';

type PageState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-prestaciones-arancelables',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prestaciones-arancelables.html',
  styleUrl: './prestaciones-arancelables.scss',
})
export class PrestacionesArancelablesPage implements OnInit {
  private svc = inject(PrestacionArancelableService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  pageState = signal<PageState>('loading');
  prestaciones = signal<PrestacionArancelable[]>([]);
  showForm = signal(false);
  submitting = signal(false);

  readonly unidades: { value: UnidadFacturacion; label: string }[] = [
    { value: 'SESION',   label: 'Sesión' },
    { value: 'PRACTICA', label: 'Práctica' },
    { value: 'MODULO',   label: 'Módulo' },
  ];

  form = new FormGroup({
    codigoInterno:    new FormControl<string>('', Validators.required),
    nombre:           new FormControl<string>('', Validators.required),
    unidadFacturacion:new FormControl<UnidadFacturacion>('SESION', Validators.required),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.pageState.set('loading');
    this.svc.list().subscribe({
      next: (list) => { this.prestaciones.set(list); this.pageState.set('loaded'); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.pageState.set('error'); },
    });
  }

  abrirForm(): void {
    this.form.reset({ unidadFacturacion: 'SESION' });
    this.showForm.set(true);
  }

  cancelar(): void {
    this.showForm.set(false);
  }

  guardar(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const v = this.form.value;
    const payload: PrestacionArancelable = {
      codigoInterno:     v.codigoInterno!,
      nombre:            v.nombre!,
      unidadFacturacion: v.unidadFacturacion!,
      activo:            true,
    };
    this.svc.create(payload).subscribe({
      next: (created) => {
        this.prestaciones.update((list) => [...list, created]);
        this.showForm.set(false);
        this.submitting.set(false);
        this.toast.success('Prestación creada');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  unidadLabel(u: UnidadFacturacion): string {
    return this.unidades.find((x) => x.value === u)?.label ?? u;
  }
}
