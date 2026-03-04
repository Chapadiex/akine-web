import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { Paciente, PacienteRequest, PacienteSearchResult } from '../../../pacientes/models/paciente.models';
import { PacienteForm } from '../../../pacientes/components/paciente-form/paciente-form';
import { TurnoService } from '../../services/turno.service';
import { Turno, SlotDisponible, TipoConsulta } from '../../models/turno.models';

@Component({
  selector: 'app-turno-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, PacienteForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="cancelled.emit()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h3 class="dialog-title">Nuevo turno</h3>

        @if (errorMsg()) {
          <p class="error-msg">{{ errorMsg() }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- 1. Paciente -->
          <div class="field">
            <label>Paciente</label>
            <div class="search-row">
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
              <button type="button" class="btn-add-pac" (click)="showPacienteForm.set(true)" title="Alta r&aacute;pida">+</button>
            </div>
          </div>

          <!-- 2. Tipo de consulta -->
          <div class="field">
            <label>Tipo de consulta</label>
            <div class="radio-row">
              <label class="radio-label">
                <input type="radio" formControlName="tipoConsulta" value="PARTICULAR" />
                Particular
              </label>
              <label class="radio-label">
                <input type="radio" formControlName="tipoConsulta" value="OBRA_SOCIAL" />
                Obra Social
              </label>
            </div>
            @if (obraSocialNombre()) {
              <span class="os-name">{{ obraSocialNombre() }}</span>
            }
          </div>

          <!-- 3. Profesional (opcional) -->
          <div class="field">
            <label>Profesional (opcional)</label>
            <select formControlName="profesionalId">
              <option value="">Sin profesional (turno del consultorio)</option>
              @for (p of profesionales(); track p.profesionalId) {
                <option [value]="p.profesionalId">{{ p.profesionalNombre }} {{ p.profesionalApellido }}</option>
              }
            </select>
          </div>

          <!-- 4. Fecha / Hora / Duracion (fila) -->
          <div class="row-3">
            <div class="field">
              <label>Fecha</label>
              <input type="date" [value]="selectedDate()" [min]="todayStr" (change)="onDateInput($event)" />
            </div>
            <div class="field">
              <label>Hora</label>
              <select [value]="selectedTime()" (change)="onTimeSelect($event)">
                <option value="" disabled>Horario</option>
                @for (h of filteredHorarios(); track h) {
                  <option [value]="h">{{ h }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label>Duraci&oacute;n</label>
              <select formControlName="duracionMinutos">
                @for (d of duraciones(); track d.minutos) {
                  <option [value]="d.minutos">{{ d.minutos }} min</option>
                }
              </select>
            </div>
          </div>

          @if (slotWarning()) {
            <div class="slot-warning">
              <span>Horario no disponible.</span>
              @if (nextSlot()) {
                <button type="button" class="btn-link" (click)="useNextSlot()">
                  Usar {{ nextSlot()!.inicio.substring(11, 16) }}
                </button>
              }
            </div>
          }

          <!-- 5. Telefono -->
          <div class="field">
            <label>Tel&eacute;fono de contacto</label>
            <input type="text" formControlName="telefonoContacto" placeholder="Opcional" />
          </div>

          <!-- 6. Motivo -->
          <div class="field">
            <label>Motivo de consulta</label>
            <textarea formControlName="motivoConsulta" rows="2" placeholder="Opcional"></textarea>
          </div>

          <!-- Acciones (sticky) -->
          <div class="dialog-actions">
            <button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="btn-confirm" [disabled]="submitting()">
              {{ submitting() ? 'Guardando...' : 'Crear turno' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Mini-modal alta rapida paciente -->
    @if (showPacienteForm()) {
      <div class="overlay overlay-top" (click)="showPacienteForm.set(false)">
        <div class="dialog dialog-sm" (click)="$event.stopPropagation()">
          <h3 class="dialog-title">Alta r&aacute;pida de paciente</h3>
          <app-paciente-form
            [initialDni]="pacienteSearchQuery()"
            (saved)="onPacienteCreated($event)"
            (cancelled)="showPacienteForm.set(false)"
          />
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0;
      background: rgb(0 0 0 / 0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .overlay-top { z-index: 1100; }
    .dialog {
      background: var(--white);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      width: min(520px, 92vw);
      box-shadow: var(--shadow-lg);
      max-height: 90vh;
      overflow-y: auto;
    }
    .dialog-sm { width: min(480px, 90vw); }
    .dialog-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; }
    .field {
      display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem;
    }
    label {
      font-size: 0.8rem; font-weight: 600; color: var(--text-muted);
    }
    select, input, textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border); border-radius: var(--radius);
      font-size: 0.9rem; font-family: inherit;
    }
    textarea { resize: vertical; }

    /* Paciente search row */
    .search-row { display: flex; gap: 0.5rem; align-items: stretch; }
    .search-container { position: relative; flex: 1; }
    .search-container input { width: 100%; box-sizing: border-box; }
    .search-dropdown {
      position: absolute; top: 100%; left: 0; right: 0;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: var(--shadow-lg);
      max-height: 200px; overflow-y: auto; z-index: 10;
    }
    .search-item {
      padding: 0.5rem 0.75rem; cursor: pointer;
      display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem;
    }
    .search-item:hover { background: var(--bg, #f9fafb); }
    .search-dni { font-weight: 600; color: var(--primary); min-width: 80px; }
    .search-name { color: var(--text); }
    .btn-clear {
      position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; font-size: 1.2rem; cursor: pointer;
      color: var(--text-muted);
    }
    .btn-add-pac {
      width: 38px; border: 1px solid var(--primary); border-radius: var(--radius);
      background: transparent; color: var(--primary);
      font-size: 1.25rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-add-pac:hover { background: var(--primary); color: #fff; }

    /* Radio buttons */
    .radio-row { display: flex; gap: 1.5rem; padding: 0.25rem 0; }
    .radio-label {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: 0.9rem; color: var(--text); cursor: pointer; font-weight: 400;
    }
    .radio-label input[type="radio"] { accent-color: var(--primary); }
    .os-name {
      font-size: 0.8rem; color: var(--primary); font-weight: 500; margin-top: 0.15rem;
    }

    /* Fecha/Hora/Duracion row */
    .row-3 {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;
    }

    .slot-warning {
      background: #fef3c7; color: #92400e;
      padding: 0.5rem 0.75rem; border-radius: var(--radius);
      font-size: 0.85rem; margin-bottom: 0.75rem;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .btn-link {
      background: none; border: none; color: var(--primary);
      cursor: pointer; font-weight: 600; font-size: 0.85rem; padding: 0;
    }
    .error-msg {
      color: var(--error); font-size: 0.85rem; margin-bottom: 0.75rem;
      background: var(--error-bg, #fef2f2); padding: 0.5rem 0.75rem;
      border-radius: var(--radius);
    }
    .dialog-actions {
      display: flex; gap: 0.75rem; justify-content: flex-end;
      position: sticky; bottom: -1.5rem;
      background: var(--white); padding: 0.75rem 0; margin-top: 0.5rem;
    }
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

  // Date/time controls
  selectedDate = signal('');
  selectedTime = signal('');
  horariosPermitidos = signal<string[]>([]);
  todayStr = this.buildTodayStr();

  // Patient search
  pacienteResults = signal<PacienteSearchResult[]>([]);
  selectedPaciente = signal<PacienteSearchResult | null>(null);
  pacienteDisplay = signal('');
  pacienteSearchQuery = signal('');
  private searchSubject = new Subject<string>();

  // Obra social auto-detection
  obraSocialNombre = signal('');

  // Quick-add patient modal
  showPacienteForm = signal(false);

  // Filtered hours: if today, only show future
  filteredHorarios = computed(() => {
    const horarios = this.horariosPermitidos();
    const date = this.selectedDate();
    if (date !== this.todayStr) return horarios;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return horarios.filter((h) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm > currentMinutes;
    });
  });

  form = this.fb.nonNullable.group({
    profesionalId: [''],
    fechaHoraInicio: ['', Validators.required],
    duracionMinutos: [30, Validators.required],
    tipoConsulta: ['PARTICULAR' as string],
    telefonoContacto: [''],
    motivoConsulta: [''],
  });

  constructor() {
    effect(() => {
      const start = this.prefilledStart();
      if (start) {
        this.selectedDate.set(start.substring(0, 10));
        this.selectedTime.set(start.substring(11, 16));
        this.syncFechaHora();
      }
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
    // Default date to today
    if (!this.selectedDate()) {
      this.selectedDate.set(this.todayStr);
    }

    const cid = this.consultorioId();
    this.asignacionSvc.list(cid).subscribe({
      next: (p) => this.profesionales.set(p),
    });
    this.duracionSvc.list(cid).subscribe({
      next: (d) => {
        this.duraciones.set(d);
        if (d.length > 0) {
          this.form.patchValue({ duracionMinutos: d[0].minutos });
          this.horariosPermitidos.set(this.generateHorarios(d[0].minutos));
        }
      },
    });

    // Regenerate time slots when duration changes
    this.form.controls.duracionMinutos.valueChanges.subscribe((dur) => {
      this.horariosPermitidos.set(this.generateHorarios(dur));
      const currentTime = this.selectedTime();
      if (currentTime && !this.horariosPermitidos().includes(currentTime)) {
        this.selectedTime.set('');
        this.form.patchValue({ fechaHoraInicio: '' });
      }
    });
  }

  // -- Patient search --

  onPacienteSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pacienteDisplay.set(value);
    this.pacienteSearchQuery.set(value);
    if (this.selectedPaciente()) {
      this.selectedPaciente.set(null);
      this.obraSocialNombre.set('');
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

    // Auto-fill phone
    if (p.telefono && !this.form.getRawValue().telefonoContacto) {
      this.form.patchValue({ telefonoContacto: p.telefono });
    }

    // Fetch full patient to get obra social
    this.pacienteSvc.getById(p.id, this.consultorioId()).subscribe({
      next: (full: Paciente) => {
        if (full.obraSocialNombre) {
          this.obraSocialNombre.set(full.obraSocialNombre);
          this.form.patchValue({ tipoConsulta: 'OBRA_SOCIAL' });
        } else {
          this.obraSocialNombre.set('');
          this.form.patchValue({ tipoConsulta: 'PARTICULAR' });
        }
        // Also fill phone if not yet set
        if (full.telefono && !this.form.getRawValue().telefonoContacto) {
          this.form.patchValue({ telefonoContacto: full.telefono });
        }
      },
      error: () => { /* best-effort, don't block */ },
    });
  }

  clearPaciente(): void {
    this.selectedPaciente.set(null);
    this.pacienteDisplay.set('');
    this.pacienteResults.set([]);
    this.obraSocialNombre.set('');
    this.form.patchValue({ tipoConsulta: 'PARTICULAR' });
  }

  // -- Quick-add patient --

  onPacienteCreated(req: PacienteRequest): void {
    this.pacienteSvc.createAdmin(this.consultorioId(), req).subscribe({
      next: (created: Paciente) => {
        this.showPacienteForm.set(false);
        this.toast.success('Paciente creado');
        // Auto-select the new patient
        this.selectedPaciente.set({
          id: created.id,
          dni: created.dni,
          nombre: created.nombre,
          apellido: created.apellido,
          telefono: created.telefono,
          activo: created.activo,
          linkedToConsultorio: true,
        });
        this.pacienteDisplay.set(`${created.dni} - ${created.apellido}, ${created.nombre}`);
        this.pacienteResults.set([]);

        if (created.telefono && !this.form.getRawValue().telefonoContacto) {
          this.form.patchValue({ telefonoContacto: created.telefono });
        }
        if (created.obraSocialNombre) {
          this.obraSocialNombre.set(created.obraSocialNombre);
          this.form.patchValue({ tipoConsulta: 'OBRA_SOCIAL' });
        }
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  // -- Date/time --

  onDateInput(event: Event): void {
    this.selectedDate.set((event.target as HTMLInputElement).value);
    // Reset time if it became invalid (past hours on today)
    const time = this.selectedTime();
    if (time && !this.filteredHorarios().includes(time)) {
      this.selectedTime.set('');
    }
    this.syncFechaHora();
  }

  onTimeSelect(event: Event): void {
    this.selectedTime.set((event.target as HTMLSelectElement).value);
    this.syncFechaHora();
  }

  private syncFechaHora(): void {
    const date = this.selectedDate();
    const time = this.selectedTime();
    if (date && time) {
      this.form.patchValue({ fechaHoraInicio: `${date}T${time}` });
    }
  }

  private generateHorarios(duracionMinutos: number): string[] {
    const horarios: string[] = [];
    const startMinutes = 7 * 60;
    const endMinutes = 22 * 60;
    for (let m = startMinutes; m < endMinutes; m += duracionMinutos) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      horarios.push(`${hh}:${mm}`);
    }
    return horarios;
  }

  // -- Disponibilidad --

  checkDisponibilidad(): void {
    const { fechaHoraInicio, duracionMinutos, profesionalId } = this.form.getRawValue();
    if (!fechaHoraInicio) {
      this.slotWarning.set(false);
      this.nextSlot.set(null);
      return;
    }

    const date = fechaHoraInicio.substring(0, 10);
    this.turnoSvc.disponibilidad(this.consultorioId(), {
      date,
      profesionalId: profesionalId || undefined,
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
      const normalized = this.normalizeDateTime(slot.inicio);
      this.selectedDate.set(normalized.substring(0, 10));
      this.selectedTime.set(normalized.substring(11, 16));
      this.form.patchValue({ fechaHoraInicio: normalized });
      this.slotWarning.set(false);
    }
  }

  // -- Submit --

  onSubmit(): void {
    if (this.form.invalid) return;
    if (this.slotWarning()) {
      this.errorMsg.set('El horario seleccionado no esta disponible.');
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

  // -- Helpers --

  private normalizeDateTime(raw: string): string {
    return raw.replace(' ', 'T').substring(0, 16);
  }

  private isProfesionalRequiredValidation(err: unknown): boolean {
    const fields = (err as { error?: { fields?: Record<string, string> } })?.error?.fields;
    const msg = fields?.['profesionalId']?.toLowerCase() ?? '';
    return msg.includes('profesional') && msg.includes('obligatorio');
  }

  private buildTodayStr(): string {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
}
