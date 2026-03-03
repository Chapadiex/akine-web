import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AsignacionService } from '../../../consultorios/services/asignacion.service';
import { DuracionService } from '../../../consultorios/services/duracion.service';
import { ProfesionalAsignado, ConsultorioDuracion } from '../../../consultorios/models/agenda.models';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import { PacienteSearchResult } from '../../../pacientes/models/paciente.models';
import { TurnoService } from '../../services/turno.service';
import { Turno, SlotDisponible, TipoConsulta } from '../../models/turno.models';

@Component({
  selector: 'app-turno-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h3 class="dialog-title">Nuevo turno</h3>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label>Profesional (opcional)</label>
            <select formControlName="profesionalId">
              <option value="">Sin profesional (turno del consultorio)</option>
              @for (p of profesionales(); track p.profesionalId) {
                <option [value]="p.profesionalId">{{ p.profesionalNombre }} {{ p.profesionalApellido }}</option>
              }
            </select>
          </div>

          <!-- Busqueda de paciente -->
          <div class="field">
            <label>Paciente</label>
            <div class="search-container">
              <input
                type="text"
                placeholder="Buscar por DNI o nombre..."
                (input)="onPacienteSearch($event)"
                [value]="pacienteDisplay()" />
              @if (pacienteResults().length > 0 && !selectedPaciente()) {
                <div class="search-dropdown">
                  @for (p of pacienteResults(); track p.id) {
                    <div class="search-item" (click)="selectPaciente(p)">
                      <span class="search-dni">{{ p.dni }}</span>
                      <span class="search-name">{{ p.apellido }}, {{ p.nombre }}</span>
                    </div>
                  }
                </div>
              }
              @if (selectedPaciente()) {
                <button type="button" class="btn-clear" (click)="clearPaciente()">&times;</button>
              }
            </div>
          </div>

          <div class="field">
            <label>Fecha y hora</label>
            <input type="datetime-local" formControlName="fechaHoraInicio" />
          </div>

          <div class="field">
            <label>Duraci&oacute;n (minutos)</label>
            <select formControlName="duracionMinutos">
              @for (d of duraciones(); track d.minutos) {
                <option [value]="d.minutos">{{ d.minutos }} min</option>
              }
            </select>
          </div>

          <div class="field">
            <label>Tipo de consulta</label>
            <select formControlName="tipoConsulta">
              <option value="PARTICULAR">Particular</option>
              <option value="OBRA_SOCIAL">Obra Social</option>
            </select>
          </div>

          <div class="field">
            <label>Tel&eacute;fono de contacto</label>
            <input type="text" formControlName="telefonoContacto" placeholder="Opcional" />
          </div>

          <div class="field">
            <label>Motivo de consulta</label>
            <textarea formControlName="motivoConsulta" rows="2" placeholder="Opcional"></textarea>
          </div>

          <div class="field">
            <label>Notas</label>
            <textarea formControlName="notas" rows="2" placeholder="Opcional"></textarea>
          </div>

          @if (slotWarning()) {
            <div class="slot-warning">
              <span>El horario seleccionado no est&aacute; disponible.</span>
              @if (nextSlot()) {
                <button type="button" class="btn-link" (click)="useNextSlot()">
                  Usar pr&oacute;ximo: {{ nextSlot()!.inicio.substring(11, 16) }}
                </button>
              }
            </div>
          }

          @if (errorMsg()) {
            <p class="error-msg">{{ errorMsg() }}</p>
          }

          <div class="dialog-actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-confirm" [disabled]="submitting()">
              {{ submitting() ? 'Guardando...' : 'Crear turno' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      width: min(480px, 90vw);
      box-shadow: var(--shadow-lg);
      max-height: 90vh;
      overflow-y: auto;
    }
    .dialog-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      margin-bottom: 0.75rem;
    }
    label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    select, input, textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.9rem;
      font-family: inherit;
    }
    textarea { resize: vertical; }

    .search-container {
      position: relative;
    }
    .search-container input { width: 100%; box-sizing: border-box; }
    .search-dropdown {
      position: absolute; top: 100%; left: 0; right: 0;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: var(--shadow-lg);
      max-height: 200px; overflow-y: auto; z-index: 10;
    }
    .search-item {
      padding: 0.5rem 0.75rem; cursor: pointer;
      display: flex; gap: 0.5rem; align-items: center;
      font-size: 0.85rem;
    }
    .search-item:hover { background: var(--bg, #f9fafb); }
    .search-dni { font-weight: 600; color: var(--primary); min-width: 80px; }
    .search-name { color: var(--text); }
    .btn-clear {
      position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; font-size: 1.2rem; cursor: pointer;
      color: var(--text-muted);
    }

    .slot-warning {
      background: #fef3c7;
      color: #92400e;
      padding: 0.75rem;
      border-radius: var(--radius);
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .btn-link {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      text-align: left;
      padding: 0;
    }
    .error-msg { color: var(--error); font-size: 0.85rem; margin-bottom: 0.75rem; }
    .dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .btn-cancel {
      padding: 0.5rem 1rem; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--white);
      cursor: pointer; font-size: 0.9rem;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-confirm {
      padding: 0.5rem 1rem; border: none;
      border-radius: var(--radius); background: var(--primary);
      color: #fff; cursor: pointer; font-size: 0.9rem; font-weight: 600;
    }
    .btn-confirm:hover { opacity: 0.9; }
    .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class TurnoDialog implements OnInit {
  private fb = inject(FormBuilder);
  private turnoSvc = inject(TurnoService);
  private asignacionSvc = inject(AsignacionService);
  private duracionSvc = inject(DuracionService);
  private pacienteSvc = inject(PacienteService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);
  private auth = inject(AuthService);

  consultorioId = input.required<string>();
  prefilledStart = input<string>('');
  prefilledProfesionalId = input<string>('');

  saved = output<Turno>();
  cancelled = output<void>();

  profesionales = signal<ProfesionalAsignado[]>([]);
  duraciones = signal<ConsultorioDuracion[]>([]);
  slotWarning = signal(false);
  nextSlot = signal<SlotDisponible | null>(null);
  errorMsg = signal('');
  submitting = signal(false);

  // Patient search
  pacienteResults = signal<PacienteSearchResult[]>([]);
  selectedPaciente = signal<PacienteSearchResult | null>(null);
  pacienteDisplay = signal('');
  private searchSubject = new Subject<string>();

  form = this.fb.nonNullable.group({
    profesionalId: [''],
    fechaHoraInicio: ['', Validators.required],
    duracionMinutos: [30, Validators.required],
    tipoConsulta: ['PARTICULAR' as string],
    telefonoContacto: [''],
    motivoConsulta: [''],
    notas: [''],
  });

  constructor() {
    effect(() => {
      const start = this.prefilledStart();
      if (start) this.form.patchValue({ fechaHoraInicio: start });
    });
    effect(() => {
      const profId = this.prefilledProfesionalId();
      if (profId) this.form.patchValue({ profesionalId: profId });
    });

    // Debounced patient search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((q) => q.length >= 2),
      switchMap((q) => {
        const cid = this.consultorioId();
        const isNumeric = /^\d+$/.test(q);
        return this.pacienteSvc.search(cid, isNumeric ? q : undefined, isNumeric ? undefined : q);
      }),
    ).subscribe({
      next: (results) => this.pacienteResults.set(results),
    });

    this.form.valueChanges.pipe(
      debounceTime(250),
    ).subscribe(() => this.checkDisponibilidad());
  }

  ngOnInit(): void {
    const cid = this.consultorioId();
    this.asignacionSvc.list(cid).subscribe({
      next: (p) => this.profesionales.set(p),
    });
    this.duracionSvc.list(cid).subscribe({
      next: (d) => {
        this.duraciones.set(d);
        if (d.length > 0) this.form.patchValue({ duracionMinutos: d[0].minutos });
      },
    });
  }

  onPacienteSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pacienteDisplay.set(value);
    if (this.selectedPaciente()) {
      this.selectedPaciente.set(null);
    }
    if (value.length < 2) {
      this.pacienteResults.set([]);
      return;
    }
    this.searchSubject.next(value);
  }

  selectPaciente(p: PacienteSearchResult): void {
    this.selectedPaciente.set(p);
    this.pacienteDisplay.set(`${p.dni} - ${p.apellido}, ${p.nombre}`);
    this.pacienteResults.set([]);

    // Pre-fill phone from patient
    if (p.telefono && !this.form.getRawValue().telefonoContacto) {
      this.form.patchValue({ telefonoContacto: p.telefono });
    }
  }

  clearPaciente(): void {
    this.selectedPaciente.set(null);
    this.pacienteDisplay.set('');
    this.pacienteResults.set([]);
  }

  checkDisponibilidad(): void {
    const { profesionalId, fechaHoraInicio, duracionMinutos } = this.form.getRawValue();
    if (!profesionalId || !fechaHoraInicio) {
      this.slotWarning.set(false);
      this.nextSlot.set(null);
      return;
    }

    const date = fechaHoraInicio.substring(0, 10);
    this.turnoSvc.disponibilidad(this.consultorioId(), {
      date,
      profesionalId,
      duracion: duracionMinutos,
    }).subscribe({
      next: (slots) => {
        const selected = this.normalizeDateTime(fechaHoraInicio);
        const isAvailable = slots.some((s) => this.normalizeDateTime(s.inicio) === selected);
        this.slotWarning.set(!isAvailable);
        const next = slots.find((s) => this.normalizeDateTime(s.inicio) >= selected) ?? slots[0] ?? null;
        this.nextSlot.set(next);
        if (isAvailable) this.errorMsg.set('');
      },
      error: () => {
        this.slotWarning.set(false);
        this.nextSlot.set(null);
      },
    });
  }

  useNextSlot(): void {
    const slot = this.nextSlot();
    if (slot) {
      this.form.patchValue({ fechaHoraInicio: slot.inicio });
      this.slotWarning.set(false);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    if (this.slotWarning()) {
      this.errorMsg.set('El horario seleccionado no esta disponible para el profesional.');
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set('');

    const val = this.form.getRawValue();
    const paciente = this.selectedPaciente();
    const profesionalId = val.profesionalId?.trim() ? val.profesionalId : undefined;
    const req = {
      profesionalId,
      fechaHoraInicio: val.fechaHoraInicio,
      duracionMinutos: val.duracionMinutos,
      motivoConsulta: val.motivoConsulta || undefined,
      notas: val.notas || undefined,
      pacienteId: paciente?.id,
      tipoConsulta: (val.tipoConsulta as TipoConsulta) || undefined,
      telefonoContacto: val.telefonoContacto || undefined,
    };

    this.turnoSvc.create(this.consultorioId(), req).subscribe({
      next: (turno) => {
        this.submitting.set(false);
        this.toast.success('Turno creado');
        this.saved.emit(turno);
      },
      error: (err) => {
        // Compatibilidad con backend viejo que todavia exige profesionalId.
        if (!profesionalId && this.isProfesionalRequiredValidation(err)) {
          const ownerProfesionalId = this.auth.currentUser()?.profesionalId;
          if (ownerProfesionalId) {
            this.turnoSvc.create(this.consultorioId(), { ...req, profesionalId: ownerProfesionalId }).subscribe({
              next: (turno) => {
                this.submitting.set(false);
                this.toast.warning('El backend exige profesional. Se guardo con el profesional del consultorio.');
                this.saved.emit(turno);
              },
              error: (retryErr) => {
                this.submitting.set(false);
                this.errorMsg.set(this.errMap.toMessage(retryErr));
              },
            });
            return;
          }
        }

        this.submitting.set(false);
        this.errorMsg.set(this.errMap.toMessage(err));
      },
    });
  }

  private normalizeDateTime(raw: string): string {
    return raw.replace(' ', 'T').substring(0, 16);
  }

  private isProfesionalRequiredValidation(err: unknown): boolean {
    const fields = (err as { error?: { fields?: Record<string, string> } })?.error?.fields;
    const msg = fields?.['profesionalId']?.toLowerCase() ?? '';
    return msg.includes('profesional') && msg.includes('obligatorio');
  }
}
