import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PacienteForm } from '../../../pacientes/components/paciente-form/paciente-form';
import { PacienteRequest, PacienteSearchResult } from '../../../pacientes/models/paciente.models';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import {
  DiagnosticoClinicoResponse,
  HistoriaClinicaActiveCaseSummary,
  HistoriaClinicaAntecedenteItem,
  HistoriaClinicaOverview,
  HistoriaClinicaSesionEstado,
  HistoriaClinicaTimelineEvent,
  HistoriaClinicaTipoAtencion,
  HistoriaClinicaWorkspace,
  SesionClinicaResponse,
} from '../../models/historia-clinica.models';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';

type ViewState = 'idle' | 'loading' | 'success' | 'error';
type TimelineFilter = 'all' | 'sessions' | 'cases' | 'antecedents' | 'attachments';
type SessionListFilter = 'all' | HistoriaClinicaSesionEstado;
type ClinicalTab = 'summary' | 'cases' | 'timeline' | 'background';
type ClinicalScreenState = 'no-patient' | 'no-history' | 'history-no-case' | 'history-active-case';

type RouteState = {
  pacienteId?: string;
  sesionId?: string;
  profesionalId?: string;
  from?: string;
  to?: string;
  estado?: HistoriaClinicaSesionEstado;
  tab?: ClinicalTab;
};

type CasePanelItem = {
  id: string;
  profesionalId: string;
  profesionalNombre: string;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  cantidadSesiones: number;
  ultimaEvolucionResumen?: string | null;
  isActive: boolean;
};

const TIMELINE_BATCH_SIZE = 12;
const SESSION_PAGE_SIZE = 80;

