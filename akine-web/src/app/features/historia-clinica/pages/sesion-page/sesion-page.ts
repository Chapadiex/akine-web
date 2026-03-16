import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import {
  CasoAtencionSummary,
  HistoriaClinicaOverview,
  HistoriaClinicaTipoAtencion,
  SesionClinicaRequest,
  SesionClinicaResponse,
  SesionEvaluacionDTO,
  SesionExamenFisicoDTO,
  SesionIntervencionDTO,
} from '../../models/historia-clinica.models';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { TratamientoCatalogItem } from '../../../consultorios/models/tratamiento-catalog.models';
import { TratamientoCatalogService } from '../../../consultorios/services/tratamiento-catalog.service';
import { BloqueContextoComponent } from './bloque-contexto';
import { BloqueEvaluacionComponent } from './bloque-evaluacion';
import { BloqueTratamientoComponent } from './bloque-tratamiento';
import { BloqueResultadoComponent } from './bloque-resultado';
import { BloqueAdministrativoComponent } from './bloque-administrativo';
import { BloqueExamenFisicoComponent } from './bloque-examen-fisico';
import { BloqueEstadoActualComponent } from './bloque-estado-actual';
import { BloqueCierreExpressComponent } from './bloque-cierre-express';

type ViewState = 'idle' | 'loading' | 'success' | 'error';
type SessionMode = 'quick' | 'full' | 'readonly';
type SesionStep = 'evaluacion' | 'examen' | 'tratamiento' | 'resultado';

