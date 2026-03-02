import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { RoleName } from '../../core/auth/models/auth.models';
import { ErrorMapperService } from '../../core/error/error-mapper.service';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { ConsultorioService } from '../consultorios/services/consultorio.service';
import { NAV_ITEMS, NavItem } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly consultorioService = inject(ConsultorioService);
  private readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly currentUser = this.authService.currentUser;
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly consultorios = this.consultorioCtx.consultorios;
  readonly selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly selectedConsultorio = this.consultorioCtx.selectedConsultorio;

  readonly visibleNav = computed<NavItem[]>(() => {
    const roles = this.authService.userRoles() as string[];
    return NAV_ITEMS.filter(
      (item) =>
        item.roles.length === 0 || item.roles.some((r) => roles.includes(r)),
    );
  });

  readonly userInitials = computed(() => {
    const u = this.currentUser();
    if (!u) return '?';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  });

  readonly primaryRole = computed<string>(() => {
    const roles = this.authService.userRoles();
    return ROLE_LABELS[roles[0] as RoleName] ?? (roles[0] ?? '');
  });

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) return;

    this.consultorioService.list().subscribe({
      next: (items) => this.consultorioCtx.setConsultorios(items),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  toggle(): void {
    this.collapsed.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  onConsultorioChange(id: string): void {
    this.consultorioCtx.setSelectedConsultorioId(id);
  }
}

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Administrador',
  PROFESIONAL_ADMIN: 'Prof. Administrador',
  PROFESIONAL: 'Profesional',
  ADMINISTRATIVO: 'Administrativo',
  PACIENTE: 'Paciente',
};
