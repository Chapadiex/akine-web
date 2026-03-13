import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../core/error/error-mapper.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import {
  DiagnosticoMedicoCategoria,
  DiagnosticoMedicoItem,
  DiagnosticoMedicoTipo,
} from '../consultorios/models/diagnosticos-medicos.models';
import { DiagnosticosMedicosService } from '../consultorios/services/diagnosticos-medicos.service';
import { PacienteSearchResult } from '../pacientes/models/paciente.models';
import { PacienteService } from '../pacientes/services/paciente.service';
import { DiagnosticoMedicoSelectorComponent } from './components/diagnostico-medico-selector/diagnostico-medico-selector';
import {
  DiagnosticoClinicoResponse,
  HistoriaClinicaPaciente,
  HistoriaClinicaSesionEstado,
  HistoriaClinicaTipoAtencion,
  HistoriaClinicaWorkspace,
  HistoriaClinicaWorkspaceItem,
  SesionClinicaResponse,
} from './models/historia-clinica.models';
import { HistoriaClinicaService } from './services/historia-clinica.service';

type ViewState = 'idle' | 'loading' | 'success' | 'error';

type RouteState = {
  pacienteId?: string;
  sesionId?: string;
  q?: string;
  profesionalId?: string;
  from?: string;
  to?: string;
  estado?: HistoriaClinicaSesionEstado;
};