@Component({
  selector: 'app-sesion-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BloqueContextoComponent,
    BloqueEvaluacionComponent,
    BloqueTratamientoComponent,
    BloqueResultadoComponent,
    BloqueAdministrativoComponent,
    BloqueExamenFisicoComponent,
    BloqueEstadoActualComponent,
    BloqueCierreExpressComponent,
  ],
  templateUrl: './sesion-page.html',
  styleUrl: './sesion-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SesionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hcService = inject(HistoriaClinicaService);
  private readonly authService = inject(AuthService);
  private readonly ctx = inject(ConsultorioContextService);
  private readonly toast = inject(ToastService);
  private readonly errorMapper = inject(ErrorMapperService);
  private readonly tratamientoCatalogService = inject(TratamientoCatalogService);

  // ── State ──
  readonly status = signal<ViewState>('idle');
  readonly sesion = signal<SesionClinicaResponse | null>(null);
  readonly overview = signal<HistoriaClinicaOverview | null>(null);
  readonly casosClinicos = signal<CasoAtencionSummary[]>([]);
  readonly previousSesion = signal<SesionClinicaResponse | null>(null);
  readonly tratamientos = signal<TratamientoCatalogItem[]>([]);
  readonly isSaving = signal(false);
  readonly showExamenFisico = signal(false);
  readonly activeStep = signal<SesionStep>('evaluacion');
  readonly selectedMode = signal<'quick' | 'full'>('quick');

  readonly steps: ReadonlyArray<{ key: SesionStep; label: string; icon: string }> = [
    { key: 'evaluacion', label: 'Evaluación', icon: '1' },
    { key: 'examen', label: 'Examen físico', icon: '2' },
    { key: 'tratamiento', label: 'Tratamiento', icon: '3' },
    { key: 'resultado', label: 'Resultado', icon: '4' },
  ];

  private readonly autoSave$ = new Subject<void>();
  private pacienteId = '';
  private sesionId = '';

  // ── Computed ──
  readonly consultorioId = computed(() => this.ctx.selectedConsultorioId() ?? '');
  readonly paciente = computed(() => this.overview()?.paciente ?? null);
  readonly casoActivo = computed<CasoAtencionSummary | { descripcion: string } | null>(() => {
    const casoAtencionId = this.sesion()?.casoAtencionId;
    if (casoAtencionId) {
      const found = this.casosClinicos().find((c) => c.id === casoAtencionId);
      if (found) return found;
    }
    const primerCaso = this.casosClinicos()[0];
    if (primerCaso) return primerCaso;
    return this.overview()?.casosActivos?.[0] ?? null;
  });
  readonly isEditable = computed(() => this.sesion()?.estado === 'BORRADOR');

  readonly sessionMode = computed<SessionMode>(() => {
    const s = this.sesion();
    if (!s || s.estado !== 'BORRADOR') return 'readonly';
    return this.selectedMode();
  });

  readonly sesionNumero = computed(() => {
    const caso = this.casosClinicos()[0];
    if (caso) return (caso.cantidadSesiones ?? 0) + 1;
    const o = this.overview();
    if (!o) return null;
    return (o.casosActivos?.[0]?.cantidadSesiones ?? 0) + 1;
  });

  // ── Evaluacion form (Block B + E) ──
  readonly evaluacionForm = new FormGroup({
    dolorIntensidad: new FormControl<number | null>(null),
    dolorZona: new FormControl(''),
    dolorLateralidad: new FormControl(''),
    dolorTipo: new FormControl(''),
    dolorComportamiento: new FormControl(''),
    evolucionEstado: new FormControl(''),
    evolucionNota: new FormControl(''),
    objetivoSesion: new FormControl(''),
    limitacionFuncional: new FormControl(''),
    respuestaPaciente: new FormControl(''),
    tolerancia: new FormControl(''),
    indicacionesDomiciliarias: new FormControl(''),
    proximaConducta: new FormControl(''),
  });

  // ── Examen fisico form (Block C) ──
  readonly examenFisicoForm = new FormGroup({
    rangoMovimientoJson: new FormControl(''),
    fuerzaMuscularJson: new FormControl(''),
    funcionalidadNota: new FormControl(''),
    marchaBalanceNota: new FormControl(''),
    signosInflamatorios: new FormControl(''),
    observacionesNeuroResp: new FormControl(''),
    testsMedidasJson: new FormControl(''),
  });

  // ── Intervenciones (Block D) ──
  readonly intervencionesForm = new FormArray<FormGroup>([]);

  // ── Session base form ──
  readonly baseForm = new FormGroup({
    profesionalId: new FormControl('', Validators.required),
    fechaAtencion: new FormControl('', Validators.required),
    tipoAtencion: new FormControl<HistoriaClinicaTipoAtencion>('SEGUIMIENTO', Validators.required),
    motivoConsulta: new FormControl(''),
    resumenClinico: new FormControl(''),
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.sesionId = params.get('sesionId') ?? '';
      this.pacienteId = this.route.snapshot.queryParamMap.get('pacienteId') ?? '';
      if (this.sesionId && this.pacienteId) {
        this.loadSession();
      }
    });

    // Autosave debounced
    this.autoSave$
      .pipe(debounceTime(2500), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.save(false));
  }

  private loadSession(): void {
    const cid = this.consultorioId();
    if (!cid) return;

    this.status.set('loading');

    forkJoin({
      sesion: this.hcService.getSesion(cid, this.pacienteId, this.sesionId),
      overview: this.hcService.getOverview(cid, this.pacienteId),
      tratamientosCatalog: this.tratamientoCatalogService.get(cid),
      casos: this.hcService.getCasosActivosPorPaciente(cid, this.pacienteId).pipe(catchError(() => of([]))),
    })
      .pipe(
        catchError((err) => {
          this.status.set('error');
          this.toast.error(this.errorMapper.toMessage(err));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        this.sesion.set(result.sesion);
        this.overview.set(result.overview);
        this.casosClinicos.set(result.casos);
        this.tratamientos.set(result.tratamientosCatalog.tratamientos ?? []);
        this.hydrateFormsFromSesion(result.sesion);
        this.loadPreviousSesion(cid);
        this.status.set('success');
      });
  }

  private loadPreviousSesion(cid: string): void {
    this.hcService
      .listSesiones(cid, this.pacienteId, { size: 2, estado: 'CERRADA' })
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((sesiones) => {
        const prev = sesiones.find((s) => s.id !== this.sesionId);
        this.previousSesion.set(prev ?? null);
      });
  }

  setMode(mode: 'quick' | 'full'): void {
    this.selectedMode.set(mode);
    if (mode === 'full') this.activeStep.set('evaluacion');
  }

  private hydrateFormsFromSesion(s: SesionClinicaResponse): void {
    // Derive initial mode from session type
    this.selectedMode.set(s.tipoAtencion === 'EVALUACION' ? 'full' : 'quick');

    // Base
    this.baseForm.patchValue({
      profesionalId: s.profesionalId,
      fechaAtencion: s.fechaAtencion,
      tipoAtencion: s.tipoAtencion,
      motivoConsulta: s.motivoConsulta ?? '',
      resumenClinico: s.resumenClinico ?? '',
    });

    // Block B+E
    if (s.evaluacionEstructurada) {
      this.evaluacionForm.patchValue({
        dolorIntensidad: s.evaluacionEstructurada.dolorIntensidad ?? null,
        dolorZona: s.evaluacionEstructurada.dolorZona ?? '',
        dolorLateralidad: s.evaluacionEstructurada.dolorLateralidad ?? '',
        dolorTipo: s.evaluacionEstructurada.dolorTipo ?? '',
        dolorComportamiento: s.evaluacionEstructurada.dolorComportamiento ?? '',
        evolucionEstado: s.evaluacionEstructurada.evolucionEstado ?? '',
        evolucionNota: s.evaluacionEstructurada.evolucionNota ?? '',
        objetivoSesion: s.evaluacionEstructurada.objetivoSesion ?? '',
        limitacionFuncional: s.evaluacionEstructurada.limitacionFuncional ?? '',
        respuestaPaciente: s.evaluacionEstructurada.respuestaPaciente ?? '',
        tolerancia: s.evaluacionEstructurada.tolerancia ?? '',
        indicacionesDomiciliarias: s.evaluacionEstructurada.indicacionesDomiciliarias ?? '',
        proximaConducta: s.evaluacionEstructurada.proximaConducta ?? '',
      });
    }

    // Block C
    if (s.examenFisico) {
      this.examenFisicoForm.patchValue({
        rangoMovimientoJson: s.examenFisico.rangoMovimientoJson ?? '',
        fuerzaMuscularJson: s.examenFisico.fuerzaMuscularJson ?? '',
        funcionalidadNota: s.examenFisico.funcionalidadNota ?? '',
        marchaBalanceNota: s.examenFisico.marchaBalanceNota ?? '',
        signosInflamatorios: s.examenFisico.signosInflamatorios ?? '',
        observacionesNeuroResp: s.examenFisico.observacionesNeuroResp ?? '',
        testsMedidasJson: s.examenFisico.testsMedidasJson ?? '',
      });
      this.showExamenFisico.set(true);
    }

    // Block D
    this.intervencionesForm.clear();
    if (s.intervenciones?.length) {
      for (const inv of s.intervenciones) {
        this.intervencionesForm.push(this.createIntervencionGroup(inv));
      }
    }

    // Disable forms if readonly
    if (s.estado !== 'BORRADOR') {
      this.baseForm.disable();
      this.evaluacionForm.disable();
      this.examenFisicoForm.disable();
      this.intervencionesForm.disable();
    }
  }

  createIntervencionGroup(data?: SesionIntervencionDTO): FormGroup {
    return new FormGroup({
      tratamientoId: new FormControl(data?.tratamientoId ?? ''),
      tratamientoNombre: new FormControl(data?.tratamientoNombre ?? '', Validators.required),
      tecnica: new FormControl(data?.tecnica ?? ''),
      zona: new FormControl(data?.zona ?? ''),
      parametrosJson: new FormControl(data?.parametrosJson ?? ''),
      duracionMinutos: new FormControl(data?.duracionMinutos ?? null),
      profesionalId: new FormControl(data?.profesionalId ?? ''),
      observaciones: new FormControl(data?.observaciones ?? ''),
      orderIndex: new FormControl(data?.orderIndex ?? this.intervencionesForm.length),
    });
  }

  addIntervencion(): void {
    this.intervencionesForm.push(this.createIntervencionGroup());
  }

  removeIntervencion(index: number): void {
    this.intervencionesForm.removeAt(index);
    this.triggerAutoSave();
  }

  triggerAutoSave(): void {
    if (!this.isEditable()) return;
    this.autoSave$.next();
  }

  toggleExamenFisico(): void {
    this.showExamenFisico.update((v) => !v);
  }

  setStep(step: SesionStep): void {
    this.activeStep.set(step);
  }

  nextStep(): void {
    const keys = this.steps.map((s) => s.key);
    const idx = keys.indexOf(this.activeStep());
    if (idx < keys.length - 1) {
      this.activeStep.set(keys[idx + 1]);
    }
  }

  prevStep(): void {
    const keys = this.steps.map((s) => s.key);
    const idx = keys.indexOf(this.activeStep());
    if (idx > 0) {
      this.activeStep.set(keys[idx - 1]);
    }
  }

  isFirstStep(): boolean {
    return this.activeStep() === this.steps[0].key;
  }

  isLastStep(): boolean {
    return this.activeStep() === this.steps[this.steps.length - 1].key;
  }

  isStepBefore(stepKey: SesionStep): boolean {
    const keys = this.steps.map((s) => s.key);
    return keys.indexOf(stepKey) < keys.indexOf(this.activeStep());
  }

  save(showToast = true): void {
    if (!this.isEditable()) return;
    const cid = this.consultorioId();
    if (!cid) return;

    this.isSaving.set(true);

    const base = this.baseForm.getRawValue();
    const eval_ = this.evaluacionForm.getRawValue();
    const examen = this.examenFisicoForm.getRawValue();
    const intervenciones: SesionIntervencionDTO[] = this.intervencionesForm.controls.map(
      (g, i) => ({ ...g.getRawValue(), orderIndex: i }),
    );

    const body: SesionClinicaRequest = {
      profesionalId: base.profesionalId!,
      fechaAtencion: base.fechaAtencion!,
      tipoAtencion: base.tipoAtencion!,
      motivoConsulta: base.motivoConsulta,
      resumenClinico: base.resumenClinico,
      evaluacionEstructurada: eval_ as SesionEvaluacionDTO,
      examenFisico: this.showExamenFisico() ? (examen as SesionExamenFisicoDTO) : null,
      intervenciones: intervenciones.length > 0 ? intervenciones : null,
    };

    this.hcService
      .updateSesion(cid, this.pacienteId, this.sesionId, body)
      .pipe(
        catchError((err) => {
          this.isSaving.set(false);
          if (showToast) this.toast.error(this.errorMapper.toMessage(err));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.isSaving.set(false);
        if (result) {
          this.sesion.set(result);
          if (showToast) this.toast.success('Sesión guardada');
        }
      });
  }

  closeSesion(): void {
    const cid = this.consultorioId();
    if (!cid) return;

    // Validate minimums before closing
    const eval_ = this.evaluacionForm.getRawValue();
    if (!eval_.respuestaPaciente || !eval_.proximaConducta) {
      this.toast.warning('Completá respuesta del paciente y próxima conducta antes de cerrar.');
      return;
    }

    this.isSaving.set(true);
    // First save, then close
    this.save(false);
    this.hcService
      .closeSesion(cid, this.pacienteId, this.sesionId)
      .pipe(
        catchError((err) => {
          this.isSaving.set(false);
          this.toast.error(this.errorMapper.toMessage(err));
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.isSaving.set(false);
        if (result) {
          this.sesion.set(result);
          this.toast.success('Sesión cerrada');
          this.baseForm.disable();
          this.evaluacionForm.disable();
          this.examenFisicoForm.disable();
          this.intervencionesForm.disable();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/app/historia-clinica'], {
      queryParams: { pacienteId: this.pacienteId },
    });
  }

  // ── Sidebar label helpers ──
  dolorNivel(v: number): 'high' | 'mid' | 'low' {
    if (v >= 7) return 'high';
    if (v >= 4) return 'mid';
    return 'low';
  }

  evolucionLabel(v: string): string {
    const m: Record<string, string> = { MEJOR: 'Mejor', IGUAL: 'Igual', PEOR: 'Peor' };
    return m[v] ?? v;
  }

  respuestaLabel(v: string): string {
    const m: Record<string, string> = {
      FAVORABLE: 'Favorable', SIN_CAMBIOS: 'Sin cambios', REGULAR: 'Regular',
      EMPEORA: 'Empeora', PARCIAL: 'Parcial',
    };
    return m[v] ?? v;
  }

  conductaLabel(v: string): string {
    const m: Record<string, string> = {
      CONTINUAR: 'Continuar', AJUSTAR: 'Ajustar plan', REEVALUAR: 'Re-evaluar',
      ALTA: 'Alta', DERIVAR: 'Derivar', SOLICITAR_ESTUDIO: 'Pedir estudio', SUSPENDER: 'Suspender',
    };
    return m[v] ?? v;
  }
}
