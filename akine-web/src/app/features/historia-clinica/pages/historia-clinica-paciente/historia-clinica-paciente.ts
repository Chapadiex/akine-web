import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
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
import { AntecedenteCatalogCategory } from '../../../consultorios/models/antecedente-catalog.models';
import {
  DiagnosticoMedicoCategoria,
  DiagnosticoMedicoItem,
  DiagnosticoMedicoTipo,
} from '../../../consultorios/models/diagnosticos-medicos.models';
import {
  TratamientoCatalogCategoria,
  TratamientoCatalogItem,
  TratamientoCatalogTipo,
} from '../../../consultorios/models/tratamiento-catalog.models';
import { AntecedenteCatalogService } from '../../../consultorios/services/antecedente-catalog.service';
import { DiagnosticosMedicosService } from '../../../consultorios/services/diagnosticos-medicos.service';
import { TratamientoCatalogService } from '../../../consultorios/services/tratamiento-catalog.service';
import { AntecedenteSelectorComponent } from '../../components/antecedentes-workspace/antecedentes-workspace';
import { DiagnosticoMedicoSelectorComponent } from '../../components/diagnostico-medico-selector/diagnostico-medico-selector';
import { TratamientoCatalogSelectorComponent } from '../../components/tratamiento-catalog-selector/tratamiento-catalog-selector';
import { PacienteForm } from '../../../pacientes/components/paciente-form/paciente-form';
import { PacienteRequest, PacienteSearchResult } from '../../../pacientes/models/paciente.models';
import { PacienteService } from '../../../pacientes/services/paciente.service';
import {
  AdjuntoClinicoResponse,
  AtencionInicialTipoIngreso,
  CasoAtencionSummary,
  CreateAtencionInicialRequest,
  CreateCasoAtencionRequest,
  DiagnosticoClinicoResponse,
  HistoriaClinicaActiveCaseSummary,
  HistoriaClinicaAntecedenteItem,
  HistoriaClinicaOverview,
  PlanTratamientoCaracter,
  HistoriaClinicaSesionEstado,
  HistoriaClinicaTimelineEvent,
  HistoriaClinicaTipoAtencion,
  HistoriaClinicaWorkspace,
  SesionClinicaRequest,
  SesionClinicaResponse,
  UpdateCasoAtencionRequest,
} from '../../models/historia-clinica.models';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';

type ViewState = 'idle' | 'loading' | 'success' | 'error';
type TimelineFilter = 'all' | 'sessions' | 'cases' | 'antecedents' | 'attachments';
type SessionListFilter = 'all' | HistoriaClinicaSesionEstado;
type ClinicalTab = 'summary' | 'cases' | 'timeline';
type ClinicalScreenState = 'no-patient' | 'no-history' | 'history-no-case' | 'history-active-case';
type LegajoWizardStep = 0 | 1 | 2;

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

type StatusSummaryItem = {
  label: string;
  value: string;
};

const TIMELINE_BATCH_SIZE = 12;
const SESSION_PAGE_SIZE = 80;