const WORKSPACE_PAGE_SIZE = 10;
const TIMELINE_PAGE_SIZE = 100;

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, DiagnosticoMedicoSelectorComponent],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoriaClinica {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly consultorioCtx = inject(ConsultorioContextService);
  private readonly pacienteSvc = inject(PacienteService);
  private readonly historiaSvc = inject(HistoriaClinicaService);
  private readonly diagnosticosMedicosSvc = inject(DiagnosticosMedicosService);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);

  readonly workspace = signal<HistoriaClinicaWorkspace | null>(null);
  readonly workspaceStatus = signal<ViewState>('idle');
  readonly workspaceError = signal<string | null>(null);
  readonly workspacePage = signal(0);

  readonly selectedPatient = signal<HistoriaClinicaPaciente | null>(null);
  readonly selectedSesion = signal<SesionClinicaResponse | null>(null);
  readonly sesiones = signal<SesionClinicaResponse[]>([]);
  readonly diagnosticos = signal<DiagnosticoClinicoResponse[]>([]);
  readonly diagnosticosMedicos = signal<DiagnosticoMedicoItem[]>([]);
  readonly diagnosticosMedicosCategorias = signal<DiagnosticoMedicoCategoria[]>([]);
  readonly diagnosticosMedicosTipos = signal<DiagnosticoMedicoTipo[]>([]);
  readonly detailStatus = signal<ViewState>('idle');
  readonly detailError = signal<string | null>(null);

  readonly patientMatches = signal<PacienteSearchResult[]>([]);
  readonly routeState = signal<RouteState>({});
  readonly isSavingSesion = signal(false);
  readonly isSavingDiagnostico = signal(false);
  readonly isUploadingAdjunto = signal(false);

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    profesionalId: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    estado: new FormControl('', { nonNullable: true }),
  });

  readonly patientSearchControl = new FormControl('', { nonNullable: true });

  readonly sesionForm = new FormGroup({
    profesionalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    turnoId: new FormControl('', { nonNullable: true }),
    boxId: new FormControl('', { nonNullable: true }),
    fechaAtencion: new FormControl(this.nowForInput(), { nonNullable: true, validators: [Validators.required] }),
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

  readonly diagnosticoForm = new FormGroup({
    profesionalId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    diagnosticoCodigo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fechaInicio: new FormControl(this.todayForInput(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notas: new FormControl('', { nonNullable: true }),
  });

  readonly tipoAtencionOptions: ReadonlyArray<{ value: HistoriaClinicaTipoAtencion; label: string }> = [
    { value: 'EVALUACION', label: 'Evaluación' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'TRATAMIENTO', label: 'Tratamiento' },
    { value: 'INTERCONSULTA', label: 'Interconsulta' },
    { value: 'OTRO', label: 'Otro' },
  ];

  readonly estadoOptions: ReadonlyArray<{ value: HistoriaClinicaSesionEstado; label: string }> = [
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'CERRADA', label: 'Cerrada' },
    { value: 'ANULADA', label: 'Anulada' },
  ];

  readonly canEditSesion = computed(() => {
    const patient = this.selectedPatient();
    const sesion = this.selectedSesion();
    return !!patient && (!sesion || sesion.estado === 'BORRADOR');
  });

  readonly activeDiagnosticos = computed(() =>
    this.diagnosticos().filter((diagnostico) => diagnostico.estado === 'ACTIVO'),
  );

  readonly professionalOptions = computed(() => this.workspace()?.profesionales ?? []);
  readonly canGoPrevPage = computed(() => this.workspacePage() > 0);
  readonly canGoNextPage = computed(() => {
    const snapshot = this.workspace();
    return !!snapshot && (this.workspacePage() + 1) * WORKSPACE_PAGE_SIZE < snapshot.total;
  });
  readonly patientSummary = computed(() => {
    const patient = this.selectedPatient();
    return patient ? `${patient.apellido}, ${patient.nombre}` : null;
  });

  constructor() {
    this.setDefaultProfessionals();

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
      .subscribe(([consultorioId, queryParamMap]) => this.hydrateFromRoute(consultorioId, queryParamMap));
  }

  applyFilters(): void {
    const raw = this.filterForm.getRawValue();
    this.navigateWithState({
      pacienteId: this.routeState().pacienteId,
      sesionId: this.routeState().sesionId,
      q: this.emptyToUndefined(raw.q),
      profesionalId: this.emptyToUndefined(raw.profesionalId),
      from: this.emptyToUndefined(raw.from),
      to: this.emptyToUndefined(raw.to),
      estado: this.emptyToUndefined(raw.estado) as HistoriaClinicaSesionEstado | undefined,
    });
  }

  clearFilters(): void {
    this.filterForm.reset({ q: '', profesionalId: '', from: '', to: '', estado: '' }, { emitEvent: false });
    this.navigateWithState({
      pacienteId: this.routeState().pacienteId,
      sesionId: this.routeState().sesionId,
    });
  }

  selectPatient(match: PacienteSearchResult): void {
    this.patientSearchControl.setValue(`${match.apellido}, ${match.nombre}`, { emitEvent: false });
    this.patientMatches.set([]);
    this.navigateWithState({
      ...this.routeState(),
      pacienteId: match.id,
      sesionId: undefined,
    });
  }

  clearSelectedPatient(): void {
    this.patientSearchControl.setValue('', { emitEvent: false });
    this.patientMatches.set([]);
    this.navigateWithState({
      ...this.routeState(),
      pacienteId: undefined,
      sesionId: undefined,
    });
  }

  selectWorkspaceItem(item: HistoriaClinicaWorkspaceItem): void {
    this.navigateWithState({
      ...this.routeState(),
      pacienteId: item.pacienteId,
      sesionId: item.sesionId,
    });
  }

  goToPrevPage(): void {
    if (this.canGoPrevPage()) {
      this.loadWorkspace(this.consultorioCtx.selectedConsultorioId(), this.routeState(), this.workspacePage() - 1);
    }
  }

  goToNextPage(): void {
    if (this.canGoNextPage()) {
      this.loadWorkspace(this.consultorioCtx.selectedConsultorioId(), this.routeState(), this.workspacePage() + 1);
    }
  }

  startNewSesion(pushQuery = true): void {
    if (!this.selectedPatient()) return;
    this.selectedSesion.set(null);
    this.sesionForm.reset(
      {
        profesionalId: this.defaultProfesionalId(),
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
    this.syncSessionFormState();
    if (pushQuery) {
      this.navigateWithState({ ...this.routeState(), sesionId: undefined });
    }
  }

  openSesion(sesionId: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) return;

    this.detailStatus.set('loading');
    this.historiaSvc.getSesion(consultorioId, pacienteId, sesionId).subscribe({
      next: (sesion) => {
        this.selectedSesion.set(sesion);
        this.patchSesionForm(sesion);
        this.syncSessionFormState();
        this.detailStatus.set('success');
        this.detailError.set(null);
        if (this.routeState().sesionId !== sesion.id) {
          this.navigateWithState({ ...this.routeState(), sesionId: sesion.id });
        }
      },
      error: (err) => {
        this.detailStatus.set('error');
        this.detailError.set(this.errMap.toMessage(err));
      },
    });
  }

  saveSesion(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) return;
    if (this.sesionForm.invalid) {
      this.sesionForm.markAllAsTouched();
      return;
    }

    const request = this.buildSesionRequest();
    if (!request) return;

    this.isSavingSesion.set(true);
    const selectedSesion = this.selectedSesion();
    const operation = selectedSesion
      ? this.historiaSvc.updateSesion(consultorioId, pacienteId, selectedSesion.id, request)
      : this.historiaSvc.createSesion(consultorioId, pacienteId, request);

    operation.subscribe({
      next: (sesion) => {
        this.isSavingSesion.set(false);
        this.toast.success(selectedSesion ? 'Sesión actualizada.' : 'Sesión creada.');
        if (selectedSesion) {
          this.reloadPatientContext(sesion.id);
        } else {
          this.navigateWithState({ ...this.routeState(), pacienteId, sesionId: sesion.id });
        }
      },
      error: (err) => {
        this.isSavingSesion.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  closeSesion(): void {
    this.changeSesionState('close');
  }

  annulSesion(): void {
    if (window.confirm('Esta acción marcará la sesión como anulada.')) {
      this.changeSesionState('annul');
    }
  }

  createDiagnostico(): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) return;
    if (this.diagnosticoForm.invalid) {
      this.diagnosticoForm.markAllAsTouched();
      return;
    }

    const raw = this.diagnosticoForm.getRawValue();
    this.isSavingDiagnostico.set(true);
    this.historiaSvc
      .createDiagnostico(consultorioId, pacienteId, {
        profesionalId: raw.profesionalId,
        sesionId: this.selectedSesion()?.id ?? null,
        diagnosticoCodigo: raw.diagnosticoCodigo,
        fechaInicio: raw.fechaInicio,
        notas: this.emptyToUndefined(raw.notas) ?? null,
      })
      .subscribe({
        next: () => {
          this.isSavingDiagnostico.set(false);
          this.toast.success('Diagnóstico agregado.');
          this.resetDiagnosticoForm();
          this.loadDiagnosticos(consultorioId, pacienteId);
        },
        error: (err) => {
          this.isSavingDiagnostico.set(false);
          this.toast.error(this.errMap.toMessage(err));
        },
      });
  }

  resolveDiagnostico(diagnostico: DiagnosticoClinicoResponse): void {
    this.changeDiagnosticoState(diagnostico, 'resolver');
  }

  discardDiagnostico(diagnostico: DiagnosticoClinicoResponse): void {
    this.changeDiagnosticoState(diagnostico, 'descartar');
  }

  uploadAdjunto(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const sesionId = this.selectedSesion()?.id;
    if (!file || !consultorioId || !pacienteId || !sesionId) return;
    if (!this.canEditSesion()) {
      this.toast.warning('Solo se pueden cargar adjuntos en sesiones en borrador.');
      if (input) input.value = '';
      return;
    }

    this.isUploadingAdjunto.set(true);
    this.historiaSvc.uploadAdjunto(consultorioId, pacienteId, sesionId, file).subscribe({
      next: () => {
        this.isUploadingAdjunto.set(false);
        if (input) input.value = '';
        this.toast.success('Adjunto cargado.');
        this.openSesion(sesionId);
      },
      error: (err) => {
        this.isUploadingAdjunto.set(false);
        if (input) input.value = '';
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  downloadAdjunto(adjuntoId: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) return;

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
    if (!consultorioId || !pacienteId || !sesionId) return;
    if (!this.canEditSesion()) {
      this.toast.warning('Solo se pueden eliminar adjuntos en sesiones en borrador.');
      return;
    }
    if (!window.confirm('Se eliminará el adjunto seleccionado.')) return;

    this.historiaSvc.deleteAdjunto(consultorioId, pacienteId, adjuntoId).subscribe({
      next: () => {
        this.toast.success('Adjunto eliminado.');
        this.openSesion(sesionId);
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  formatPaciente(item: PacienteSearchResult): string {
    return `${item.apellido}, ${item.nombre}`;
  }

  estadoLabel(estado?: HistoriaClinicaSesionEstado | null): string {
    const value = estado ?? '';
    return this.estadoOptions.find((option) => option.value === value)?.label ?? value;
  }

  tipoLabel(tipo?: HistoriaClinicaTipoAtencion | null): string {
    const value = tipo ?? '';
    return this.tipoAtencionOptions.find((option) => option.value === value)?.label ?? value;
  }

  humanFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
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

  private hydrateFromRoute(consultorioId: string, queryParamMap: ParamMap): void {
    const nextState: RouteState = {
      pacienteId: this.readQueryParam(queryParamMap, 'pacienteId'),
      sesionId: this.readQueryParam(queryParamMap, 'sesionId'),
      q: this.readQueryParam(queryParamMap, 'q'),
      profesionalId: this.readQueryParam(queryParamMap, 'profesionalId'),
      from: this.readQueryParam(queryParamMap, 'from'),
      to: this.readQueryParam(queryParamMap, 'to'),
      estado: this.readEstado(queryParamMap.get('estado')),
    };

    this.routeState.set(nextState);
    this.workspacePage.set(0);
    this.filterForm.reset(
      {
        q: nextState.q ?? '',
        profesionalId: nextState.profesionalId ?? '',
        from: nextState.from ?? '',
        to: nextState.to ?? '',
        estado: nextState.estado ?? '',
      },
      { emitEvent: false },
    );

    if (!consultorioId) {
      this.workspaceStatus.set('idle');
      this.workspace.set(null);
      this.resetPatientContext();
      return;
    }

    this.loadDiagnosticosMedicos(consultorioId);
    this.loadWorkspace(consultorioId, nextState, 0);
    nextState.pacienteId ? this.loadPatientContext(consultorioId, nextState) : this.resetPatientContext();
  }

  private loadWorkspace(consultorioId: string, state: RouteState, page: number): void {
    if (!consultorioId) return;
    this.workspaceStatus.set('loading');
    this.workspaceError.set(null);
    this.historiaSvc
      .getWorkspace(consultorioId, {
        pacienteId: state.pacienteId,
        q: state.q,
        profesionalId: state.profesionalId,
        from: state.from,
        to: state.to,
        estado: state.estado,
        page,
        size: WORKSPACE_PAGE_SIZE,
      })
      .subscribe({
        next: (workspace) => {
          this.workspace.set(workspace);
          this.workspacePage.set(page);
          this.workspaceStatus.set('success');
        },
        error: (err) => {
          this.workspaceStatus.set('error');
          this.workspaceError.set(this.errMap.toMessage(err));
        },
      });
  }

  private loadPatientContext(consultorioId: string, state: RouteState): void {
    if (!consultorioId || !state.pacienteId) return;
    this.detailStatus.set('loading');
    this.detailError.set(null);

    forkJoin({
      patient: this.historiaSvc.getPaciente(consultorioId, state.pacienteId),
      diagnosticos: this.historiaSvc.listDiagnosticos(consultorioId, state.pacienteId),
      sesiones: this.historiaSvc.listSesiones(consultorioId, state.pacienteId, {
        profesionalId: state.profesionalId,
        from: state.from,
        to: state.to,
        estado: state.estado,
        page: 0,
        size: TIMELINE_PAGE_SIZE,
      }),
    }).subscribe({
      next: ({ patient, diagnosticos, sesiones }) => {
        this.selectedPatient.set(patient);
        this.diagnosticos.set(diagnosticos);
        this.sesiones.set(sesiones);
        this.detailStatus.set('success');
        this.patientSearchControl.setValue(`${patient.apellido}, ${patient.nombre}`, { emitEvent: false });
        this.patientMatches.set([]);
        this.resetDiagnosticoForm();

        const targetSesionId = state.sesionId ?? sesiones[0]?.id;
        targetSesionId ? this.openSesion(targetSesionId) : this.startNewSesion(false);
      },
      error: (err) => {
        this.detailStatus.set('error');
        this.detailError.set(this.errMap.toMessage(err));
      },
    });
  }

  private loadDiagnosticos(consultorioId: string, pacienteId: string): void {
    this.historiaSvc.listDiagnosticos(consultorioId, pacienteId).subscribe({
      next: (items) => this.diagnosticos.set(items),
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private reloadPatientContext(sesionId?: string): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const state = this.routeState();
    if (!consultorioId || !state.pacienteId) return;
    this.loadWorkspace(consultorioId, state, this.workspacePage());
    this.loadPatientContext(consultorioId, { ...state, sesionId: sesionId ?? state.sesionId });
  }

  private changeSesionState(action: 'close' | 'annul'): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    const sesionId = this.selectedSesion()?.id;
    if (!consultorioId || !pacienteId || !sesionId) return;

    this.isSavingSesion.set(true);
    const operation =
      action === 'close'
        ? this.historiaSvc.closeSesion(consultorioId, pacienteId, sesionId)
        : this.historiaSvc.annulSesion(consultorioId, pacienteId, sesionId);

    operation.subscribe({
      next: (sesion) => {
        this.isSavingSesion.set(false);
        this.toast.info(action === 'close' ? 'Sesión cerrada.' : 'Sesión anulada.');
        this.selectedSesion.set(sesion);
        this.patchSesionForm(sesion);
        this.syncSessionFormState();
        this.reloadPatientContext(sesion.id);
      },
      error: (err) => {
        this.isSavingSesion.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private changeDiagnosticoState(diagnostico: DiagnosticoClinicoResponse, action: 'resolver' | 'descartar'): void {
    const consultorioId = this.consultorioCtx.selectedConsultorioId();
    const pacienteId = this.selectedPatient()?.id;
    if (!consultorioId || !pacienteId) return;
    if (
      !window.confirm(
        action === 'resolver'
          ? 'Se marcará el diagnóstico como resuelto.'
          : 'Se marcará el diagnóstico como descartado.',
      )
    ) {
      return;
    }

    this.isSavingDiagnostico.set(true);
    const request = { fechaFin: this.todayForInput() };
    const operation =
      action === 'resolver'
        ? this.historiaSvc.resolveDiagnostico(consultorioId, pacienteId, diagnostico.id, request)
        : this.historiaSvc.discardDiagnostico(consultorioId, pacienteId, diagnostico.id, request);

    operation.subscribe({
      next: () => {
        this.isSavingDiagnostico.set(false);
        this.toast.info(action === 'resolver' ? 'Diagnóstico resuelto.' : 'Diagnóstico descartado.');
        this.loadDiagnosticos(consultorioId, pacienteId);
      },
      error: (err) => {
        this.isSavingDiagnostico.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
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

  private syncSessionFormState(): void {
    this.canEditSesion()
      ? this.sesionForm.enable({ emitEvent: false })
      : this.sesionForm.disable({ emitEvent: false });
  }

  private buildSesionRequest() {
    const raw = this.sesionForm.getRawValue();
    if (!raw.profesionalId || !raw.fechaAtencion || !raw.tipoAtencion) return null;
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

  private resetPatientContext(): void {
    this.selectedPatient.set(null);
    this.selectedSesion.set(null);
    this.sesiones.set([]);
    this.diagnosticos.set([]);
    this.detailStatus.set('idle');
    this.detailError.set(null);
    this.patientMatches.set([]);
    this.sesionForm.reset(
      {
        profesionalId: this.defaultProfesionalId(),
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
    this.resetDiagnosticoForm();
  }

  private resetDiagnosticoForm(): void {
    this.diagnosticoForm.reset(
      {
        profesionalId: this.defaultProfesionalId(),
        diagnosticoCodigo: '',
        fechaInicio: this.todayForInput(),
        notas: '',
      },
      { emitEvent: false },
    );
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
        q: state.q ?? null,
        profesionalId: state.profesionalId ?? null,
        from: state.from ?? null,
        to: state.to ?? null,
        estado: state.estado ?? null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private readQueryParam(queryParamMap: ParamMap, key: string): string | undefined {
    const value = queryParamMap.get(key)?.trim() ?? '';
    return value || undefined;
  }

  private readEstado(value: string | null): HistoriaClinicaSesionEstado | undefined {
    return this.estadoOptions.some((option) => option.value === value)
      ? (value as HistoriaClinicaSesionEstado)
      : undefined;
  }

  private defaultProfesionalId(): string {
    return this.auth.currentUser()?.profesionalId ?? '';
  }

  private setDefaultProfessionals(): void {
    const profesionalId = this.defaultProfesionalId();
    if (!profesionalId) return;
    this.sesionForm.controls.profesionalId.setValue(profesionalId, { emitEvent: false });
    this.diagnosticoForm.controls.profesionalId.setValue(profesionalId, { emitEvent: false });
  }

  private loadDiagnosticosMedicos(consultorioId: string | null | undefined): void {
    if (!consultorioId) return;
    this.diagnosticosMedicosSvc
      .get(consultorioId)
      .pipe(catchError(() => of(null)))
      .subscribe((maestro) => {
        this.diagnosticosMedicos.set(maestro?.diagnosticos ?? []);
        this.diagnosticosMedicosCategorias.set(maestro?.categorias ?? []);
        this.diagnosticosMedicosTipos.set(maestro?.tipos ?? []);
      });
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
