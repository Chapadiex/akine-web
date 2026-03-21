import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CoberturaService } from '../../../cobertura/services/cobertura.service';
import { FinanciadorSalud, PacienteCobertura } from '../../../cobertura/models/cobertura.models';
import { CoberturaFormDialogComponent } from '../../../cobertura/components/cobertura-form-dialog/cobertura-form-dialog.component';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';

@Component({
  selector: 'app-cobertura-paciente-tab',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="tab-content-wrapper">
      <div class="action-bar" style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
        <button mat-flat-button color="primary" (click)="asignarCobertura()">
          <mat-icon>add</mat-icon> Asignar Cobertura
        </button>
      </div>

      @if (coberturas().length === 0) {
        <div class="empty-state">
          <mat-icon>health_and_safety</mat-icon>
          <h3>Sin cobertura registrada</h3>
          <p>Este paciente figura como particular.</p>
        </div>
      } @else {
        <table mat-table [dataSource]="coberturas()" class="akine-table">
          <ng-container matColumnDef="financiador">
            <th mat-header-cell *matHeaderCellDef> Financiador / Plan </th>
            <td mat-cell *matCellDef="let element"> 
              <div class="text-bold">{{ getFinanciadorNombre(element.financiadorId) }}</div>
              <div class="text-small text-secondary">{{ element.planId || 'Plan Base' }}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="afiliado">
            <th mat-header-cell *matHeaderCellDef> N° Afiliado </th>
            <td mat-cell *matCellDef="let element"> {{ element.numeroAfiliado || '-' }} </td>
          </ng-container>

          <ng-container matColumnDef="principal">
            <th mat-header-cell *matHeaderCellDef> Rol </th>
            <td mat-cell *matCellDef="let element"> 
              @if (element.principal) { <span class="badge active">PRINCIPAL</span> }
            </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef class="text-right"> Acciones </th>
            <td mat-cell *matCellDef="let element" class="text-right">
              <button mat-icon-button (click)="editar(element)" title="Editar">
                <mat-icon>edit</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns">
          <tr mat-row *matRowDef="let row; columns: displayedColumns;">
        </table>
      }
    </div>
  `,
  styles: [`
    .text-bold { font-weight: 600; }
    .text-small { font-size: 0.85rem; }
    .text-secondary { color: var(--text-secondary); }
    .text-right { text-align: right; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge.active { background: #e6fffa; color: #006d5b; }
  `]
})
export class CoberturaPacienteTabComponent implements OnInit {
  @Input() pacienteId!: string;
  
  private service = inject(CoberturaService);
  private dialog = inject(MatDialog);
  private consultorioContext = inject(ConsultorioContextService);
  
  coberturas = signal<PacienteCobertura[]>([]);
  financiadores = signal<FinanciadorSalud[]>([]);
  displayedColumns = ['financiador', 'afiliado', 'principal', 'acciones'];

  ngOnInit() {
    this.loadFinanciadores();
    this.loadCoberturas();
  }

  private loadFinanciadores() {
    const consultorioId = this.consultorioContext.selectedConsultorioId();
    if (!consultorioId) return;
    this.service.getFinanciadores(consultorioId).subscribe((data: FinanciadorSalud[]) => this.financiadores.set(data));
  }

  loadCoberturas() {
    if(!this.pacienteId) return;
    this.service.getCoberturasPaciente(this.pacienteId).subscribe((data: PacienteCobertura[]) => this.coberturas.set(data));
  }

  getFinanciadorNombre(financiadorId: string): string {
    const financiador = this.financiadores().find((item) => item.id === financiadorId);
    return financiador?.nombre || financiadorId;
  }

  asignarCobertura() {
    const dialogRef = this.dialog.open(CoberturaFormDialogComponent, {
      width: '450px', disableClose: true,
      data: { cobertura: null, pacienteId: this.pacienteId }
    });
    dialogRef.afterClosed().subscribe((res: PacienteCobertura | undefined) => { if(res) this.loadCoberturas(); });
  }

  editar(cobertura: PacienteCobertura) {
    const dialogRef = this.dialog.open(CoberturaFormDialogComponent, {
      width: '450px', disableClose: true,
      data: { cobertura, pacienteId: this.pacienteId }
    });
    dialogRef.afterClosed().subscribe((res: PacienteCobertura | undefined) => { if(res) this.loadCoberturas(); });
  }
}
