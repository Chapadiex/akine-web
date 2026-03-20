import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacturacionService } from '../../services/facturacion.service';
import { LotePresentacion, EstadoLote } from '../../models/facturacion.models';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-lotes-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTabsModule],
  template: `
    <div class="page-container">
      <header class="page-header compact">
        <div class="header-content">
          <h1>Presentaciones</h1>
          <p class="subtitle">Gestión de lotes enviados a financiadores</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button color="primary">
            <mat-icon>add_box</mat-icon> Generar Lote
          </button>
        </div>
      </header>

      <main class="page-content">
        <mat-tab-group animationDuration="0ms">
          <mat-tab label="Borradores / Cerrados">
            <div class="tab-body">
              @if (lotesBorrador().length === 0) {
                <div class="empty-state">
                  <mat-icon>inventory_2</mat-icon>
                  <h3>No hay lotes en preparación</h3>
                  <p>Genere un nuevo lote para agrupar atenciones.</p>
                </div>
              } @else {
                <table mat-table [dataSource]="lotesBorrador()" class="akine-table">
                  <ng-container matColumnDef="periodo">
                    <th mat-header-cell *matHeaderCellDef> Período </th>
                    <td mat-cell *matCellDef="let element" class="text-bold"> {{element.periodo}} </td>
                  </ng-container>
                  <ng-container matColumnDef="financiador">
                    <th mat-header-cell *matHeaderCellDef> Financiador </th>
                    <td mat-cell *matCellDef="let element"> {{element.financiadorId}} </td>
                  </ng-container>
                  <ng-container matColumnDef="importe">
                    <th mat-header-cell *matHeaderCellDef class="text-right"> Importe Neto </th>
                    <td mat-cell *matCellDef="let element" class="text-right"> $ {{element.importeNetoPresentado | number:'1.2-2'}} </td>
                  </ng-container>
                  <ng-container matColumnDef="estado">
                    <th mat-header-cell *matHeaderCellDef> Estado </th>
                    <td mat-cell *matCellDef="let element"> <span class="badge">{{element.estadoLote}}</span> </td>
                  </ng-container>
                  <ng-container matColumnDef="acciones">
                    <th mat-header-cell *matHeaderCellDef class="text-right"> Acciones </th>
                    <td mat-cell *matCellDef="let element" class="text-right">
                      <button mat-icon-button title="Ver Detalle"><mat-icon>visibility</mat-icon></button>
                      <button mat-icon-button title="Presentar"><mat-icon>send</mat-icon></button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="displayedColumns">
                  <tr mat-row *matRowDef="let row; columns: displayedColumns;">
                </table>
              }
            </div>
          </mat-tab>
          <mat-tab label="Presentados / Liquidados">
            <div class="tab-body">
              <div class="empty-state">
                <mat-icon>fact_check</mat-icon>
                <h3>No hay presentaciones históricas</h3>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </main>
    </div>
  `,
  styles: [`
    .text-bold { font-weight: 600; }
    .text-right { text-align: right; }
    .tab-body { padding-top: 16px; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: #e2e8f0; color: #4a5568; }
  `]
})
export class LotesListComponent implements OnInit {
  private service = inject(FacturacionService);
  lotesBorrador = signal<LotePresentacion[]>([]);
  displayedColumns = ['periodo', 'financiador', 'importe', 'estado', 'acciones'];

  ngOnInit() {
    this.lotesBorrador.set([
      { id: '1', financiadorId: 'OSDE', convenioId: '1', periodo: '2026-03', importeNetoPresentado: 150000, estadoLote: EstadoLote.BORRADOR }
    ]);
  }
}
