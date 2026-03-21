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
import { ThemeService } from '../../core/theme/theme.service';
import { ConsultorioService } from '../consultorios/services/consultorio.service';
import { NAV_SECTIONS, NavItem, NavSection } from './nav-items';
import { SetupWizardModal } from './setup-wizard/setup-wizard-modal';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, SetupWizardModal],
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
  readonly themeSvc = inject(ThemeService);

  readonly currentUser = this.authService.currentUser;
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly showSetupWizard = signal(false);
  readonly consultorios = this.consultorioCtx.consultorios;
  readonly selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;
  readonly selectedConsultorio = this.consultorioCtx.selectedConsultorio;

  readonly visibleSections = computed<NavSection[]>(() => {
    const roles = this.authService.userRoles() as RoleName[];
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: this.resolveItems(section.items, roles),
    })).filter((section) => section.items.length > 0);
  });

  private resolveItems(items: NavItem[], roles: RoleName[]): NavItem[] {
    const selectedId = this.selectedConsultorioId();
    return items
      .filter((item) => this.hasAccess(item, roles))
      .map((item) => {
        const children = item.children
          ? this.resolveItems(item.children, roles)
          : undefined;

        return {
          ...item,
          path: this.resolvePath(item.path, selectedId),
          ...(children ? { children } : {}),
        };
      })
      .filter((item) => !item.children || item.children.length > 0 || !item.path.includes(':consultorioId'));
  }

  private hasAccess(item: NavItem, roles: RoleName[]): boolean {
    return item.roles.length === 0 || item.roles.some((role) => roles.includes(role));
  }

  private resolvePath(path: string, selectedId: string): string {
    if (!path.includes(':consultorioId')) {
      return path;
    }

    if (!selectedId) {
      return '/app/consultorios';
    }

    return path.replaceAll(':consultorioId', selectedId);
  }

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
      next: (items) => {
        this.consultorioCtx.setConsultorios(items);
        const isSystemAdmin = this.authService.hasRole('ADMIN');
        if (!isSystemAdmin && items.length === 0) {
          this.showSetupWizard.set(true);
        }
      },
      error: (err: unknown) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  onSetupCompleted(consultorioId: string): void {
    this.showSetupWizard.set(false);
    this.consultorioCtx.reloadAndSelect(consultorioId);
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

  iconPaths(icon: string): readonly string[] {
    return ICON_PATHS[icon] ?? ICON_PATHS['circle'];
  }
}

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Administrador',
  PROFESIONAL_ADMIN: 'Prof. Administrador',
  PROFESIONAL: 'Profesional',
  ADMINISTRATIVO: 'Administrativo',
  PACIENTE: 'Paciente',
};