@Component({
  selector: 'app-historia-clinica-paciente-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    PacienteForm,
    ConfirmDialog,
    AntecedenteSelectorComponent,
    DiagnosticoMedicoSelectorComponent,
    TratamientoCatalogSelectorComponent,
  ],
  templateUrl: './historia-clinica-paciente.html',
  styleUrl: './historia-clinica-paciente.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoriaClinicaPacientePage {
  @ViewChild('casoResponsableSelect') private casoResponsableSelect?: ElementRef<HTMLSelectElement>;
  @ViewChild('casoOriginDirectButton') private casoOriginDirectButton?: ElementRef<HTMLButtonElement>;

  private static readonly CASO_DERIVACION_ALLOWED_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ]);
  private static readonly CASO_DERIVACION_MAX_BYTES = 10 * 1024 * 1024;

  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly historiaSvc = inject(HistoriaClinicaService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly antecedenteCatalogSvc = inject(AntecedenteCatalogService);
  private readonly diagnosticosMedicosSvc = inject(DiagnosticosMedicosService);
  private readonly tratamientoCatalogSvc = inject(TratamientoCatalogService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly patientSearchControl = new FormControl('', { nonNullable: true });

  readonly workspaceSnapshot = signal<HistoriaClinicaWorkspace | null>(null);
  readonly overview = signal<HistoriaClinicaOverview | null>(null);
  readonly timeline = signal<HistoriaClinicaTimelineEvent[]>([]);
  readonly antecedentes = signal<HistoriaClinicaAntecedenteItem[]>([]);
  readonly diagnosticos = signal<DiagnosticoClinicoResponse[]>([]);
  readonly sesiones = signal<SesionClinicaResponse[]>([]);
  readonly casosClinicos = signal<CasoAtencionSummary[]>([]);
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
  readonly showCasoCloseConfirm = signal(false);
  readonly showEditCasoDrawer = signal(false);
  readonly isSavingEditCaso = signal(false);
  readonly casoModalStep = signal<1 | 2 | 3>(1);
  readonly showAntecedentesDrawer = signal(false);
  readonly showAntecedentesCloseConfirm = signal(false);
  readonly showClearPatientConfirm = signal(false);
  readonly showLegajoCloseConfirm = signal(false);
  readonly isSavingLegajo = signal(false);
  readonly isSavingSesion = signal(false);
  readonly isSavingCaso = signal(false);
  readonly isSavingAntecedentes = signal(false);
  readonly isUploadingAdjunto = signal(false);
  readonly antecedenteCatalogCategories = signal<AntecedenteCatalogCategory[]>([]);
  readonly diagnosticosMedicos = signal<DiagnosticoMedicoItem[]>([]);
  readonly diagnosticosMedicosCategorias = signal<DiagnosticoMedicoCategoria[]>([]);
  readonly diagnosticosMedicosTipos = signal<DiagnosticoMedicoTipo[]>([]);
  readonly treatmentCatalogItems = signal<TratamientoCatalogItem[]>([]);
  readonly treatmentCatalogCategorias = signal<TratamientoCatalogCategoria[]>([]);
  readonly treatmentCatalogTipos = signal<TratamientoCatalogTipo[]>([]);
  readonly createLegajoAdjuntos = signal<File[]>([]);
  readonly createLegajoDiagnosticoCodes = signal<string[]>([]);
  readonly createLegajoTratamientoCodes = signal<string[]>([]);
  readonly casoDiagnosticoCodes = signal<string[]>([]);
  readonly casoDerivacionAdjuntos = signal<File[]>([]);
  readonly selectedTreatmentCode = signal('');

  readonly createLegajoStep = signal<LegajoWizardStep>(0);
  readonly maxLegajoStepReached = signal<LegajoWizardStep>(0);

  readonly createLegajoForm = new FormGroup({
    profesionalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fechaHora: new FormControl(this.nowForInput(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tipoIngreso: new FormControl<AtencionInicialTipoIngreso>('CON_PRESCRIPCION', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    motivoConsultaBreve: new FormControl('', { nonNullable: true }),
    sintomasPrincipales: new FormControl('', { nonNullable: true }),
    tiempoEvolucion: new FormControl('', { nonNullable: true }),
    observaciones: new FormControl('', { nonNullable: true }),
    especialidadDerivante: new FormControl('', { nonNullable: true }),
    profesionalDerivante: new FormControl('', { nonNullable: true }),
    fechaPrescripcion: new FormControl('', { nonNullable: true }),
    diagnosticoCodigo: new FormControl('', { nonNullable: true }),
    diagnosticoObservacion: new FormControl('', { nonNullable: true }),
    observacionesPrescripcion: new FormControl('', { nonNullable: true }),
    peso: new FormControl('', { nonNullable: true }),
    altura: new FormControl('', { nonNullable: true }),
    resumenClinicoInicial: new FormControl('', { nonNullable: true }),
    hallazgosRelevantes: new FormControl('', { nonNullable: true }),
    planCantidadSesiones: new FormControl('10', { nonNullable: true, validators: [Validators.required] }),
    planCaracterCaso: new FormControl<PlanTratamientoCaracter>('PARCIAL', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    planObservacionesGenerales: new FormControl('', { nonNullable: true }),
  });
  readonly createLegajoAntecedentes = new FormArray<FormGroup>([]);
  readonly createLegajoTratamientos = new FormArray<FormGroup>([]);

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
    profesionalResponsableId: new FormControl('', { nonNullable: true }),
    tipoOrigen: new FormControl('CONSULTA_DIRECTA', { nonNullable: true, validators: [Validators.required] }),
    motivoConsultaDetalle: new FormControl('', { nonNullable: true }),
    derivadoPorInstitucion: new FormControl('', { nonNullable: true }),
    diagnosticoCodigo: new FormControl('', { nonNullable: true }),
    diagnosticoObservacion: new FormControl('', { nonNullable: true }),
    tratamientoId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cantidadSesiones: new FormControl('10', { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    tratamientoObservacion: new FormControl('', { nonNullable: true }),
  });

  readonly editCasoForm = new FormGroup({
    profesionalResponsableId: new FormControl('', { nonNullable: true }),
    motivoConsulta: new FormControl('', { nonNullable: true }),
    diagnosticoMedico: new FormControl('', { nonNullable: true }),
    diagnosticoFuncional: new FormControl('', { nonNullable: true }),
    afeccionPrincipal: new FormControl('', { nonNullable: true }),
  });

  readonly antecedentesForm = new FormGroup({
    items: new FormArray([this.createAntecedenteGroup()]),
  });
  readonly tipoIngresoOptions: ReadonlyArray<{ value: AtencionInicialTipoIngreso; label: string }> = [
    { value: 'CON_PRESCRIPCION', label: 'Con prescripción médica' },
    { value: 'CONSULTA_PARTICULAR', label: 'Consulta particular' },
  ];
  readonly caracterCasoOptions: ReadonlyArray<{ value: PlanTratamientoCaracter; label: string }> = [
    { value: 'PARCIAL', label: 'Parcial' },
    { value: 'DEFINITIVO', label: 'Definitivo' },
    { value: 'CRONICO', label: 'Crónico' },
  ];

  readonly tabOptions: ReadonlyArray<{ value: ClinicalTab; label: string }> = [
    { value: 'summary', label: 'Resumen' },
    { value: 'cases', label: 'Casos y sesiones' },
    { value: 'timeline', label: 'Timeline' },
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
    { value: 'EVALUACION', label: 'Evaluación inicial' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'TRATAMIENTO', label: 'Tratamiento' },
    { value: 'INTERCONSULTA', label: 'Interconsulta' },
    { value: 'OTRO', label: 'Otro' },
  ];

  readonly selectedPatient = computed(() => this.overview()?.paciente ?? null);
  readonly hasPatientContext = computed(() => !!this.routeState().pacienteId);
  readonly hasLegajo = computed(() => !!this.overview()?.legajo.exists);
  readonly hasActiveCases = computed(() =>
    (this.overview()?.casosActivos.length ?? 0) > 0 ||
    (this.overview()?.casosAtencionActivos.length ?? 0) > 0,
  );
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
    if (!patient) return 'Cargando contexto clínico...';
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
        return 'Registrá los antecedentes clínicos del paciente para dejar una base documental mínima útil.';
      case 'history-no-case':
        return 'La historia clínica existe, pero hoy no hay un caso abierto. El siguiente paso operativo es abrir uno.';
      case 'history-active-case':
        return 'El paciente ya tiene seguimiento activo. La acción del día es registrar o continuar la sesión clínica.';
      default:
        return 'Busca un paciente para abrir el contexto clínico.';
    }
  });
  readonly primaryActionLabel = computed(() => {
    switch (this.screenState()) {
      case 'no-history':
        return 'Registrar historia clínica';
      case 'history-no-case':
        return 'Nuevo caso clínico';
      case 'history-active-case':
        return 'Nueva sesión';
      default:
        return '';
    }
  });
  readonly currentProfessionalLabel = computed(
    () => this.overview()?.ultimaSesion?.profesionalNombre || this.overview()?.profesionalHabitual || 'Sin registro',
  );
  readonly statusSummaryItems = computed<StatusSummaryItem[]>(() => {
    const alertCount = this.overview()?.alertasClinicas?.length ?? this.recentCriticalAntecedentes().length ?? 0;
    const items: StatusSummaryItem[] = [
      { label: 'HC', value: this.hasLegajo() ? 'Creada' : 'Pendiente' },
      {
        label: 'Casos activos',
        value: String(
          (this.overview()?.casosActivos?.length ?? 0) +
          (this.overview()?.casosAtencionActivos?.length ?? 0),
        ),
      },
      {
        label: 'Última atención',
        value: this.overview()?.ultimaSesion?.fechaAtencion
          ? this.formatDateTime(this.overview()!.ultimaSesion!.fechaAtencion)
          : 'Sin sesiones',
      },
      { label: 'Profesional', value: this.currentProfessionalLabel() },
    ];
    if (alertCount > 0) {
      items.splice(3, 0, { label: 'Alertas', value: String(alertCount) });
    }
    return items;
  });
  readonly contextNotice = computed<{ message: string; actionLabel: string } | null>(() => {
    switch (this.screenState()) {
      case 'history-no-case':
        return {
          message: 'Todavía no hay un caso clínico activo. Abrí el primero para ordenar sesiones, diagnósticos y evolución.',
          actionLabel: 'Nuevo caso clínico',
        };
      default:
        return null;
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
  readonly activeCasosClinicos = computed<CasoAtencionSummary[]>(() =>
    this.casosClinicos().filter((c) => !c.estado.startsWith('CERRADO')),
  );
  readonly closedCasosClinicos = computed<CasoAtencionSummary[]>(() =>
    this.casosClinicos().filter((c) => c.estado.startsWith('CERRADO')),
  );
  readonly selectedCase = computed<CasePanelItem | null>(() => {
    const selectedId = this.selectedCaseId();
    if (!selectedId) return this.activeCaseCards()[0] ?? this.closedCaseCards()[0] ?? null;
    const fromCards =
      this.activeCaseCards().find((item) => item.id === selectedId) ??
      this.closedCaseCards().find((item) => item.id === selectedId);
    if (fromCards) return fromCards;
    // Casos del sistema CasoAtencion (casosClinicos) usan un ID distinto al de diagnosticoId
    const fromCaso = this.casosClinicos().find((c) => c.id === selectedId);
    if (!fromCaso) return null;
    return {
      id: fromCaso.id,
      profesionalId: fromCaso.profesionalResponsableId ?? '',
      profesionalNombre: fromCaso.profesionalResponsableNombre ?? 'Sin profesional',
      descripcion: fromCaso.motivoConsulta ?? fromCaso.diagnosticoMedico ?? fromCaso.afeccionPrincipal ?? 'Sin descripción',
      estado: fromCaso.estado,
      fechaInicio: fromCaso.fechaApertura?.substring(0, 10) ?? '',
      cantidadSesiones: fromCaso.cantidadSesiones,
      ultimaEvolucionResumen: null,
      isActive: !fromCaso.estado.startsWith('CERRADO'),
    };
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
  readonly summaryMainCase = computed<CasePanelItem | null>(() => {
    const fromDiagnostico = this.activeCaseCards()[0];
    if (fromDiagnostico) return fromDiagnostico;
    const fromCaso = (this.overview()?.casosAtencionActivos ?? [])[0];
    if (!fromCaso) return null;
    return {
      id: fromCaso.id,
      profesionalId: fromCaso.profesionalResponsableId ?? '',
      profesionalNombre: fromCaso.profesionalResponsableNombre ?? 'Sin profesional',
      descripcion: fromCaso.motivoConsulta ?? fromCaso.diagnosticoMedico ?? fromCaso.afeccionPrincipal ?? 'Sin descripción',
      estado: fromCaso.estado,
      fechaInicio: fromCaso.fechaApertura?.substring(0, 10) ?? '',
      cantidadSesiones: fromCaso.cantidadSesiones,
      ultimaEvolucionResumen: null,
      isActive: true,
    };
  });
  readonly summaryLatestEvent = computed(() => this.overview()?.ultimaSesion ?? null);
  readonly summaryAntecedentes = computed(() => this.overview()?.antecedentesRelevantes?.slice(0, 4) ?? []);
  readonly summaryAdjuntos = computed(() => this.overview()?.adjuntosRecientes?.slice(0, 4) ?? []);
  readonly selectedCasoDiagnosticos = computed(() => {
    const selectedCodes = new Set(this.casoDiagnosticoCodes());
    return this.diagnosticosMedicos().filter((item) => selectedCodes.has(item.codigoInterno));
  });
  readonly availableTreatmentItems = computed(() => [] as TratamientoCatalogItem[]);
  readonly legajoWizardSteps: ReadonlyArray<{
    step: LegajoWizardStep;
    label: string;
    title: string;
  }> = [
    {
      step: 0,
      label: 'Paso 1',
      title: 'Ingreso clínico',
    },
    {
      step: 1,
      label: 'Paso 2',
      title: 'Evaluación y antecedentes',
    },
    {
      step: 2,
      label: 'Paso 3',
      title: 'Plan terapéutico',
    },
  ];

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
        fechaHora: this.nowForInput(),
        tipoIngreso: 'CON_PRESCRIPCION',
        motivoConsultaBreve: '',
        sintomasPrincipales: '',
        tiempoEvolucion: '',
        observaciones: '',
        especialidadDerivante: '',
        profesionalDerivante: '',
        fechaPrescripcion: '',
        diagnosticoCodigo: '',
        diagnosticoObservacion: '',
        observacionesPrescripcion: '',
        peso: '',
        altura: '',
        resumenClinicoInicial: '',
        hallazgosRelevantes: '',
        planCantidadSesiones: '10',
        planCaracterCaso: 'PARCIAL',
        planObservacionesGenerales: '',
      },
      { emitEvent: false },
    );
    this.resetAntecedenteArray(this.createLegajoAntecedentes, []);
    this.resetTratamientoArray();
    this.createLegajoAdjuntos.set([]);
    this.createLegajoDiagnosticoCodes.set([]);
    this.createLegajoTratamientoCodes.set([]);
    this.selectedTreatmentCode.set('');
    this.createLegajoStep.set(0);
    this.maxLegajoStepReached.set(0);
    this.showLegajoCloseConfirm.set(false);
    this.showLegajoModal.set(true);
    this.loadAntecedenteCatalog();
    this.loadDiagnosticosMedicos();
    this.loadTratamientoCatalog();
  }

  dismissLegajoModal(): void {
    if (this.hasLegajoWizardDraft()) {
      this.showLegajoCloseConfirm.set(true);
      return;
    }
    this.showLegajoModal.set(false);
  }

  confirmDismissLegajoModal(): void {
    this.showLegajoCloseConfirm.set(false);
    this.showLegajoModal.set(false);
  }

  cancelDismissLegajoModal(): void {
    this.showLegajoCloseConfirm.set(false);
  }

  nextLegajoStep(): void {
    if (!this.validateLegajoStep(this.createLegajoStep())) {
      return;
    }
    this.createLegajoStep.update((step) => {
      const nextStep = step < 2 ? ((step + 1) as LegajoWizardStep) : step;
      this.maxLegajoStepReached.update((current) => (nextStep > current ? nextStep : current));
      return nextStep;
    });
  }

  updateCreateLegajoDiagnosticos(codes: string[]): void {
    const uniqueCodes = Array.from(new Set(codes.map((code) => code.trim()).filter((code) => code.length > 0)));
    this.createLegajoDiagnosticoCodes.set(uniqueCodes);
    this.createLegajoForm.controls.diagnosticoCodigo.setValue(uniqueCodes[0] ?? '', { emitEvent: false });
  }

  updateCreateLegajoTratamientos(codes: string[]): void {
    const uniqueCodes = Array.from(new Set(codes.map((code) => code.trim()).filter((code) => code.length > 0)));
    while (this.createLegajoTratamientos.length) {
      this.createLegajoTratamientos.removeAt(0);
    }
    for (const code of uniqueCodes) {
      const item = this.treatmentCatalogItems().find((i) => i.codigoInterno === code);
      this.createLegajoTratamientos.push(
        this.createTratamientoGroup({
          tratamientoId: code,
          tratamientoNombre: item?.nombre ?? code,
          requiereAutorizacion: item?.requiereAutorizacion ?? false,
        }),
      );
    }
    this.createLegajoTratamientoCodes.set(uniqueCodes);
  }

  previousLegajoStep(): void {
    this.createLegajoStep.update((step) => (step > 0 ? ((step - 1) as LegajoWizardStep) : step));
  }

  goToLegajoStep(step: LegajoWizardStep): void {
    const current = this.createLegajoStep();
    if (step === current) {
      return;
    }
    if (step < current) {
      this.createLegajoStep.set(step);
      return;
    }
    if (!this.canNavigateToLegajoStep(step)) {
      this.validateLegajoStep(current);
      return;
    }
    this.maxLegajoStepReached.update((reached) => (step > reached ? step : reached));
    this.createLegajoStep.set(step);
  }

  saveLegajo(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (!this.validateLegajoStep(2)) {
      this.createLegajoStep.set(2);
      return;
    }
    const raw = this.createLegajoForm.getRawValue();
    const payload: CreateAtencionInicialRequest = {
      profesionalId: raw.profesionalId,
      fechaHora: raw.fechaHora,
      tipoIngreso: raw.tipoIngreso,
      motivoConsultaBreve: this.emptyToUndefined(raw.motivoConsultaBreve) ?? null,
      sintomasPrincipales: this.emptyToUndefined(raw.sintomasPrincipales) ?? null,
      tiempoEvolucion: this.emptyToUndefined(raw.tiempoEvolucion) ?? null,
      observaciones: this.emptyToUndefined(raw.observaciones) ?? null,
      especialidadDerivante: this.emptyToUndefined(raw.especialidadDerivante) ?? null,
      profesionalDerivante: this.emptyToUndefined(raw.profesionalDerivante) ?? null,
      fechaPrescripcion: this.emptyToUndefined(raw.fechaPrescripcion) ?? null,
      diagnosticoCodigo: this.emptyToUndefined(raw.diagnosticoCodigo) ?? null,
      diagnosticoObservacion: this.emptyToUndefined(raw.diagnosticoObservacion) ?? null,
      observacionesPrescripcion: this.emptyToUndefined(raw.observacionesPrescripcion) ?? null,
      evaluacion: this.buildEvaluacionPayload(raw),
      resumenClinicoInicial: this.emptyToUndefined(raw.resumenClinicoInicial) ?? null,
      hallazgosRelevantes: this.emptyToUndefined(raw.hallazgosRelevantes) ?? null,
      antecedentes: this.buildAntecedentesPayload(this.createLegajoAntecedentes),
      planObservacionesGenerales: this.emptyToUndefined(raw.planObservacionesGenerales) ?? null,
      tratamientos: this.buildTratamientosPayload(),
    };
    this.isSavingLegajo.set(true);
    this.historiaSvc
      .createAtencionInicial(consultorioId, pacienteId, payload)
      .subscribe({
        next: (overview) => {
          const atencionInicialId = overview.atencionInicial?.id ?? null;
          const queuedFiles = this.createLegajoAdjuntos();
          if (!atencionInicialId || !queuedFiles.length) {
            this.finishCreateAtencionInicial();
            return;
          }
          this.isUploadingAdjunto.set(true);
          forkJoin(
            queuedFiles.map((file) =>
              this.historiaSvc
                .uploadAtencionInicialAdjunto(consultorioId, pacienteId, atencionInicialId, file)
                .pipe(catchError(() => of(null))),
            ),
          ).subscribe({
            next: (uploads) => {
              this.isUploadingAdjunto.set(false);
              const failed = uploads.filter((item) => item === null).length;
              this.finishCreateAtencionInicial();
              if (failed > 0) {
                this.toast.info('La atención inicial se guardó, pero algunos adjuntos no se pudieron subir.');
              }
            },
            error: () => {
              this.isUploadingAdjunto.set(false);
              this.finishCreateAtencionInicial();
              this.toast.info('La atención inicial se guardó, pero fallaron los adjuntos.');
            },
          });
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
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    const request: SesionClinicaRequest = {
      profesionalId: defaultProfesionalId ?? this.defaultProfesionalId() ?? '',
      turnoId: undefined,
      boxId: undefined,
      fechaAtencion: new Date().toISOString().slice(0, 16),
      tipoAtencion: 'SEGUIMIENTO',
      motivoConsulta: '',
      resumenClinico: '',
    };
    this.historiaSvc.createSesion(consultorioId, pacienteId, request).subscribe({
      next: (sesion) => {
        this.router.navigate(['/app/historia-clinica/sesion', sesion.id], {
          queryParams: { pacienteId },
        });
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  openSesion(sesionId: string, updateQuery = true): void {
    const pacienteId = this.selectedPatient()?.id;
    if (!pacienteId) {
      return;
    }
    this.router.navigate(['/app/historia-clinica/sesion', sesionId], {
      queryParams: { pacienteId },
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
        this.toast.success(currentSesion ? 'Sesión actualizada.' : 'Sesión creada.');
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
        this.toast.info('Sesión cerrada.');
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
    if (!consultorioId || !pacienteId || !sesionId || !window.confirm('Esta acción anulará la sesión actual.')) {
      return;
    }
    this.isSavingSesion.set(true);
    this.historiaSvc.annulSesion(consultorioId, pacienteId, sesionId).subscribe({
      next: () => {
        this.isSavingSesion.set(false);
        this.toast.info('Sesión anulada.');
        this.reloadSelectedPatient(sesionId);
      },
      error: (err) => {
        this.isSavingSesion.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  openCasoDrawer(defaultProfesionalId?: string): void {
    const requestedProfesionalId = defaultProfesionalId ?? this.defaultProfesionalId() ?? '';
    const resolvedProfesionalId = this.professionalOptions().some((item) => item.id === requestedProfesionalId)
      ? requestedProfesionalId
      : '';
    this.casoModalStep.set(1);
    this.showCasoCloseConfirm.set(false);
    this.casoDiagnosticoCodes.set([]);
    this.casoDerivacionAdjuntos.set([]);
    this.casoForm.reset(
      {
        profesionalResponsableId: resolvedProfesionalId,
        tipoOrigen: 'CONSULTA_DIRECTA',
        motivoConsultaDetalle: '',
        derivadoPorInstitucion: '',
        diagnosticoCodigo: '',
        diagnosticoObservacion: '',
        tratamientoId: '',
        cantidadSesiones: '10',
        tratamientoObservacion: '',
      },
      { emitEvent: false },
    );
    this.loadDiagnosticosMedicos();
    this.loadTratamientoCatalog();
    this.showCasoDrawer.set(true);
    this.focusCasoFirstField();
  }

  closeCasoModal(): void {
    if (this.casoForm.dirty || this.casoDerivacionAdjuntos().length > 0) {
      this.showCasoCloseConfirm.set(true);
      return;
    }
    this.showCasoDrawer.set(false);
  }

  confirmCloseCasoModal(): void {
    this.showCasoCloseConfirm.set(false);
    this.showCasoDrawer.set(false);
    this.casoDiagnosticoCodes.set([]);
    this.casoDerivacionAdjuntos.set([]);
    this.casoForm.markAsPristine();
  }

  nextCasoStep(): void {
    const step = this.casoModalStep();
    if (step === 1) {
      if (!this.validateCasoStepOne()) {
        return;
      }
      this.casoModalStep.set(2);
    } else if (step === 2) {
      if (!this.casoDiagnosticoCodes().length) {
        this.casoForm.controls.diagnosticoCodigo.markAsTouched();
        return;
      }
      this.casoModalStep.set(3);
    }
  }

  prevCasoStep(): void {
    const step = this.casoModalStep();
    if (step === 2) this.casoModalStep.set(1);
    else if (step === 3) this.casoModalStep.set(2);
  }

  saveCaso(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const legajoId = this.overview()?.legajo.legajoId;
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !legajoId || !pacienteId) {
      return;
    }
    if (!this.validateCasoStepOne()) {
      this.casoModalStep.set(1);
      return;
    }
    if (this.casoForm.invalid) {
      this.casoForm.markAllAsTouched();
      return;
    }
    const raw = this.casoForm.getRawValue();
    const diagnosisNames = this.resolveDiagnosticoNombres(this.casoDiagnosticoCodes());
    const treatmentName = this.resolveTreatmentCatalogItem(raw.tratamientoId)?.nombre ?? null;
    const motivoConsultaDetalle = this.emptyToUndefined(raw.motivoConsultaDetalle);
    const derivadoPorInstitucion = this.emptyToUndefined(raw.derivadoPorInstitucion);
    const diagnosticoObservacion = this.emptyToUndefined(raw.diagnosticoObservacion);
    const tratamientoObservacion = this.emptyToUndefined(raw.tratamientoObservacion);
    const body: CreateCasoAtencionRequest = {
      pacienteId,
      profesionalResponsableId: this.emptyToUndefined(raw.profesionalResponsableId) ?? null,
      tipoOrigen: raw.tipoOrigen || 'CONSULTA_DIRECTA',
      prioridad: 'NORMAL',
      motivoConsulta:
        raw.tipoOrigen === 'DERIVACION'
          ? (derivadoPorInstitucion ? `Derivación: ${derivadoPorInstitucion}` : 'Derivación')
          : (motivoConsultaDetalle ?? 'Consulta directa'),
      diagnosticoMedico: diagnosisNames.length ? diagnosisNames.join(' · ') : null,
      afeccionPrincipal: diagnosticoObservacion ?? null,
      diagnosticoFuncional: this.buildCasoTratamientoResumen({
        treatmentName,
        cantidadSesiones: raw.cantidadSesiones,
        tratamientoObservacion,
      }),
    };
    this.isSavingCaso.set(true);
    this.historiaSvc
      .createCasoAtencion(consultorioId, legajoId, body)
      .subscribe({
        next: (caso) => {
          const queuedFiles = this.casoForm.controls.tipoOrigen.value === 'DERIVACION' ? this.casoDerivacionAdjuntos() : [];
          if (!queuedFiles.length) {
            this.finishCasoSave('Caso clínico creado.');
            return;
          }
          forkJoin(queuedFiles.map((file) => this.historiaSvc.uploadCasoAtencionAdjunto(consultorioId, caso.id, file))).subscribe({
            next: () => this.finishCasoSave('Caso clínico creado.'),
            error: () => {
              this.finishCasoSave('Caso clínico creado.');
              this.toast.warning('El caso se creó, pero no se pudieron cargar los adjuntos de derivación.');
            },
          });
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
    if (!consultorioId || !pacienteId || !window.confirm('Se marcará el caso como resuelto.')) {
      return;
    }
    this.historiaSvc
      .resolveDiagnostico(consultorioId, pacienteId, diagnosticoId, { fechaFin: this.todayForInput() })
      .subscribe({
        next: () => {
          this.toast.info('Caso clínico cerrado.');
          this.reloadSelectedPatient();
        },
        error: (err) => this.toast.error(this.errMap.toMessage(err)),
      });
  }

  openEditCaso(casoId: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    if (!consultorioId) return;
    this.historiaSvc.getCasoAtencion(consultorioId, casoId).subscribe({
      next: (caso) => {
        this.editCasoForm.reset({
          profesionalResponsableId: caso.profesionalResponsableId ?? '',
          motivoConsulta: caso.motivoConsulta ?? '',
          diagnosticoMedico: caso.diagnosticoMedico ?? '',
          diagnosticoFuncional: caso.diagnosticoFuncional ?? '',
          afeccionPrincipal: caso.afeccionPrincipal ?? '',
        });
        this.editCasoForm.markAsPristine();
        this.showEditCasoDrawer.set(true);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  closeEditCasoDrawer(): void {
    this.showEditCasoDrawer.set(false);
    this.editCasoForm.markAsPristine();
  }

  saveEditCaso(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const casoId = this.selectedCaseId();
    if (!consultorioId || !casoId) return;
    const raw = this.editCasoForm.getRawValue();
    const body: UpdateCasoAtencionRequest = {
      profesionalResponsableId: this.emptyToUndefined(raw.profesionalResponsableId) ?? null,
      motivoConsulta: this.emptyToUndefined(raw.motivoConsulta) ?? null,
      diagnosticoMedico: this.emptyToUndefined(raw.diagnosticoMedico) ?? null,
      diagnosticoFuncional: this.emptyToUndefined(raw.diagnosticoFuncional) ?? null,
      afeccionPrincipal: this.emptyToUndefined(raw.afeccionPrincipal) ?? null,
    };
    this.isSavingEditCaso.set(true);
    this.historiaSvc.updateCasoAtencion(consultorioId, casoId, body).subscribe({
      next: () => {
        this.isSavingEditCaso.set(false);
        this.editCasoForm.markAsPristine();
        this.showEditCasoDrawer.set(false);
        this.toast.success('Caso clínico actualizado.');
        this.ensureCasesTabData(true);
      },
      error: (err) => {
        this.isSavingEditCaso.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  openAntecedentesDrawer(): void {
    this.loadAntecedenteCatalog();
    this.showAntecedentesCloseConfirm.set(false);
    this.showAntecedentesDrawer.set(true);
    if (this.hasLegajo()) {
      this.ensureBackgroundData(() => {
        this.resetAntecedenteArray(this.antecedentesItems, this.antecedentes());
      });
    } else {
      this.resetAntecedenteArray(this.antecedentesItems, this.antecedentes());
    }
  }

  closeAntecedentesModal(): void {
    if (this.antecedentesForm.dirty) {
      this.showAntecedentesCloseConfirm.set(true);
      return;
    }
    this.showAntecedentesDrawer.set(false);
  }

  confirmCloseAntecedentesModal(): void {
    this.showAntecedentesCloseConfirm.set(false);
    this.showAntecedentesDrawer.set(false);
    this.antecedentesForm.markAsPristine();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showEditCasoDrawer()) {
      this.closeEditCasoDrawer();
      return;
    }
    if (this.showAntecedentesDrawer()) {
      this.closeAntecedentesModal();
    }
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
          this.antecedentesForm.markAsPristine();
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

  addSelectedTratamiento(): void {
    const selectedCode = this.selectedTreatmentCode().trim();
    if (!selectedCode) {
      return;
    }
    const item = this.treatmentCatalogItems().find((catalogItem) => catalogItem.codigoInterno === selectedCode);
    if (!item) {
      return;
    }
    this.addTratamientoFromCatalog(item);
    this.selectedTreatmentCode.set('');
  }

  handleSelectedTreatment(code: string): void {
    this.selectedTreatmentCode.set(code);
    this.addSelectedTratamiento();
  }

  addTratamientoFromCatalog(item: TratamientoCatalogItem): void {
    if (this.selectedTreatmentCodes().includes(item.codigoInterno)) {
      return;
    }
    this.createLegajoTratamientos.push(
      this.createTratamientoGroup({
        tratamientoId: item.codigoInterno,
        tratamientoNombre: item.nombre,
        requiereAutorizacion: item.requiereAutorizacion,
      }),
    );
  }

  removeTratamiento(index: number): void {
    this.createLegajoTratamientos.removeAt(index);
  }

  queueCreateAdjuntos(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (!files.length) {
      return;
    }
    this.createLegajoAdjuntos.update((current) => [...current, ...files]);
    if (input) {
      input.value = '';
    }
  }

  removeCreateAdjunto(index: number): void {
    this.createLegajoAdjuntos.update((files) => files.filter((_, fileIndex) => fileIndex !== index));
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
    if (!consultorioId || !pacienteId || !sesionId || !window.confirm('Se eliminará el adjunto seleccionado.')) {
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
        return 'Sesión';
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
      casos: this.historiaSvc.getCasosPorPaciente(consultorioId, pacienteId),
    }).subscribe({
      next: ({ diagnosticos, sesiones, casos }) => {
        this.diagnosticos.set(diagnosticos);
        this.sesiones.set(sesiones);
        this.casosClinicos.set(casos);
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

  private ensureBackgroundData(onLoaded?: () => void, force = false): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) {
      return;
    }
    if (!force && (this.backgroundStatus() === 'loading' || this.backgroundStatus() === 'success')) {
      onLoaded?.();
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
        onLoaded?.();
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
    this.casosClinicos.set([]);
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
    const legajoDirty =
      this.showLegajoModal() &&
      (this.createLegajoForm.dirty ||
        this.createLegajoAntecedentes.dirty ||
        this.createLegajoTratamientos.dirty ||
        this.createLegajoAdjuntos().length > 0);
    const sesionDirty = this.showSesionDrawer() && this.sesionForm.dirty;
    const casoDirty = this.showCasoDrawer() && (this.casoForm.dirty || this.casoDerivacionAdjuntos().length > 0);
    const antecedentesDirty = this.showAntecedentesDrawer() && this.antecedentesForm.dirty;
    return legajoDirty || sesionDirty || casoDirty || antecedentesDirty;
  }

  private hasLegajoWizardDraft(): boolean {
    return (
      this.showLegajoModal() &&
      (this.createLegajoForm.dirty ||
        this.createLegajoAntecedentes.dirty ||
        this.createLegajoTratamientos.dirty ||
        this.createLegajoAdjuntos().length > 0)
    );
  }

  private validateLegajoStep(step: LegajoWizardStep): boolean {
    return this.canProceedFromLegajoStep(step, true);
  }

  canNavigateToLegajoStep(step: LegajoWizardStep): boolean {
    const current = this.createLegajoStep();
    if (step <= current) {
      return true;
    }
    for (let cursor = current; cursor < step; cursor += 1) {
      if (!this.canProceedFromLegajoStep(cursor as LegajoWizardStep, false)) {
        return false;
      }
    }
    return true;
  }

  private canProceedFromLegajoStep(step: LegajoWizardStep, markTouched: boolean): boolean {
    const controls = this.legajoStepControls(step);
    if (markTouched) {
      controls.forEach((control) => control.markAsTouched());
    }
    controls.forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
    if (!controls.every((control) => control.valid)) {
      return false;
    }
    if (step === 0) {
      const raw = this.createLegajoForm.getRawValue();
      if (raw.tipoIngreso === 'CONSULTA_PARTICULAR') {
        return !!this.emptyToUndefined(raw.motivoConsultaBreve);
      }
      return !!(
        this.emptyToUndefined(raw.motivoConsultaBreve) ||
        this.emptyToUndefined(raw.diagnosticoCodigo) ||
        this.emptyToUndefined(raw.profesionalDerivante) ||
        this.emptyToUndefined(raw.especialidadDerivante) ||
        raw.fechaPrescripcion ||
        this.createLegajoAdjuntos().length
      );
    }
    if (step === 2) {
      this.createLegajoForm.controls.planCantidadSesiones.markAsTouched();
      this.createLegajoForm.controls.planCaracterCaso.markAsTouched();
      this.createLegajoForm.controls.planCantidadSesiones.updateValueAndValidity({ emitEvent: false });
      this.createLegajoForm.controls.planCaracterCaso.updateValueAndValidity({ emitEvent: false });
      return (
        this.createLegajoForm.controls.planCantidadSesiones.valid &&
        this.createLegajoForm.controls.planCaracterCaso.valid &&
        this.buildTratamientosPayload().length > 0
      );
    }
    return true;
  }

  private legajoStepControls(step: LegajoWizardStep): Array<FormControl<string>> {
    switch (step) {
      case 0:
        return [
          this.createLegajoForm.controls.profesionalId,
          this.createLegajoForm.controls.fechaHora,
        ];
      case 1:
        return [];
      case 2:
        return [];
      default:
        return [];
    }
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
    return value === 'summary' || value === 'cases' || value === 'timeline'
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
    this.casoForm.controls.profesionalResponsableId.setValue(profesionalId, { emitEvent: false });
  }

  protected defaultProfesionalId(): string {
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
      categoryCode: new FormControl(item?.categoryCode ?? '', { nonNullable: true }),
      catalogItemCode: new FormControl(item?.catalogItemCode ?? '', { nonNullable: true }),
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
    items.forEach((item) => array.push(this.createAntecedenteGroup(item)));
  }

  private buildAntecedentesPayload(array: FormArray): HistoriaClinicaAntecedenteItem[] {
    return array.controls
      .map((control) => control.getRawValue())
      .map((item) => ({
        categoryCode: this.emptyToUndefined(item.categoryCode) ?? null,
        catalogItemCode: this.emptyToUndefined(item.catalogItemCode) ?? null,
        label: (item.label ?? '').trim(),
        valueText: this.emptyToUndefined(item.valueText) ?? null,
        critical: !!item.critical,
        notes: this.emptyToUndefined(item.notes) ?? null,
      }))
      .filter((item) => !!item.label);
  }

  private createTratamientoGroup(item?: Partial<{
    tratamientoId: string;
    tratamientoNombre: string;
    requiereAutorizacion: boolean;
  }>): FormGroup {
    return new FormGroup({
      tratamientoId: new FormControl(item?.tratamientoId ?? '', { nonNullable: true, validators: [Validators.required] }),
      tratamientoNombre: new FormControl(item?.tratamientoNombre ?? '', { nonNullable: true }),
      requiereAutorizacion: new FormControl(item?.requiereAutorizacion ?? false, { nonNullable: true }),
    });
  }

  private resetTratamientoArray(): void {
    while (this.createLegajoTratamientos.length) {
      this.createLegajoTratamientos.removeAt(0);
    }
  }

  private buildTratamientosPayload() {
    const rawPlan = this.createLegajoForm.getRawValue();
    const cantidadSesiones = Number(rawPlan.planCantidadSesiones ?? 0);
    const caracterCaso = rawPlan.planCaracterCaso;
    const observaciones = this.emptyToUndefined(rawPlan.planObservacionesGenerales) ?? null;
    return this.createLegajoTratamientos.controls
      .map((control) => control.getRawValue())
      .map((item) => ({
        tratamientoId: (item.tratamientoId ?? '').trim(),
        cantidadSesiones,
        frecuenciaSugerida: null,
        caracterCaso: caracterCaso as PlanTratamientoCaracter,
        fechaEstimadaInicio: null,
        requiereAutorizacion: !!item.requiereAutorizacion,
        observaciones,
        observacionesAdministrativas: null,
      }))
      .filter((item) => !!item.tratamientoId && item.cantidadSesiones > 0 && !!item.caracterCaso);
  }

  private buildEvaluacionPayload(raw: ReturnType<FormGroup['getRawValue']>) {
    const payload = {
      peso: this.toNumberOrNull((raw as any).peso),
      altura: this.toNumberOrNull((raw as any).altura),
    };
    return Object.values(payload).some((value) => value !== null && value !== undefined)
      ? payload
      : null;
  }

  private finishCreateAtencionInicial(): void {
    this.isSavingLegajo.set(false);
    this.showLegajoCloseConfirm.set(false);
    this.showLegajoModal.set(false);
    this.createLegajoAdjuntos.set([]);
    this.toast.success('Atención inicial registrada.');
    this.reloadSelectedPatient();
  }

  private loadAntecedenteCatalog(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    if (!consultorioId) {
      return;
    }
    this.antecedenteCatalogSvc
      .get(consultorioId)
      .pipe(catchError(() => of(null)))
      .subscribe((catalog) => {
        this.antecedenteCatalogCategories.set(catalog?.categories ?? []);
      });
  }

  private loadTratamientoCatalog(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    if (!consultorioId) {
      return;
    }
    this.tratamientoCatalogSvc
      .get(consultorioId)
      .pipe(catchError(() => of(null)))
      .subscribe((catalog) => {
        this.treatmentCatalogItems.set(catalog?.tratamientos ?? []);
        this.treatmentCatalogCategorias.set(catalog?.categorias ?? []);
        this.treatmentCatalogTipos.set(catalog?.tipos ?? []);
      });
  }

  treatmentTypeLabel(tipo: TratamientoCatalogTipo | string | null | undefined): string {
    return tipo === 'TECNICA' ? 'Tecnica' : 'Prestacion principal';
  }

  resolveTreatmentCategoryName(categoriaCodigo: string | null | undefined): string {
    if (!categoriaCodigo) {
      return 'Sin categoría';
    }
    return this.treatmentCatalogCategorias().find((item) => item.codigo === categoriaCodigo)?.nombre ?? categoriaCodigo;
  }

  resolveTreatmentCatalogItem(codigoInterno: string | null | undefined): TratamientoCatalogItem | null {
    if (!codigoInterno) {
      return null;
    }
    return this.treatmentCatalogItems().find((item) => item.codigoInterno === codigoInterno) ?? null;
  }

  selectedTreatmentCodes(): string[] {
    return this.createLegajoTratamientos.controls
      .map((control) => control.get('tratamientoId')?.value as string)
      .filter((value) => value.trim().length > 0);
  }

  private loadDiagnosticosMedicos(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    if (!consultorioId) {
      return;
    }
    this.diagnosticosMedicosSvc
      .get(consultorioId)
      .pipe(catchError(() => of(null)))
      .subscribe((maestro) => {
        this.diagnosticosMedicos.set(maestro?.diagnosticos ?? []);
        this.diagnosticosMedicosCategorias.set(maestro?.categorias ?? []);
        this.diagnosticosMedicosTipos.set(maestro?.tipos ?? []);
      });
  }

  private validateCasoStepOne(): boolean {
    const tipoOrigenControl = this.casoForm.controls.tipoOrigen;
    const motivoControl = this.casoForm.controls.motivoConsultaDetalle;
    const derivacionControl = this.casoForm.controls.derivadoPorInstitucion;

    tipoOrigenControl.markAsTouched();

    if (!tipoOrigenControl.valid) {
      return false;
    }

    if (tipoOrigenControl.value === 'CONSULTA_DIRECTA') {
      motivoControl.markAsTouched();
      return !!this.emptyToUndefined(motivoControl.value);
    }

    derivacionControl.markAsTouched();
    return !!this.emptyToUndefined(derivacionControl.value);
  }

  updateCasoDiagnosticos(codes: string[]): void {
    this.casoDiagnosticoCodes.set(codes);
    this.casoForm.controls.diagnosticoCodigo.setValue(codes[0] ?? '', { emitEvent: false });
    this.casoForm.controls.diagnosticoCodigo.markAsDirty();
  }

  removeCasoDiagnostico(code: string): void {
    this.updateCasoDiagnosticos(this.casoDiagnosticoCodes().filter((item) => item !== code));
  }

  queueCasoDerivacionAdjuntos(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (!files.length) {
      return;
    }
    const validFiles: File[] = [];
    for (const file of files) {
      if (!this.isCasoDerivacionFileAllowed(file)) {
        this.toast.error(`El archivo "${file.name}" no tiene un formato permitido.`);
        continue;
      }
      if (file.size > HistoriaClinicaPacientePage.CASO_DERIVACION_MAX_BYTES) {
        this.toast.error(`El archivo "${file.name}" supera el máximo permitido de 10 MB.`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length) {
      this.casoDerivacionAdjuntos.update((current) => [...current, ...validFiles]);
    }
    if (input) {
      input.value = '';
    }
  }

  removeCasoDerivacionAdjunto(index: number): void {
    this.casoDerivacionAdjuntos.update((files) => files.filter((_, fileIndex) => fileIndex !== index));
  }

  private resolveDiagnosticoNombres(codigosInternos: string[]): string[] {
    if (!codigosInternos.length) {
      return [];
    }
    const codes = new Set(codigosInternos);
    return this.diagnosticosMedicos()
      .filter((item) => codes.has(item.codigoInterno))
      .map((item) => item.nombre);
  }

  resolveDiagnosticoCategoriaName(categoriaCodigo: string | null | undefined): string {
    if (!categoriaCodigo) {
      return 'Sin categoría';
    }
    return this.diagnosticosMedicosCategorias().find((item) => item.codigo === categoriaCodigo)?.nombre ?? categoriaCodigo;
  }

  private buildCasoTratamientoResumen(params: {
    treatmentName: string | null;
    cantidadSesiones: string;
    tratamientoObservacion?: string;
  }): string | null {
    const segments = [
      params.treatmentName ? `Tratamiento inicial: ${params.treatmentName}` : null,
      this.emptyToUndefined(params.cantidadSesiones) ? `Cantidad de sesiones: ${params.cantidadSesiones}` : null,
      params.tratamientoObservacion ? `Observación: ${params.tratamientoObservacion}` : null,
    ].filter((segment): segment is string => !!segment);

    return segments.length ? segments.join('. ') : null;
  }

  private finishCasoSave(successMessage: string): void {
    this.isSavingCaso.set(false);
    this.showCasoDrawer.set(false);
    this.casoDerivacionAdjuntos.set([]);
    this.casoDiagnosticoCodes.set([]);
    this.toast.success(successMessage);
    this.reloadSelectedPatient();
  }

  private focusCasoFirstField(): void {
    setTimeout(() => {
      if (this.casoResponsableSelect?.nativeElement) {
        this.casoResponsableSelect.nativeElement.focus();
        return;
      }
      this.casoOriginDirectButton?.nativeElement?.focus();
    });
  }

  private isCasoDerivacionFileAllowed(file: File): boolean {
    const normalizedType = (file.type || '').toLowerCase();
    if (HistoriaClinicaPacientePage.CASO_DERIVACION_ALLOWED_TYPES.has(normalizedType)) {
      return true;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension);
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toIntOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
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

  private suggestedActionLabel(): string {
    switch (this.screenState()) {
      case 'no-history':
        return 'Registrar historia clínica';
      case 'history-no-case':
        return 'Abrir caso clínico';
      case 'history-active-case':
        return this.overview()?.ultimaSesion ? 'Nueva sesión' : 'Registrar sesión inicial';
      default:
        return 'Buscar paciente';
    }
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Sin sesiones';
    }
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
