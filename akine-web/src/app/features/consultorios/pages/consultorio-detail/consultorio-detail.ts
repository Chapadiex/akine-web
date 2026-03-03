import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioForm } from '../../components/consultorio-form/consultorio-form';
import { Consultorio, ConsultorioRequest } from '../../models/consultorio.models';
import { ConsultorioService } from '../../services/consultorio.service';

@Component({
  selector: 'app-consultorio-detail',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConsultorioForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (loading()) {
        <p class="loading-msg">Cargando...</p>
      } @else if (consultorio()) {
        <div class="header">
          <div class="header-info">
            <a routerLink="/app/consultorios" class="back-link"><- Consultorios</a>
            <h1 class="title">{{ consultorio()!.name }}</h1>
            <div class="meta">
              @if (consultorio()!.address) { <span>{{ consultorio()!.address }}</span> }
              @if (consultorio()!.phone)   { <span>{{ consultorio()!.phone }}</span> }
              @if (consultorio()!.email)   { <span>{{ consultorio()!.email }}</span> }
              <span class="badge" [class.badge-active]="consultorio()!.status === 'ACTIVE'">
                {{ consultorio()!.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
          @if (canWrite()) {
            <button class="btn-edit" (click)="showForm.set(true)">Editar</button>
          }
        </div>

        <nav class="tabs">
          <a [routerLink]="['boxes']" routerLinkActive="tab-active" class="tab">Boxes</a>
          <a [routerLink]="['profesionales']" routerLinkActive="tab-active" class="tab">Profesionales</a>
          <a [routerLink]="['horarios']" routerLinkActive="tab-active" class="tab">Horarios</a>
          <a [routerLink]="['duraciones']" routerLinkActive="tab-active" class="tab">Duraciones</a>
          <a [routerLink]="['asignaciones']" routerLinkActive="tab-active" class="tab">Asignaciones</a>
          <a [routerLink]="['feriados']" routerLinkActive="tab-active" class="tab">Feriados</a>
        </nav>

        <router-outlet />
      }
    </div>

    @if (showForm() && consultorio()) {
      <app-consultorio-form
        [editItem]="consultorio()"
        (saved)="onSaved($event)"
        (cancelled)="showForm.set(false)"
      />
    }
  `,
  styles: [`
    .page { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
    .loading-msg { color: var(--text-muted); text-align: center; margin-top: 3rem; }
    .back-link { color: var(--text-muted); font-size: .85rem; text-decoration: none; display: block; margin-bottom: .5rem; }
    .back-link:hover { color: var(--primary); }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
    .title { font-size: 1.5rem; font-weight: 700; margin-bottom: .5rem; }
    .meta { display: flex; flex-wrap: wrap; gap: .75rem 1.5rem; font-size: .875rem; color: var(--text-muted); align-items: center; }
    .badge { padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
             background: var(--bg); color: var(--text-muted); }
    .badge-active { background: var(--success-bg); color: var(--success); }
    .btn-edit {
      padding: .5rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white); cursor: pointer; font-size: .9rem;
      flex-shrink: 0;
    }
    .btn-edit:hover { background: var(--bg); }
    .tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 1.5rem; flex-wrap: wrap; }
    .tab {
      padding: .6rem 1.25rem; text-decoration: none; color: var(--text-muted);
      font-weight: 600; font-size: .9rem; border-bottom: 2px solid transparent; margin-bottom: -2px;
    }
    .tab:hover { color: var(--text); }
    .tab-active { color: var(--primary); border-bottom-color: var(--primary); }
  `],
})
export class ConsultorioDetailPage implements OnInit {
  private route   = inject(ActivatedRoute);
  private svc     = inject(ConsultorioService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private errMap  = inject(ErrorMapperService);

  consultorio = signal<Consultorio | null>(null);
  loading     = signal(true);
  showForm    = signal(false);

  canWrite = () => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getById(id).subscribe({
      next: (c) => { this.consultorio.set(c); this.loading.set(false); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.loading.set(false); },
    });
  }

  onSaved(req: ConsultorioRequest): void {
    const id = this.consultorio()!.id;
    this.svc.update(id, req).subscribe({
      next: (updated) => {
        this.consultorio.set(updated);
        this.showForm.set(false);
        this.toast.success('Consultorio actualizado');
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }
}