const ICON_PATHS: Record<string, readonly string[]> = {
  home: ['M3 10.5L12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-6h6v6'],
  dashboard: ['M4 4h7v7H4z', 'M13 4h7v5h-7z', 'M13 11h7v9h-7z', 'M4 13h7v7H4z'],
  calendar: ['M7 2v4', 'M17 2v4', 'M3 9h18', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'],
  'calendar-grid': ['M7 2v4', 'M17 2v4', 'M3 9h18', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M8 13h.01', 'M12 13h.01', 'M16 13h.01', 'M8 17h.01', 'M12 17h.01', 'M16 17h.01'],
  'clock-check': ['M12 7v5l3 2', 'M12 3a9 9 0 1 0 9 9', 'M16 17l2 2 4-4'],
  timer: ['M10 2h4', 'M12 8v5l3 2', 'M6.5 4.5 8 6', 'M17.5 4.5 16 6', 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'],
  'calendar-off': ['M3 3l18 18', 'M7 2v4', 'M17 2v4', 'M3 9h13', 'M5 5h9a2 2 0 0 1 2 2v1', 'M19 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2', 'M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M20 21v-2a4 4 0 0 0-3-3.87', 'M16.5 3.13a4 4 0 0 1 0 7.75'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  'user-plus': ['M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M19 8v6', 'M16 11h6'],
  'user-circle': ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M5.2 19.2a8 8 0 1 1 13.6 0', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'],
  stethoscope: ['M6 3v7a6 6 0 0 0 12 0V3', 'M6 11H4', 'M20 11h-2', 'M15 16a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z', 'M12 10v4a6 6 0 0 0 6 6'],
  activity: ['M3 12h4l2-5 4 10 2-5h4'],
  'file-medical': ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M12 11v6', 'M9 14h6'],
  'clipboard-pulse': ['M9 3h6', 'M9 3a2 2 0 0 0-2 2v1H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V5a2 2 0 0 0-2-2Z', 'M7 14h2l2-3 2 6 2-4h2'],
  wallet: ['M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M16 12h5', 'M16 12a2 2 0 1 0 0 4h5v-4Z'],
  receipt: ['M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21Z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  'arrows-left-right': ['M7 7H3m0 0 2.5-2.5M3 7l2.5 2.5', 'M17 17h4m0 0-2.5-2.5M21 17l-2.5 2.5', 'M7 17h10', 'M7 7h10'],
  lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5z', 'M12 15v2'],
  'id-card': ['M4 6h16v12H4z', 'M8 10h.01', 'M11 10h5', 'M8 14h8', 'M8 18h5'],
  team: ['M16 18a4 4 0 0 1 4 4', 'M8 18a4 4 0 0 0-4 4', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M18 10a3 3 0 1 0 0-6', 'M6 10a3 3 0 1 1 0-6'],
  'briefcase-medical': ['M9 6V4h6v2', 'M3 8h18v10H3z', 'M3 12h18', 'M12 10v4', 'M10 12h4'],
  briefcase: ['M9 6V4h6v2', 'M3 8h18v10H3z', 'M3 12h18'],
  mail: ['M4 6h16v12H4z', 'M4 7l8 6 8-6'],
  badge: ['M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z', 'M12 8v5', 'M9.5 10.5h5'],
  shield: ['M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z'],
  'heart-shield': ['M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z', 'M12 15s-2.5-1.6-2.5-3.2a1.5 1.5 0 0 1 2.5-1 1.5 1.5 0 0 1 2.5 1C14.5 13.4 12 15 12 15Z'],
  layers: ['M12 4 4 8l8 4 8-4-8-4Z', 'M4 12l8 4 8-4', 'M4 16l8 4 8-4'],
  handshake: ['M8 12l2.5 2.5a2 2 0 0 0 2.8 0L17 11', 'M3 10l4-4h4l2 2h3l5 5', 'M3 14l4 4', 'M17 11l4 4'],
  building: ['M4 21V5h10v16', 'M14 9h6v12', 'M7 9h.01', 'M7 13h.01', 'M7 17h.01', 'M11 9h.01', 'M11 13h.01', 'M11 17h.01', 'M17 13h.01', 'M17 17h.01'],
  'building-grid': ['M3 21V5h18v16', 'M7 9h.01', 'M12 9h.01', 'M17 9h.01', 'M7 13h.01', 'M12 13h.01', 'M17 13h.01', 'M7 17h.01', 'M12 17h.01', 'M17 17h.01'],
  door: ['M6 21V4h10v17', 'M10 12h.01', 'M16 21h2'],
  clinic: ['M4 21V7l8-4 8 4v14', 'M9 14h6', 'M12 11v6'],
  spark: ['M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z'],
  'clipboard-list': ['M9 3h6', 'M9 3a2 2 0 0 0-2 2v1H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V5a2 2 0 0 0-2-2Z', 'M8 12h.01', 'M11 12h5', 'M8 16h.01', 'M11 16h5'],
  'credit-card': ['M3 6h18v12H3z', 'M3 10h18', 'M7 16h4'],
  'receipt-text': ['M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21Z', 'M9 8h6', 'M9 12h6', 'M9 16h6'],
  'users-gear': ['M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2', 'M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M18.5 10.5l.8-1.4 1.7.6-.2 1.6 1.1 1.1 1.6-.2.6 1.7-1.4.8v1.6l1.4.8-.6 1.7-1.6-.2-1.1 1.1.2 1.6-1.7.6-.8-1.4h-1.6l-.8 1.4-1.7-.6.2-1.6-1.1-1.1-1.6.2-.6-1.7 1.4-.8v-1.6l-1.4-.8.6-1.7 1.6.2 1.1-1.1-.2-1.6 1.7-.6.8 1.4Z', 'M18.5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z'],
  sun: ['M12 4V2', 'M12 22v-2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41', 'M2 12h2', 'M20 12h2', 'M4.93 19.07l1.41-1.41', 'M17.66 6.34l1.41-1.41', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z'],
  hospital: ['M6 21V5h12v16', 'M10 9h4', 'M12 7v4', 'M9 14h.01', 'M15 14h.01', 'M9 18h.01', 'M15 18h.01'],
  circle: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0'],
};
