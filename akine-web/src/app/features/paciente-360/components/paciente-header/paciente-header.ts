import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Paciente } from '../../../pacientes/models/paciente.models';
import { AuthService } from '../../../../core/auth/services/auth.service';

interface TabDef {
  label: string;
  path: string;
  roles: string[];
}

@Component({
  selector: 'app-paciente-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './paciente-header.html',
  styleUrl: './paciente-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacienteHeader {
  private readonly auth = inject(AuthService);

  paciente = input.required<Paciente>();
  basePath = input.required<string>();

  readonly tabs: TabDef[] = [
    { label: 'Resumen', path: 'resumen', roles: [] },
    { label: 'Historia Clínica', path: 'historia-clinica', roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
    { label: 'Diagnósticos', path: 'diagnosticos', roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
    { label: 'Atenciones', path: 'atenciones', roles: ['ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'] },
    { label: 'Turnos', path: 'turnos', roles: [] },
    { label: 'Obra Social', path: 'obra-social', roles: [] },
    { label: 'Pagos', path: 'pagos', roles: ['ADMIN'] },
  ];

  readonly visibleTabs = computed(() =>
    this.tabs.filter(t => t.roles.length === 0 || t.roles.some(r => (this.auth.userRoles() as string[]).includes(r))),
  );

  readonly edad = computed(() => {
    const fn = this.paciente().fechaNacimiento;
    if (!fn) return null;
    const birth = new Date(fn);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  });

  readonly canWrite = computed(() => this.auth.hasAnyRole('ADMIN', 'PROFESIONAL_ADMIN', 'PROFESIONAL'));
}
