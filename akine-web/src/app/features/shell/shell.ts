import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { RoleName } from '../../core/auth/models/auth.models';
import { NAV_ITEMS, NavItem } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);

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

  toggle(): void {
    this.collapsed.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Administrador',
  PROFESIONAL_ADMIN: 'Prof. Administrador',
  PROFESIONAL: 'Profesional',
  ADMINISTRATIVO: 'Administrativo',
  PACIENTE: 'Paciente',
};
