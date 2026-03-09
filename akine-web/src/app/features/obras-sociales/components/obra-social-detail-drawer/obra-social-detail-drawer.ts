import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ObraSocial, Plan } from '../../models/obra-social.models';

@Component({
  selector: 'app-obra-social-detail-drawer',
  standalone: true,
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (obraSocial(); as current) {
      <section class="drawer-body">
        <header class="drawer-head">
          <div class="drawer-title">
            <h2>{{ current.nombreCompleto }}</h2>
            <p>{{ current.acronimo }} · CUIT {{ current.cuit }}</p>
          </div>
          <span class="badge" [class.badge--active]="current.estado === 'ACTIVE'">
            {{ current.estado === 'ACTIVE' ? 'Activa' : 'Inactiva' }}
          </span>
        </header>

        <section class="summary-grid">
          <article class="summary-item">
            <span>Planes</span>
            <strong>{{ current.planes.length }}</strong>
          </article>
          <article class="summary-item">
            <span>Contacto principal</span>
            <strong>{{ current.email || current.telefono || 'Pendiente' }}</strong>
          </article>
        </section>

        <section class="info-section">
          <h3>Datos administrativos</h3>
          <dl class="info-grid">
            <div>
              <dt>Email</dt>
              <dd>{{ current.email || '—' }}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{{ current.telefono || '—' }}</dd>
            </div>
            <div>
              <dt>Teléfono alternativo</dt>
              <dd>{{ current.telefonoAlternativo || '—' }}</dd>
            </div>
            <div>
              <dt>Representante</dt>
              <dd>{{ current.representante || '—' }}</dd>
            </div>
            <div class="info-grid__wide">
              <dt>Dirección</dt>
              <dd>{{ current.direccionLinea || '—' }}</dd>
            </div>
          </dl>
        </section>

        <section class="info-section">
          <div class="section-head">
            <h3>Planes y convenios base</h3>
            <span class="section-note">Referencia para cobertura operativa</span>
          </div>

          @if (current.planes.length === 0) {
            <div class="empty-block">
              <strong>Sin planes configurados.</strong>
              <p>La obra social está creada pero todavía no tiene reglas de cobertura ni coseguro cargadas.</p>
            </div>
          } @else {
            <ul class="plan-list">
              @for (plan of current.planes; track plan.id ?? plan.nombreCorto) {
                <li class="plan-card">
                  <div class="plan-head">
                    <div>
                      <strong>{{ plan.nombreCorto }}</strong>
                      <p>{{ plan.nombreCompleto }}</p>
                    </div>
                    <span class="badge" [class.badge--active]="plan.activo" [class.badge--warn]="!plan.activo">
                      {{ plan.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>
                  <dl class="plan-grid">
                    <div>
                      <dt>Cobertura</dt>
                      <dd>{{ formatCoverage(plan) }}</dd>
                    </div>
                    <div>
                      <dt>Coseguro</dt>
                      <dd>{{ formatCopay(plan) }}</dd>
                    </div>
                    <div>
                      <dt>Prestaciones sin autorización</dt>
                      <dd>{{ plan.prestacionesSinAutorizacion }}</dd>
                    </div>
                  </dl>
                  @if (plan.observaciones) {
                    <p class="plan-note">{{ plan.observaciones }}</p>
                  }
                </li>
              }
            </ul>
          }
        </section>

        <footer class="actions">
          <button mat-stroked-button type="button" (click)="edit.emit(current)">Editar</button>
          <button mat-flat-button color="primary" type="button" (click)="managePlans.emit(current)">Gestionar planes</button>
        </footer>
      </section>
    }
  `,
  styles: [`
    .drawer-body {
      padding: 1rem;
      display: grid;
      gap: 1rem;
      color: var(--text);
    }
    .drawer-head,
    .section-head,
    .actions {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: .75rem;
    }
    .drawer-title h2,
    .info-section h3 {
      margin: 0;
      color: var(--text);
    }
    .drawer-title p,
    .section-note,
    .plan-head p,
    .plan-note,
    .empty-block p {
      margin: .2rem 0 0;
      color: var(--text-muted);
    }
    .summary-grid,
    .info-grid,
    .plan-grid {
      display: grid;
      gap: .7rem;
    }
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .summary-item,
    .info-section,
    .plan-card,
    .empty-block {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--white);
    }
    .summary-item {
      padding: .75rem .8rem;
      display: grid;
      gap: .18rem;
    }
    .summary-item span,
    .info-grid dt,
    .plan-grid dt {
      color: var(--text-muted);
      font-size: .72rem;
      text-transform: uppercase;
      letter-spacing: .03em;
      font-weight: 700;
    }
    .summary-item strong,
    .plan-head strong {
      font-size: .92rem;
    }
    .info-section {
      padding: .85rem;
      display: grid;
      gap: .8rem;
    }
    .info-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .info-grid__wide {
      grid-column: 1 / -1;
    }
    .info-grid dd,
    .plan-grid dd {
      margin: .15rem 0 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      padding: .15rem .55rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: .72rem;
      font-weight: 700;
      background: var(--white);
      white-space: nowrap;
    }
    .badge--active {
      color: var(--success);
      border-color: var(--success-border);
      background: var(--success-bg);
    }
    .badge--warn {
      color: color-mix(in srgb, var(--warning) 85%, var(--text));
      border-color: color-mix(in srgb, var(--warning) 24%, var(--border));
      background: color-mix(in srgb, var(--warning) 10%, var(--white));
    }
    .plan-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: .75rem;
    }
    .plan-card {
      padding: .8rem;
      display: grid;
      gap: .7rem;
    }
    .plan-head {
      display: flex;
      justify-content: space-between;
      gap: .75rem;
      align-items: flex-start;
    }
    .plan-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .plan-note {
      font-size: .8rem;
      border-top: 1px solid var(--border);
      padding-top: .65rem;
    }
    .empty-block {
      padding: .85rem;
      display: grid;
      gap: .25rem;
    }
    .actions {
      justify-content: flex-end;
    }
    @media (max-width: 640px) {
      .summary-grid,
      .info-grid,
      .plan-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .plan-head,
      .drawer-head,
      .section-head,
      .actions {
        flex-direction: column;
      }
      .actions button {
        width: 100%;
      }
    }
  `],
})
export class ObraSocialDetailDrawer {
  readonly obraSocial = input<ObraSocial | null>(null);
  readonly edit = output<ObraSocial>();
  readonly managePlans = output<ObraSocial>();

  formatCoverage(plan: Plan): string {
    return this.formatValue(plan.tipoCobertura, plan.valorCobertura);
  }

  formatCopay(plan: Plan): string {
    if (plan.tipoCoseguro === 'SIN_COSEGURO') return 'Sin coseguro';
    return this.formatValue(plan.tipoCoseguro, plan.valorCoseguro);
  }

  private formatValue(type: string, value: number): string {
    if (type === 'PORCENTAJE') return `${value}%`;
    if (type === 'MIXTO') return `${value}% + monto variable`;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
