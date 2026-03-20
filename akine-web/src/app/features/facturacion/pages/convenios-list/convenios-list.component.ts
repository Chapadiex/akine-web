import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacturacionService } from '../../services/facturacion.service';
import { ConvenioFinanciador } from '../../models/facturacion.models';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-convenios-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <header class="page-header compact">
        <div class="header-content">
          <h1>Convenios de Facturación</h1>
          <p class="subtitle">Administración de acuerdos comerciales y modalidades de pago</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button color="primary">
            <mat-icon>add</mat-icon> Nuevo Convenio
          </button>
        </div>
      </header>

      <main class="page-content">
        @if (convenios().length === 0) {
          <div class="empty-state">
            <mat-icon>handshake</mat-icon>
            <h3>No hay convenios configurados</h3>
            <p>Debe crear un convenio para vincular aranceles.</p>
          </div>
        } @else {
          <div class="table-container shadow-sm">
            <table mat-table [dataSource]="convenios()" class="akine-table">
              
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef> Nombre del Convenio </th>
                <td mat-cell *matCellDef="let element" class="text-bold"> {{element.nombre}} </td>
              </ng-container>

              <ng-container matColumnDef="modalidad">
                <th mat-header-cell *matHeaderCellDef> Modalidad </th>
                <td mat-cell *matCellDef="let element"> {{element.modalidadPago}} </td>
              </ng-container>

              <ng-container matColumnDef="vigencia">
                <th mat-header-cell *matHeaderCellDef> Vigencia </th>
                <td mat-cell *matCellDef="let element"> 
                  {{element.vigenciaDesde | date:'dd/MM/yyyy'}} - 
                  {{element.vigenciaHasta ? (element.vigenciaHasta | date:'dd/MM/yyyy') : 'Actualidad'}}
                </td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef> Estado </th>
                <td mat-cell *matCellDef="let element"> 
                  <span class="badge" [class.active]="element.activo" [class.inactive]="!element.activo">
                    {{element.activo ? 'Vigente' : 'Vencido'}}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef class="text-right"> Acciones </th>
                <td mat-cell *matCellDef="let element" class="text-right">
                  <button mat-icon-button title="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button title="Ver Aranceles">
                    <mat-icon>payments</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns">
              <tr mat-row *matRowDef="let row; columns: displayedColumns;">
            </table>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .text-bold { font-weight: 600; }
    .text-right { text-align: right; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge.active { background: #e6fffa; color: #006d5b; }
    .badge.inactive { background: #fff5f5; color: #c53030; }
  `]
})
export class ConveniosListComponent implements OnInit {
  private service = inject(FacturacionService);
  convenios = signal<ConvenioFinanciador[]>([]);
  displayedColumns = ['nombre', 'modalidad', 'vigencia', 'estado', 'acciones'];

  ngOnInit() {
    // Mock load
    this.service.getConveniosByFinanciador('mock').subscribe({
      next: (data: ConvenioFinanciador[]) => this.convenios.set(data),
      error: () => {} // handle later
    });
  }
}
