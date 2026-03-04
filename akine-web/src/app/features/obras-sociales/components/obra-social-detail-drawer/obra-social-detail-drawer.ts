import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { ObraSocial } from '../../models/obra-social.models';

@Component({
  selector: 'app-obra-social-detail-drawer',
  standalone: true,
  imports: [MatButtonModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (obraSocial()) {
      <div class="drawer-body">
        <h3>{{ obraSocial()!.acronimo }} - {{ obraSocial()!.nombreCompleto }}</h3>
        <p><b>CUIT:</b> {{ obraSocial()!.cuit }}</p>
        <p><b>Contacto:</b> {{ obraSocial()!.email || obraSocial()!.telefono || '—' }}</p>
        <p><b>Tel alternativo:</b> {{ obraSocial()!.telefonoAlternativo || '—' }}</p>
        <p><b>Representante:</b> {{ obraSocial()!.representante || '—' }}</p>
        <p><b>Dirección:</b> {{ obraSocial()!.direccionLinea || '—' }}</p>
        <p><b>Estado:</b> {{ obraSocial()!.estado === 'ACTIVE' ? 'Activa' : 'Inactiva' }}</p>
        <mat-chip [color]="obraSocial()!.planes.length > 0 ? 'primary' : 'warn'" selected>
          {{ obraSocial()!.planes.length > 0 ? 'Con planes' : 'Sin planes' }}
        </mat-chip>

        <div class="actions">
          <button mat-stroked-button (click)="edit.emit(obraSocial()!)">Editar</button>
          <button mat-flat-button color="primary" (click)="managePlans.emit(obraSocial()!)">Planes</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .drawer-body { padding: 1rem; display: flex; flex-direction: column; gap: .5rem; }
    .actions { display: flex; gap: .75rem; margin-top: 1rem; }
  `],
})
export class ObraSocialDetailDrawer {
  obraSocial = input<ObraSocial | null>(null);
  edit = output<ObraSocial>();
  managePlans = output<ObraSocial>();
}

