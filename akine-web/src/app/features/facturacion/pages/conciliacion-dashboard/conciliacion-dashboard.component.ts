import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacturacionService } from '../../services/facturacion.service';
import { ConciliacionAtencion } from '../../models/facturacion.models';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-conciliacion-dashboard',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatInputModule, MatFormFieldModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <header class="page-header compact">
        <div class="header-content">
          <h1>Conciliación de Facturación</h1>
          <p class="subtitle">Tablero de control: Snapshot vs Presentado vs Liquidado vs Cobrado</p>
        </div>
      </header>

      <div class="filters-bar" style="margin-bottom: 16px; display: flex; gap: 16px;">
        <mat-form-field appearance="outline" style="width: 300px;">
          <mat-label>Buscar Paciente</mat-label>
          <input matInput [formControl]="searchControl" placeholder="DNI o Nombre">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <main class="page-content">
        <div class="table-container shadow-sm overflow-auto">
          <table mat-table [dataSource]="datos()" class="akine-table conciliacion-table">
            
            <ng-container matColumnDef="paciente">
              <th mat-header-cell *matHeaderCellDef> Paciente / Financiador </th>
              <td mat-cell *matCellDef="let element"> 
                <div class="text-bold">{{element.pacienteNombre}}</div>
                <div class="text-small text-secondary">{{element.financiadorNombre}} - {{element.prestacionNombre}}</div>
              </td>
            </ng-container>

            <!-- Bloque 1: Clínica -->
            <ng-container matColumnDef="snapshot">
              <th mat-header-cell *matHeaderCellDef class="text-right bg-light"> Snapshot (Clínica) </th>
              <td mat-cell *matCellDef="let element" class="text-right bg-light text-bold"> $ {{element.importeSnapshot | number:'1.2-2'}} </td>
            </ng-container>

            <!-- Bloque 2: Facturación -->
            <ng-container matColumnDef="presentado">
              <th mat-header-cell *matHeaderCellDef class="text-right"> Presentado (Lote) </th>
              <td mat-cell *matCellDef="let element" class="text-right"> $ {{element.importePresentado | number:'1.2-2'}} </td>
            </ng-container>

            <!-- Bloque 3: Financiador -->
            <ng-container matColumnDef="liquidado">
              <th mat-header-cell *matHeaderCellDef class="text-right bg-light"> Liquidado (OS) </th>
              <td mat-cell *matCellDef="let element" class="text-right bg-light" [class.text-danger]="element.diferencia > 0"> 
                $ {{element.importeLiquidado | number:'1.2-2'}} 
              </td>
            </ng-container>

            <!-- Bloque 4: Banco -->
            <ng-container matColumnDef="pagado">
              <th mat-header-cell *matHeaderCellDef class="text-right"> Pagado (Banco) </th>
              <td mat-cell *matCellDef="let element" class="text-right"> $ {{element.importePagado | number:'1.2-2'}} </td>
            </ng-container>

            <!-- Diferencia Final -->
            <ng-container matColumnDef="diferencia">
              <th mat-header-cell *matHeaderCellDef class="text-right highlight-col"> Diferencia </th>
              <td mat-cell *matCellDef="let element" class="text-right highlight-col" [ngClass]="{'text-danger': element.diferencia > 0, 'text-success': element.diferencia === 0}">
                $ {{element.diferencia | number:'1.2-2'}}
              </td>
            </ng-container>

            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef class="text-center"> Estado </th>
              <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="badge" [ngClass]="element.estadoFinal.toLowerCase()">{{element.estadoFinal}}</span> 
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns">
            <tr mat-row *matRowDef="let row; columns: displayedColumns;">
          </table>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .text-bold { font-weight: 600; }
    .text-small { font-size: 0.85rem; }
    .text-secondary { color: var(--text-secondary); }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-danger { color: #e53e3e; font-weight: 600; }
    .text-success { color: #38a169; }
    .bg-light { background-color: #f7fafc; }
    .highlight-col { background-color: #fffaf0; border-left: 1px solid #feebc8; border-right: 1px solid #feebc8; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
    .badge.pendiente { background: #edf2f7; color: #4a5568; }
    .badge.conciliado { background: #c6f6d5; color: #22543d; }
    .badge.debitada { background: #fed7d7; color: #822727; }
  `]
})
export class ConciliacionDashboardComponent implements OnInit {
  private service = inject(FacturacionService);
  searchControl = new FormControl('');
  
  datos = signal<ConciliacionAtencion[]>([]);
  displayedColumns = ['paciente', 'snapshot', 'presentado', 'liquidado', 'pagado', 'diferencia', 'estado'];

  ngOnInit() {
    // Mock load
    this.datos.set([
      { 
        atencionId: '1', pacienteNombre: 'Juan Perez', financiadorNombre: 'OSDE', prestacionNombre: 'Sesión Kinesiología',
        importeSnapshot: 5000, importePresentado: 5000, importeLiquidado: 4500, importePagado: 4500, diferencia: 500, estadoFinal: 'DEBITADA'
      },
      { 
        atencionId: '2', pacienteNombre: 'Maria Gomez', financiadorNombre: 'Swiss Medical', prestacionNombre: 'Módulo RPG',
        importeSnapshot: 12000, importePresentado: 12000, importeLiquidado: 12000, importePagado: 12000, diferencia: 0, estadoFinal: 'CONCILIADO'
      }
    ]);
  }
}