@Component({
  selector: 'app-historia-clinica-paciente-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, PacienteForm, ConfirmDialog],
  templateUrl: './historia-clinica-paciente.html',
  styleUrl: './historia-clinica-paciente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoriaClinicaPacientePage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly historiaSvc = inject(HistoriaClinicaService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly patientSearchControl = new FormControl('', { nonNullable: true });

  readonly workspaceSnapshot = signal<HistoriaClinicaWorkspace | null>(null);
  readonly overview = signal<HistoriaClinicaOverview | null>(null);
  readonly timeline = signal<HistoriaClinicaTimelineEvent[]>([]);
  readonly antecedentes = signal<HistoriaClinicaAntecedenteItem[]>([]);
  readonly diagnosticos = signal<DiagnosticoClinicoResponse[]>([]);
  readonly sesiones = signal<SesionClinicaResponse[]>([]);
  readonly backgroundLatestSesion = signal<SesionClinicaResponse | null>(null);
  readonly patientMatches = signal<PacienteSearchResult[]>([]);
  readonly patientContextPreview = signal('');
  readonly selectedSesion = signal<SesionClinicaResponse | null>(null);
  readonly selectedCaseId = signal<string | null>(null);
  readonly routeState = signal<RouteState>({});
  readonly status = signal<ViewState>('idle');
  readonly error = signal<string | null>(null);
  readonly casesStatus = signal<ViewState>('idle');
  readonly casesError = signal<string | null>(null);
  readonly timelineStatus = signal<ViewState>('idle');
  readonly timelineError = signal<string | null>(null);
  readonly backgroundStatus = signal<ViewState>('idle');
  readonly backgroundError = signal<string | null>(null);
  readonly activeTab = signal<ClinicalTab>('summary');
  readonly timelineFilter = signal<TimelineFilter>('all');
  readonly sessionListFilter = signal<SessionListFilter>('all');
  readonly timelineVisibleCount = signal(TIMELINE_BATCH_SIZE);
  readonly showClosedCases = signal(false);
  readonly showNuevoPaciente = signal(false);
  readonly showLegajoModal = signal(false);
  readonly showSesionDrawer = signal(false);
  readonly showCasoDrawer = signal(false);
  readonly showAntecedentesDrawer = signal(false);
  readonly showClearPatientConfirm = signal(false);
  readonly isSavingLegajo = signal(false);
  readonly isSavingSesion = signal(false);
  readonly isSavingCaso = signal(false);
  readonly isSavingAntecedentes = signal(false);
  readonly isUploadingAdjunto = signal(false);

  readonly createLegajoForm = new FormGroup({
    profesionalId: new FormControl('', { nonNullable: true }),
    fechaAtencion: new FormControl(this.nowForInput(), { nonNullable: true }),
    motivoConsulta: new FormControl('', { nonNullable: true }),
    resumenClinico: new FormControl('', { nonNullable: true }),
    evaluacion: new FormControl('', { nonNullable: true }),
    casoDescripcion: new FormControl('', { nonNullable: true }),
    casoFechaInicio: new FormControl(this.todayForInput(), { nonNullable: true }),
  });
  readonly createLegajoAntecedentes = new FormArray([this.createAntecedenteGroup()]);

  readonly sesionForm = new FormGroup({
    profesionalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    turnoId: new FormControl('', { nonNullable: true }),
    boxId: new FormControl('', { nonNullable: true }),
    fechaAtencion: new FormControl(this.nowForInput(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tipoAtencion: new FormControl<HistoriaClinicaTipoAtencion>('SEGUIMIENTO', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    motivoConsulta: new FormControl('', { nonNullable: true }),
    resumenClinico: new FormControl('', { nonNullable: true }),
    subjetivo: new FormControl('', { nonNullable: true }),
    objetivo: new FormControl('', { nonNullable: true }),
    evaluacion: new FormControl('', { nonNullable: true }),
    plan: new FormControl('', { nonNullable: true }),
  });

  readonly casoForm = new FormGroup({
    profesionalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    codigo: new FormControl('', { nonNullable: true }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fechaInicio: new FormControl(this.todayForInput(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notas: new FormControl('', { nonNullable: true }),
  });

  readonly antecedentesForm = new FormGroup({
    items: new FormArray([this.createAntecedenteGroup()]),
  });

  readonly tabOptions: ReadonlyArray<{ value: ClinicalTab; label: string }> = [
    { value: 'summary', label: 'Resumen' },
    { value: 'cases', label: 'Casos y sesiones' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'background', label: 'Antecedentes y adjuntos' },
  ];

  readonly timelineFilters: ReadonlyArray<{ value: TimelineFilter; label: string }> = [
    { value: 'all', label: 'Todo' },
    { value: 'sessions', label: 'Sesiones' },
    { value: 'cases', label: 'Casos' },
    { value: 'antecedents', label: 'Antecedentes' },
    { value: 'attachments', label: 'Adjuntos' },
  ];

  readonly sessionListFilters: ReadonlyArray<{ value: SessionListFilter; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'CERRADA', label: 'Cerradas' },
    { value: 'ANULADA', label: 'Anuladas' },
  ];

  readonly tipoAtencionOptions: ReadonlyArray<{ value: HistoriaClinicaTipoAtencion; label: string }> = [
    { value: 'EVALUACION', label: 'Evaluacion inicial' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'TRATAMIENTO', label: 'Tratamiento' },
    { value: 'INTERCONSULTA', label: 'Interconsulta' },
    { value: 'OTRO', label: 'Otro' },
  ];

  readonly selectedPatient = computed(() => this.overview()?.paciente ?? null);
  readonly hasPatientContext = computed(() => !!this.routeState().pacienteId);
  readonly hasLegajo = computed(() => !!this.overview()?.legajo.exists);
  readonly hasActiveCases = computed(() => (this.overview()?.casosActivos.length ?? 0) > 0);
  readonly professionalOptions = computed(() => this.workspaceSnapshot()?.profesionales ?? []);
  readonly screenState = computed<ClinicalScreenState>(() => {
    if (!this.hasPatientContext()) return 'no-patient';
    if (!this.hasLegajo()) return 'no-history';
    if (!this.hasActiveCases()) return 'history-no-case';
    return 'history-active-case';
  });
  readonly patientContextTitle = computed(() => {
    const patient = this.selectedPatient();
    if (patient) return `${patient.apellido}, ${patient.nombre}`;
    const preview = this.patientContextPreview().trim();
    return preview || 'Paciente seleccionado';
  });
  readonly patientContextMeta = computed(() => {
    const patient = this.selectedPatient();
    if (!patient) return 'Cargando contexto clinico...';
    return `${patient.dni} / ${this.patientAge()} / ${this.patientCoverage()}`;
  });
  readonly headerStatusBadge = computed(() => {
    switch (this.screenState()) {
      case 'no-history':
        return { label: 'Historia pendiente', tone: 'warning' };
      case 'history-no-case':
        return { label: 'Sin caso activo', tone: 'info' };
      case 'history-active-case':
        return { label: 'Seguimiento activo', tone: 'success' };
      default:
        return null;
    }
  });
  readonly clinicalStatusDescription = computed(() => {
    switch (this.screenState()) {
      case 'no-history':
        return 'Primero hay que crear la historia clinica para dejar base, antecedentes y punto de partida.';
      case 'history-no-case':
        return 'La historia clinica existe, pero hoy no hay un caso abierto. El siguiente paso operativo es abrir uno.';
      case 'history-active-case':
        return 'El paciente ya tiene seguimiento activo. La accion del dia es registrar o continuar la sesion clinica.';
      default:
        return 'Busca un paciente para abrir el contexto clinico.';
    }
  });
  readonly primaryActionLabel = computed(() => {
    switch (this.screenState()) {
      case 'no-history':
        return 'Crear historia clinica';
      case 'history-no-case':
        return 'Nuevo caso clinico';
      case 'history-active-case':
        return 'Nueva sesion';
      default:
        return '';
    }
  });
  readonly compatibilityFilters = computed(() => {
    const state = this.routeState();
    return [
      state.profesionalId ? 'Profesional heredado' : null,
      state.from ? `Desde ${state.from}` : null,
      state.to ? `Hasta ${state.to}` : null,
      state.estado ? `Estado ${state.estado}` : null,
    ].filter((item): item is string => !!item);
  });
  readonly activeCaseCards = computed<CasePanelItem[]>(() =>
    (this.overview()?.casosActivos ?? []).map((caso) => ({
      id: caso.diagnosticoId,
      profesionalId: caso.profesionalId,
      profesionalNombre: caso.profesionalNombre,
      descripcion: caso.descripcion,
      estado: caso.estado,
      fechaInicio: caso.fechaInicio,
      cantidadSesiones: caso.cantidadSesiones,
      ultimaEvolucionResumen: caso.ultimaEvolucionResumen,
      isActive: true,
    })),
  );
  readonly closedCaseCards = computed<CasePanelItem[]>(() =>
    this.diagnosticos()
      .filter((item) => item.estado !== 'ACTIVO')
      .map((item) => ({
        id: item.id,
        profesionalId: item.profesionalId,
        profesionalNombre: this.resolveProfessionalName(item.profesionalId),
        descripcion: item.descripcion,
        estado: item.estado,
        fechaInicio: item.fechaInicio,
        cantidadSesiones: this.countSessionsAfterDate(item.profesionalId, item.fechaInicio),
        ultimaEvolucionResumen: item.notas,
        isActive: false,
      })),
  );
  readonly selectedCase = computed<CasePanelItem | null>(() => {
    const selectedId = this.selectedCaseId();
    if (!selectedId) return this.activeCaseCards()[0] ?? this.closedCaseCards()[0] ?? null;
    return (
      this.activeCaseCards().find((item) => item.id === selectedId) ??
      this.closedCaseCards().find((item) => item.id === selectedId) ??
      null
    );
  });
  readonly filteredTimeline = computed(() =>
    this.timeline()
      .filter((event) => this.matchesTimelineType(event))
      .filter((event) => this.matchesCompatibilityFilters(event)),
  );
  readonly visibleTimeline = computed(() => this.filteredTimeline().slice(0, this.timelineVisibleCount()));
  readonly canLoadMoreTimeline = computed(() => this.visibleTimeline().length < this.filteredTimeline().length);
  readonly relatedSessions = computed(() => {
    const selectedCase = this.selectedCase();
    const filter = this.sessionListFilter();
    const base = this.sesiones()
      .filter((sesion) => {
        if (!selectedCase) return true;
        return (
          sesion.profesionalId === selectedCase.profesionalId &&
          new Date(sesion.fechaAtencion) >= new Date(`${selectedCase.fechaInicio}T00:00:00`)
        );
      })
      .filter((sesion) => (filter === 'all' ? true : sesion.estado === filter))
      .sort((left, right) => new Date(right.fechaAtencion).getTime() - new Date(left.fechaAtencion).getTime());

    return base.length
      ? base
      : this.sesiones().filter((sesion) => (filter === 'all' ? true : sesion.estado === filter));
  });
  readonly recentCriticalAntecedentes = computed(() =>
    this.backgroundStatus() === 'success'
      ? this.antecedentes().filter((item) => item.critical).slice(0, 4)
      : this.overview()?.antecedentesRelevantes.filter((item) => item.critical).slice(0, 4) ?? [],
  );

  constructor() {
    this.seedDefaultProfessionals();

    this.patientSearchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => this.searchPatients(term)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.patientMatches.set(items));

    combineLatest([toObservable(this.consultorioCtx.selectedConsultorioId), this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([consultorioId, queryParams]) => this.hydrateFromRoute(consultorioId, queryParams));
  }

  get antecedentesItems(): FormArray {
    return this.antecedentesForm.controls.items as FormArray;
  }

  selectPatient(match: PacienteSearchResult): void {
    this.patientMatches.set([]);
    this.patientContextPreview.set(`${match.apellido}, ${match.nombre}`);
    this.patientSearchControl.setValue(`${match.apellido}, ${match.nombre}`, { emitEvent: false });
    this.navigateWithState({
      ...this.routeState(),
      pacienteId: match.id,
      sesionId: undefined,
      tab: 'summary',
    });
  }

  clearSelectedPatient(force = false): void {
    if (!force && this.hasPendingDrafts()) {
      this.showClearPatientConfirm.set(true);
      return;
    }
    this.showClearPatientConfirm.set(false);
    this.executeClearSelectedPatient();
  }

  cancelClearSelectedPatient(): void {
    this.showClearPatientConfirm.set(false);
  }

  createPaciente(payload: PacienteRequest): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    if (!consultorioId) {
      return;
    }
    this.pacienteSvc.createAdmin(consultorioId, payload).subscribe({
      next: (paciente) => {
        this.showNuevoPaciente.set(false);
        this.toast.success('Paciente creado.');
        this.selectPatient({
          id: paciente.id,
          dni: paciente.dni,
          nombre: paciente.nombre,
          apellido: paciente.apellido,
          telefono: paciente.telefono,
          email: paciente.email,
          activo: paciente.activo,
          linkedToConsultorio: true,
        });
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  setActiveTab(tab: ClinicalTab, syncRoute = true): void {
    this.activeTab.set(tab);
    if (syncRoute) {
      this.navigateWithState({ ...this.routeState(), tab });
    }
    this.ensureTabData(tab);
  }

  onTimelineFilterChange(filter: TimelineFilter): void {
    this.timelineFilter.set(filter);
    this.timelineVisibleCount.set(TIMELINE_BATCH_SIZE);
  }

  loadMoreTimeline(): void {
    this.timelineVisibleCount.update((count) => count + TIMELINE_BATCH_SIZE);
  }

  selectCase(caseId: string): void {
    this.selectedCaseId.set(caseId);
  }

  toggleClosedCases(): void {
    this.showClosedCases.update((value) => !value);
    this.ensureCasesTabData();
  }

  openLegajoModal(): void {
    this.createLegajoForm.reset(
      {
        profesionalId: this.defaultProfesionalId(),
        fechaAtencion: this.nowForInput(),
        motivoConsulta: '',
        resumenClinico: '',
        evaluacion: '',
        casoDescripcion: '',
        casoFechaInicio: this.todayForInput(),
      },
      { emitEvent: false },
    );
    this.resetAntecedenteArray(this.createLegajoAntecedentes, []);
    this.showLegajoModal.set(true);
  }

  dismissLegajoModal(): void {
    this.showLegajoModal.set(false);
  }

  saveLegajo(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    const raw = this.createLegajoForm.getRawValue();
    this.isSavingLegajo.set(true);
    this.historiaSvc
      .createLegajo(consultorioId, pacienteId, {
        profesionalId: this.emptyToUndefined(raw.profesionalId) ?? null,
        fechaAtencion: this.emptyToUndefined(raw.fechaAtencion) ?? null,
        motivoConsulta: this.emptyToUndefined(raw.motivoConsulta) ?? null,
        resumenClinico: this.emptyToUndefined(raw.resumenClinico) ?? null,
        evaluacion: this.emptyToUndefined(raw.evaluacion) ?? null,
        casoDescripcion: this.emptyToUndefined(raw.casoDescripcion) ?? null,
        casoFechaInicio: this.emptyToUndefined(raw.casoFechaInicio) ?? null,
        antecedentes: this.buildAntecedentesPayload(this.createLegajoAntecedentes),
      })
      .subscribe({
        next: () => {
          this.isSavingLegajo.set(false);
          this.dismissLegajoModal();
          this.toast.success('Historia clinica creada.');
          this.reloadSelectedPatient();
        },
        error: (err) => {
          this.isSavingLegajo.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  openNuevaSesion(defaultProfesionalId?: string): void {
    if (!this.hasLegajo()) {
      return;
    }
    this.selectedSesion.set(null);
    this.sesionForm.reset(
      {
        profesionalId: defaultProfesionalId ?? this.defaultProfesionalId(),
        turnoId: '',
        boxId: '',
        fechaAtencion: this.nowForInput(),
        tipoAtencion: 'SEGUIMIENTO',
        motivoConsulta: '',
        resumenClinico: '',
        subjetivo: '',
        objetivo: '',
        evaluacion: '',
        plan: '',
      },
      { emitEvent: false },
    );
    this.sesionForm.enable({ emitEvent: false });
    this.showSesionDrawer.set(true);
    this.navigateWithState({ ...this.routeState(), sesionId: undefined });
  }

  openSesion(sesionId: string, updateQuery = true): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    this.historiaSvc.getSesion(consultorioId, pacienteId, sesionId).subscribe({
      next: (sesion) => {
        this.selectedSesion.set(sesion);
        this.patchSesionForm(sesion);
        if (sesion.estado === 'BORRADOR') {
          this.sesionForm.enable({ emitEvent: false });
        } else {
          this.sesionForm.disable({ emitEvent: false });
        }
        this.showSesionDrawer.set(true);
        if (this.backgroundLatestSesion()?.id === sesion.id) {
          this.backgroundLatestSesion.set(sesion);
        }
        if (updateQuery) {
          this.navigateWithState({ ...this.routeState(), sesionId });
        }
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  dismissSesionDrawer(): void {
    this.showSesionDrawer.set(false);
    this.selectedSesion.set(null);
    this.navigateWithState({ ...this.routeState(), sesionId: undefined });
  }

  saveSesion(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (this.sesionForm.invalid) {
      this.sesionForm.markAllAsTouched();
      return;
    }
    const request = this.buildSesionRequest();
    if (!request) {
      return;
    }
    const currentSesion = this.selectedSesion();
    const operation = currentSesion
      ? this.historiaSvc.updateSesion(consultorioId, pacienteId, currentSesion.id, request)
      : this.historiaSvc.createSesion(consultorioId, pacienteId, request);
    this.isSavingSesion.set(true);
    operation.subscribe({
      next: (sesion) => {
        this.isSavingSesion.set(false);
        this.toast.success(currentSesion ? 'Sesion actualizada.' : 'Sesion creada.');
        this.openSesion(sesion.id);
        this.reloadSelectedPatient(sesion.id);
      },
      error: (err) => {
        this.isSavingSesion.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  closeSesion(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const sesionId = this.selectedSesion()?.id;
    if (!consultorioId || !pacienteId || !sesionId) {
      return;
    }
    this.isSavingSesion.set(true);
    this.historiaSvc.closeSesion(consultorioId, pacienteId, sesionId).subscribe({
      next: () => {
        this.isSavingSesion.set(false);
        this.toast.info('Sesion cerrada.');
        this.reloadSelectedPatient(sesionId);
      },
      error: (err) => {
        this.isSavingSesion.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  annulSesion(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const sesionId = this.selectedSesion()?.id;
    if (!consultorioId || !pacienteId || !sesionId || !window.confirm('Esta accion anulara la sesion actual.')) {
      return;
    }
    this.isSavingSesion.set(true);
    this.historiaSvc.annulSesion(consultorioId, pacienteId, sesionId).subscribe({
      next: () => {
        this.isSavingSesion.set(false);
        this.toast.info('Sesion anulada.');
        this.reloadSelectedPatient(sesionId);
      },
      error: (err) => {
        this.isSavingSesion.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  openCasoDrawer(defaultProfesionalId?: string): void {
    this.casoForm.reset(
      {
        profesionalId: defaultProfesionalId ?? this.defaultProfesionalId(),
        codigo: '',
        descripcion: '',
        fechaInicio: this.todayForInput(),
        notas: '',
      },
      { emitEvent: false },
    );
    this.showCasoDrawer.set(true);
  }

  saveCaso(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (this.casoForm.invalid) {
      this.casoForm.markAllAsTouched();
      return;
    }
    const raw = this.casoForm.getRawValue();
    this.isSavingCaso.set(true);
    this.historiaSvc
      .createDiagnostico(consultorioId, pacienteId, {
        profesionalId: raw.profesionalId,
        sesionId: this.selectedSesion()?.id ?? null,
        codigo: this.emptyToUndefined(raw.codigo) ?? null,
        descripcion: raw.descripcion.trim(),
        fechaInicio: raw.fechaInicio,
        notas: this.emptyToUndefined(raw.notas) ?? null,
      })
      .subscribe({
        next: () => {
          this.isSavingCaso.set(false);
          this.showCasoDrawer.set(false);
          this.toast.success('Caso clinico creado.');
          this.reloadSelectedPatient();
        },
        error: (err) => {
          this.isSavingCaso.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  closeCaso(caso: HistoriaClinicaActiveCaseSummary | CasePanelItem): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const diagnosticoId = 'diagnosticoId' in caso ? caso.diagnosticoId : caso.id;
    if (!consultorioId || !pacienteId || !window.confirm('Se marcara el caso como resuelto.')) {
      return;
    }
    this.historiaSvc
      .resolveDiagnostico(consultorioId, pacienteId, diagnosticoId, { fechaFin: this.todayForInput() })
      .subscribe({
        next: () => {
          this.toast.info('Caso clinico cerrado.');
          this.reloadSelectedPatient();
        },
        error: (err) => this.toast.error(this.errMap.toMessage(err)),
      });
  }

  openAntecedentesDrawer(): void {
    this.ensureBackgroundData();
    this.resetAntecedenteArray(this.antecedentesItems, this.antecedentes());
    this.showAntecedentesDrawer.set(true);
  }

  saveAntecedentes(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    this.isSavingAntecedentes.set(true);
    this.historiaSvc
      .updateAntecedentes(consultorioId, pacienteId, this.buildAntecedentesPayload(this.antecedentesItems))
      .subscribe({
        next: () => {
          this.isSavingAntecedentes.set(false);
          this.showAntecedentesDrawer.set(false);
          this.toast.success('Antecedentes actualizados.');
          this.reloadSelectedPatient();
        },
        error: (err) => {
          this.isSavingAntecedentes.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  addAntecedente(target: 'create' | 'edit'): void {
    (target === 'create' ? this.createLegajoAntecedentes : this.antecedentesItems).push(
      this.createAntecedenteGroup(),
    );
  }

  removeAntecedente(target: 'create' | 'edit', index: number): void {
    const array = target === 'create' ? this.createLegajoAntecedentes : this.antecedentesItems;
    if (array.length <= 1) {
      array.at(0)?.reset({ label: '', valueText: '', critical: false, notes: '' });
      return;
    }
    array.removeAt(index);
  }

  uploadAdjunto(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const sesionId = this.selectedSesion()?.id;
    if (!file || !consultorioId || !pacienteId || !sesionId) {
      return;
    }
    this.isUploadingAdjunto.set(true);
    this.historiaSvc.uploadAdjunto(consultorioId, pacienteId, sesionId, file).subscribe({
      next: () => {
        this.isUploadingAdjunto.set(false);
        if (input) {
          input.value = '';
        }
        this.toast.success('Adjunto cargado.');
        this.openSesion(sesionId, false);
        this.reloadSelectedPatient(sesionId);
      },
      error: (err) => {
        this.isUploadingAdjunto.set(false);
        if (input) {
          input.value = '';
        }
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  downloadAdjunto(adjuntoId: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    this.historiaSvc.downloadAdjunto(consultorioId, pacienteId, adjuntoId).subscribe({
      next: ({ filename, blob }) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  deleteAdjunto(adjuntoId: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const sesionId = this.selectedSesion()?.id;
    if (!consultorioId || !pacienteId || !sesionId || !window.confirm('Se eliminara el adjunto seleccionado.')) {
      return;
    }
    this.historiaSvc.deleteAdjunto(consultorioId, pacienteId, adjuntoId).subscribe({
      next: () => {
        this.toast.success('Adjunto eliminado.');
        this.openSesion(sesionId, false);
        this.reloadSelectedPatient(sesionId);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  openTimelineItem(event: HistoriaClinicaTimelineEvent): void {
    if (event.type === 'SESION' && event.relatedEntityId) {
      this.openSesion(event.relatedEntityId);
      return;
    }
    this.toast.info(event.summary);
  }

  patientCoverage(): string {
    const patient = this.selectedPatient();
    if (!patient) {
      return '';
    }
    const base = patient.obraSocialNombre || 'Sin cobertura declarada';
    return patient.obraSocialPlan ? `${base} / ${patient.obraSocialPlan}` : base;
  }

  patientAge(): string {
    const birthDate = this.selectedPatient()?.fechaNacimiento;
    if (!birthDate) {
      return 'Edad no declarada';
    }
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDelta = today.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return `${age} anos`;
  }

  timelineTypeLabel(event: HistoriaClinicaTimelineEvent): string {
    switch (event.type) {
      case 'HC_CREATED':
        return 'Historia creada';
      case 'ANTECEDENTE_UPDATED':
        return 'Antecedente';
      case 'CASO_OPENED':
        return 'Caso abierto';
      case 'CASO_CLOSED':
        return 'Caso cerrado';
      case 'ADJUNTO':
        return 'Adjunto';
      default:
        return 'Sesion';
    }
  }

  timelineTone(event: HistoriaClinicaTimelineEvent): string {
    switch (event.type) {
      case 'CASO_OPENED':
        return 'success';
      case 'CASO_CLOSED':
        return 'muted';
      case 'ANTECEDENTE_UPDATED':
        return 'warning';
      case 'ADJUNTO':
        return 'info';
      case 'HC_CREATED':
        return 'brand';
      default:
        return 'default';
    }
  }

  humanFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  patient360QueryParams(): Record<string, string> {
    const state = this.routeState();
    return {
      ...(state.profesionalId ? { profesionalId: state.profesionalId } : {}),
      ...(state.from ? { from: state.from } : {}),
      ...(state.to ? { to: state.to } : {}),
    };
  }

  trackByTab(_: number, item: { value: ClinicalTab }): string {
    return item.value;
  }

  private hydrateFromRoute(consultorioId: string, queryParams: ParamMap): void {
    const nextState: RouteState = {
      pacienteId: this.readQueryParam(queryParams, 'pacienteId'),
      sesionId: this.readQueryParam(queryParams, 'sesionId'),
      profesionalId: this.readQueryParam(queryParams, 'profesionalId'),
      from: this.readQueryParam(queryParams, 'from'),
      to: this.readQueryParam(queryParams, 'to'),
      estado: this.readEstado(queryParams.get('estado')),
      tab: this.readTab(queryParams.get('tab')),
    };
    this.routeState.set(nextState);
    this.activeTab.set(nextState.tab ?? 'summary');
    if (consultorioId) {
      this.patientSearchControl.enable({ emitEvent: false });
    } else {
      this.patientSearchControl.disable({ emitEvent: false });
    }
    if (!consultorioId) {
      this.resetState();
      return;
    }
    this.loadWorkspaceSnapshot(consultorioId, nextState);
    if (!nextState.pacienteId) {
      this.resetCanvas();
      return;
    }
    this.loadPatientCanvas(consultorioId, nextState.pacienteId, nextState.sesionId);
  }

  private loadWorkspaceSnapshot(consultorioId: string, state: RouteState): void {
    this.historiaSvc
      .getWorkspace(consultorioId, {
        pacienteId: state.pacienteId,
        profesionalId: state.profesionalId,
        from: state.from,
        to: state.to,
        estado: state.estado,
        page: 0,
        size: 1,
      })
      .subscribe({
        next: (workspace) => this.workspaceSnapshot.set(workspace),
        error: () => this.workspaceSnapshot.set(null),
      });
  }

  private loadPatientCanvas(consultorioId: string, pacienteId: string, sesionId?: string): void {
    this.status.set('loading');
    this.error.set(null);
    this.resetLazyData();
    this.historiaSvc.getOverview(consultorioId, pacienteId).subscribe({
      next: (overview) => {
        this.status.set('success');
        this.overview.set(overview);
        this.patientContextPreview.set(`${overview.paciente.apellido}, ${overview.paciente.nombre}`);
        this.patientSearchControl.setValue(`${overview.paciente.apellido}, ${overview.paciente.nombre}`, {
          emitEvent: false,
        });
        this.selectedCaseId.set(overview.casosActivos[0]?.diagnosticoId ?? null);
        if (sesionId) {
          this.openSesion(sesionId, false);
        }
        this.ensureTabData(this.activeTab());
      },
      error: (err) => {
        this.status.set('error');
        this.error.set(this.errMap.toMessage(err));
      },
    });
  }

  private reloadSelectedPatient(sesionId?: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    this.loadWorkspaceSnapshot(consultorioId, this.routeState());
    this.loadPatientCanvas(consultorioId, pacienteId, sesionId ?? this.routeState().sesionId);
  }

  private ensureTabData(tab: ClinicalTab): void {
    if (!this.hasPatientContext() || !this.hasLegajo()) {
      return;
    }
    switch (tab) {
      case 'cases':
        this.ensureCasesTabData();
        break;
      case 'timeline':
        this.ensureTimelineData();
        break;
      case 'background':
        this.ensureBackgroundData();
        break;
      default:
        break;
    }
  }

  private ensureCasesTabData(force = false): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (!force && (this.casesStatus() === 'loading' || this.casesStatus() === 'success')) {
      return;
    }
    this.casesStatus.set('loading');
    this.casesError.set(null);
    forkJoin({
      diagnosticos: this.historiaSvc.listDiagnosticos(consultorioId, pacienteId),
      sesiones: this.historiaSvc.listSesiones(consultorioId, pacienteId, {
        profesionalId: this.routeState().profesionalId,
        from: this.routeState().from,
        to: this.routeState().to,
        estado: this.routeState().estado,
        page: 0,
        size: SESSION_PAGE_SIZE,
      }),
    }).subscribe({
      next: ({ diagnosticos, sesiones }) => {
        this.diagnosticos.set(diagnosticos);
        this.sesiones.set(sesiones);
        if (!this.selectedCaseId()) {
          this.selectedCaseId.set(this.activeCaseCards()[0]?.id ?? diagnosticos[0]?.id ?? null);
        }
        this.casesStatus.set('success');
      },
      error: (err) => {
        this.casesStatus.set('error');
        this.casesError.set(this.errMap.toMessage(err));
      },
    });
  }

  private ensureTimelineData(force = false): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (!force && (this.timelineStatus() === 'loading' || this.timelineStatus() === 'success')) {
      return;
    }
    this.timelineStatus.set('loading');
    this.timelineError.set(null);
    this.timelineVisibleCount.set(TIMELINE_BATCH_SIZE);
    this.historiaSvc.getTimeline(consultorioId, pacienteId).subscribe({
      next: (timeline) => {
        this.timeline.set(timeline);
        this.timelineStatus.set('success');
      },
      error: (err) => {
        this.timelineStatus.set('error');
        this.timelineError.set(this.errMap.toMessage(err));
      },
    });
  }

  private ensureBackgroundData(force = false): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (!force && (this.backgroundStatus() === 'loading' || this.backgroundStatus() === 'success')) {
      return;
    }
    this.backgroundStatus.set('loading');
    this.backgroundError.set(null);
    const latestSesionId = this.overview()?.ultimaSesion?.sesionId;
    forkJoin({
      antecedentes: this.historiaSvc.getAntecedentes(consultorioId, pacienteId),
      latestSesion: latestSesionId ? this.historiaSvc.getSesion(consultorioId, pacienteId, latestSesionId) : of(null),
    }).subscribe({
      next: ({ antecedentes, latestSesion }) => {
        this.antecedentes.set(antecedentes);
        this.backgroundLatestSesion.set(latestSesion);
        this.backgroundStatus.set('success');
      },
      error: (err) => {
        this.backgroundStatus.set('error');
        this.backgroundError.set(this.errMap.toMessage(err));
      },
    });
  }

  private resetState(): void {
    this.workspaceSnapshot.set(null);
    this.patientMatches.set([]);
    this.patientContextPreview.set('');
    this.patientSearchControl.setValue('', { emitEvent: false });
    this.resetCanvas();
  }

  private resetCanvas(): void {
    this.overview.set(null);
    this.selectedSesion.set(null);
    this.status.set('idle');
    this.error.set(null);
    this.activeTab.set('summary');
    this.timelineFilter.set('all');
    this.sessionListFilter.set('all');
    this.showLegajoModal.set(false);
    this.showSesionDrawer.set(false);
    this.showCasoDrawer.set(false);
    this.showAntecedentesDrawer.set(false);
    this.showClearPatientConfirm.set(false);
    this.resetLazyData();
  }

  private resetLazyData(): void {
    this.timeline.set([]);
    this.antecedentes.set([]);
    this.diagnosticos.set([]);
    this.sesiones.set([]);
    this.backgroundLatestSesion.set(null);
    this.selectedCaseId.set(null);
    this.timelineVisibleCount.set(TIMELINE_BATCH_SIZE);
    this.showClosedCases.set(false);
    this.casesStatus.set('idle');
    this.casesError.set(null);
    this.timelineStatus.set('idle');
    this.timelineError.set(null);
    this.backgroundStatus.set('idle');
    this.backgroundError.set(null);
  }

  private hasPendingDrafts(): boolean {
    const legajoDirty = this.showLegajoModal() && (this.createLegajoForm.dirty || this.createLegajoAntecedentes.dirty);
    const sesionDirty = this.showSesionDrawer() && this.sesionForm.dirty;
    const casoDirty = this.showCasoDrawer() && this.casoForm.dirty;
    const antecedentesDirty = this.showAntecedentesDrawer() && this.antecedentesForm.dirty;
    return legajoDirty || sesionDirty || casoDirty || antecedentesDirty;
  }

  private executeClearSelectedPatient(): void {
    this.patientMatches.set([]);
    this.patientContextPreview.set('');
    this.patientSearchControl.setValue('', { emitEvent: false });
    this.navigateWithState({
      ...this.routeState(),
      pacienteId: undefined,
      sesionId: undefined,
      tab: 'summary',
    });
  }

  private searchPatients(term: string) {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const normalized = term.trim();
    const normalizedDni = normalized.replace(/[.\s-]/g, '');
    const isDniSearch = /^[0-9]{7,10}$/.test(normalizedDni);
    return !consultorioId || normalized.length < 2
      ? of([] as PacienteSearchResult[])
      : this.pacienteSvc
          .search(consultorioId, isDniSearch ? normalizedDni : undefined, isDniSearch ? undefined : normalized)
          .pipe(
            map((items) => items.filter((item) => item.linkedToConsultorio)),
            catchError((err) => {
              this.toast.error(this.errMap.toMessage(err));
              return of([] as PacienteSearchResult[]);
            }),
          );
  }

  private navigateWithState(state: RouteState): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        pacienteId: state.pacienteId ?? null,
        sesionId: state.sesionId ?? null,
        profesionalId: state.profesionalId ?? null,
        from: state.from ?? null,
        to: state.to ?? null,
        estado: state.estado ?? null,
        tab: state.tab ?? null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private readQueryParam(queryParams: ParamMap, key: string): string | undefined {
    const value = queryParams.get(key)?.trim() ?? '';
    return value || undefined;
  }

  private readEstado(value: string | null): HistoriaClinicaSesionEstado | undefined {
    return value === 'BORRADOR' || value === 'CERRADA' || value === 'ANULADA' ? value : undefined;
  }

  private readTab(value: string | null): ClinicalTab | undefined {
    return value === 'summary' || value === 'cases' || value === 'timeline' || value === 'background'
      ? value
      : undefined;
  }

  private seedDefaultProfessionals(): void {
    const profesionalId = this.defaultProfesionalId();
    if (!profesionalId) {
      return;
    }
    this.createLegajoForm.controls.profesionalId.setValue(profesionalId, { emitEvent: false });
    this.sesionForm.controls.profesionalId.setValue(profesionalId, { emitEvent: false });
    this.casoForm.controls.profesionalId.setValue(profesionalId, { emitEvent: false });
  }

  private defaultProfesionalId(): string {
    return this.auth.currentUser()?.profesionalId ?? '';
  }

  private patchSesionForm(sesion: SesionClinicaResponse): void {
    this.sesionForm.reset(
      {
        profesionalId: sesion.profesionalId,
        turnoId: sesion.turnoId ?? '',
        boxId: sesion.boxId ?? '',
        fechaAtencion: this.toInputDateTime(sesion.fechaAtencion),
        tipoAtencion: sesion.tipoAtencion,
        motivoConsulta: sesion.motivoConsulta ?? '',
        resumenClinico: sesion.resumenClinico ?? '',
        subjetivo: sesion.subjetivo ?? '',
        objetivo: sesion.objetivo ?? '',
        evaluacion: sesion.evaluacion ?? '',
        plan: sesion.plan ?? '',
      },
      { emitEvent: false },
    );
  }

  private buildSesionRequest() {
    const raw = this.sesionForm.getRawValue();
    if (!raw.profesionalId || !raw.fechaAtencion || !raw.tipoAtencion) {
      return null;
    }
    return {
      profesionalId: raw.profesionalId,
      turnoId: this.emptyToUndefined(raw.turnoId) ?? null,
      boxId: this.emptyToUndefined(raw.boxId) ?? null,
      fechaAtencion: raw.fechaAtencion,
      tipoAtencion: raw.tipoAtencion,
      motivoConsulta: this.emptyToUndefined(raw.motivoConsulta) ?? null,
      resumenClinico: this.emptyToUndefined(raw.resumenClinico) ?? null,
      subjetivo: this.emptyToUndefined(raw.subjetivo) ?? null,
      objetivo: this.emptyToUndefined(raw.objetivo) ?? null,
      evaluacion: this.emptyToUndefined(raw.evaluacion) ?? null,
      plan: this.emptyToUndefined(raw.plan) ?? null,
    };
  }

  private createAntecedenteGroup(item?: Partial<HistoriaClinicaAntecedenteItem>): FormGroup {
    return new FormGroup({
      label: new FormControl(item?.label ?? '', { nonNullable: true }),
      valueText: new FormControl(item?.valueText ?? '', { nonNullable: true }),
      critical: new FormControl(item?.critical ?? false, { nonNullable: true }),
      notes: new FormControl(item?.notes ?? '', { nonNullable: true }),
    });
  }

  private resetAntecedenteArray(array: FormArray, items: HistoriaClinicaAntecedenteItem[]): void {
    while (array.length) {
      array.removeAt(0);
    }
    const seed = items.length ? items : [{ label: '', valueText: '', critical: false, notes: '' }];
    seed.forEach((item) => array.push(this.createAntecedenteGroup(item)));
  }

  private buildAntecedentesPayload(array: FormArray): HistoriaClinicaAntecedenteItem[] {
    return array.controls
      .map((control) => control.getRawValue())
      .map((item) => ({
        label: (item.label ?? '').trim(),
        valueText: this.emptyToUndefined(item.valueText) ?? null,
        critical: !!item.critical,
        notes: this.emptyToUndefined(item.notes) ?? null,
      }))
      .filter((item) => !!item.label);
  }

  private matchesTimelineType(event: HistoriaClinicaTimelineEvent): boolean {
    switch (this.timelineFilter()) {
      case 'sessions':
        return event.type === 'SESION';
      case 'cases':
        return event.type === 'CASO_OPENED' || event.type === 'CASO_CLOSED';
      case 'antecedents':
        return event.type === 'ANTECEDENTE_UPDATED';
      case 'attachments':
        return event.type === 'ADJUNTO';
      default:
        return true;
    }
  }

  private matchesCompatibilityFilters(event: HistoriaClinicaTimelineEvent): boolean {
    const state = this.routeState();
    if (state.profesionalId && event.profesionalId !== state.profesionalId) {
      return false;
    }
    if (state.from && new Date(event.occurredAt) < new Date(`${state.from}T00:00:00`)) {
      return false;
    }
    if (state.to && new Date(event.occurredAt) > new Date(`${state.to}T23:59:59`)) {
      return false;
    }
    if (state.estado) {
      return event.type === 'SESION' && (event.statusLabel ?? '').toUpperCase() === state.estado;
    }
    return true;
  }

  resolveProfessionalName(profesionalId: string): string {
    return this.professionalOptions().find((item) => item.id === profesionalId)?.nombre || 'Profesional no disponible';
  }

  private countSessionsAfterDate(profesionalId: string, date: string): number {
    return this.sesiones().filter(
      (sesion) =>
        sesion.profesionalId === profesionalId &&
        new Date(sesion.fechaAtencion) >= new Date(`${date}T00:00:00`),
    ).length;
  }

  private emptyToUndefined(value?: string | null): string | undefined {
    const normalized = value?.trim() ?? '';
    return normalized || undefined;
  }

  private nowForInput(): string {
    return new Date().toISOString().slice(0, 16);
  }

  private todayForInput(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toInputDateTime(value: string): string {
    return value.slice(0, 16);
  }
}
