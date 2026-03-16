import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConsultorioCompletenessRefreshService } from '../../services/consultorio-completeness-refresh.service';
import { ConsultorioService } from '../../services/consultorio.service';
import { Consultorio, ConsultorioRequest } from '../../models/consultorio.models';
import { fetchGeocode, GeocodeHit } from '../../utils/consultorio-location';
import {
  decimalRangeValidator,
  optionalCuitValidator,
  phoneValidator,
  trimmedRequiredValidator,
} from '../../utils/consultorio-form-rules';

type StepKey = 'general' | 'contacto' | 'mapa' | 'impresion';
type PrintTabKey = 'identidad' | 'visibles';

interface StepDefinition {
  key: StepKey;
  title: string;
  description: string;
  contentTitle: string;
  contentSubtitle: string;
}

interface DocumentToggle {
  control:
    | 'documentShowAddress'
    | 'documentShowPhone'
    | 'documentShowEmail'
    | 'documentShowCuit'
    | 'documentShowLegalName'
    | 'documentShowLogo';
  label: string;
  hint: string;
}

const STEPS: StepDefinition[] = [
  {
    key: 'general',
    title: 'General',
    description: 'Identidad operativa y datos institucionales base.',
    contentTitle: 'Identidad del consultorio',
    contentSubtitle: 'Solo los datos institucionales que sostienen la cabecera y la referencia operativa.',
  },
  {
    key: 'contacto',
    title: 'Contacto',
    description: 'Canales de contacto y datos de llegada.',
    contentTitle: 'Contacto y acceso',
    contentSubtitle: 'Direccion visible, canales de contacto y referencias para llegar sin friccion.',
  },
  {
    key: 'mapa',
    title: 'Ubicacion en mapa',
    description: 'Pin visible y respaldo tecnico de coordenadas.',
    contentTitle: 'Ubicacion visual del consultorio',
    contentSubtitle: 'La referencia georreferenciada y el pin del mapa quedan separados de la direccion visible.',
  },
  {
    key: 'impresion',
    title: 'Impresion',
    description: 'Identidad documental y datos visibles.',
    contentTitle: 'Configuracion de impresion',
    contentSubtitle: 'Define identidad documental y visibilidad sin sumar configuraciones accesorias.',
  },
];

const STEP_CONTROL_MAP: Record<StepKey, string[]> = {
  general: ['name', 'cuit'],
  contacto: ['address', 'phone', 'email'],
  mapa: ['mapLatitude', 'mapLongitude'],
  impresion: [],
};

const DOCUMENT_TOGGLES: DocumentToggle[] = [
  { control: 'documentShowAddress', label: 'Direccion', hint: 'Encabezados y constancias.' },
  { control: 'documentShowPhone', label: 'Telefono', hint: 'Canal de contacto visible.' },
  { control: 'documentShowEmail', label: 'Email', hint: 'Email institucional en documentos.' },
  { control: 'documentShowCuit', label: 'CUIT', hint: 'Datos fiscales cuando haga falta.' },
  { control: 'documentShowLegalName', label: 'Razon social', hint: 'Membrete institucional.' },
  { control: 'documentShowLogo', label: 'Logo', hint: 'Identidad visual en cabecera.' },
];

const STEP_QUERY_ALIASES: Record<string, StepKey> = {
  general: 'general',
  contacto: 'contacto',
  mapa: 'mapa',
  ubicacion: 'mapa',
  documental: 'impresion',
  documentos: 'impresion',
  impresion: 'impresion',
};

@Component({
  selector: 'app-consultorio-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './consultorio-edit.html',
  styleUrls: ['./consultorio-edit.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultorioEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);
  private readonly errMap = inject(ErrorMapperService);
  private readonly consultorioSvc = inject(ConsultorioService);
  private readonly completenessRefresh = inject(ConsultorioCompletenessRefreshService);

  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  readonly steps = STEPS;
  readonly documentToggles = DOCUMENT_TOGGLES;
  readonly activeStep = signal<StepKey>('general');
  readonly activePrintTab = signal<PrintTabKey>('identidad');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadedConsultorio = signal<Consultorio | null>(null);
  readonly mapSearchQuery = signal('');
  readonly isSearchingLocations = signal(false);
  readonly locationResults = signal<GeocodeHit[]>([]);
  readonly searchError = signal('');
  readonly mapPreviewUrl = signal<SafeResourceUrl | null>(null);
  consultorioId = '';

  readonly form = this.fb.nonNullable.group({
    name: ['', [trimmedRequiredValidator]],
    isActive: [true],
    description: [''],
    logoUrl: [''],
    legalName: [''],
    cuit: ['', [optionalCuitValidator]],
    administrativeContact: [''],
    address: ['', [trimmedRequiredValidator]],
    geoAddress: [''],
    phone: ['', [phoneValidator]],
    email: ['', [trimmedRequiredValidator, Validators.email]],
    accessReference: [''],
    floorUnit: [''],
    mapLatitude: ['', [trimmedRequiredValidator, decimalRangeValidator(-90, 90)]],
    mapLongitude: ['', [trimmedRequiredValidator, decimalRangeValidator(-180, 180)]],
    googleMapsUrl: [''],
    documentDisplayName: [''],
    documentSubtitle: [''],
    documentLogoUrl: [''],
    documentFooter: [''],
    documentShowAddress: [false],
    documentShowPhone: [false],
    documentShowEmail: [false],
    documentShowCuit: [false],
    documentShowLegalName: [false],
    documentShowLogo: [false],
  });

  ngOnInit(): void {
    this.consultorioId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.consultorioId) {
      this.toast.error('No se pudo resolver el consultorio a editar.');
      void this.router.navigate(['/app/consultorios']);
      return;
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const requested = params.get('step')?.trim().toLowerCase();
      const target = requested ? STEP_QUERY_ALIASES[requested] : undefined;
      if (target) {
        this.activeStep.set(target);
      }
    });

    this.consultorioSvc.getById(this.consultorioId).subscribe({
      next: (consultorio) => {
        this.loadedConsultorio.set(consultorio);
        this.patchForm(consultorio);
        this.loading.set(false);
        this.refreshMapPreview();
        queueMicrotask(() => this.nameInput?.nativeElement.focus());
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });

    this.form.valueChanges
      .pipe(debounceTime(180), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshMapPreview());
  }

  currentIndex(): number {
    return this.steps.findIndex((step) => step.key === this.activeStep());
  }

  currentStep(): StepDefinition {
    return this.steps[this.currentIndex()];
  }

  completedStepsCount(): number {
    return this.steps.filter((step) => this.isStepComplete(step.key)).length;
  }

  stepNumber(step: StepKey): number {
    return this.steps.findIndex((item) => item.key === step) + 1;
  }

  goTo(step: StepKey): void {
    this.activeStep.set(step);
    if (step === 'general') {
      queueMicrotask(() => this.nameInput?.nativeElement.focus());
    }
  }

  prev(): void {
    const prev = this.steps[this.currentIndex() - 1];
    if (prev) {
      this.goTo(prev.key);
    }
  }

  next(): void {
    if (!this.stepValid()) {
      return;
    }
    const next = this.steps[this.currentIndex() + 1];
    if (next) {
      this.goTo(next.key);
    }
  }

  goBack(): void {
    void this.router.navigate(['/app/consultorios', this.consultorioId]);
  }

  toggleActiveStatus(): void {
    this.form.controls.isActive.setValue(!this.form.controls.isActive.value);
  }

  stepState(step: StepKey): 'active' | 'done' | 'pending' {
    if (this.activeStep() === step) {
      return 'active';
    }
    return this.isStepComplete(step) ? 'done' : 'pending';
  }

  controlEnabled(controlName: DocumentToggle['control']): boolean {
    return this.form.controls[controlName].value;
  }

  hasPendingChanges(): boolean {
    return this.form.dirty;
  }

  documentPreviewTitle(): string {
    return this.form.controls.name.value.trim() || 'Nombre del consultorio';
  }

  documentPreviewSubtitle(): string {
    return this.form.controls.documentSubtitle.value.trim() || 'Subtitulo documental opcional';
  }

  documentPreviewFooter(): string {
    return this.form.controls.documentFooter.value.trim() || 'Pie institucional opcional.';
  }

  hasInstitutionalLogo(): boolean {
    return !!this.form.controls.logoUrl.value.trim();
  }

  documentPreviewFields(): string {
    const visible = [
      this.controlEnabled('documentShowAddress') ? this.form.controls.address.value.trim() || 'Direccion' : '',
      this.controlEnabled('documentShowPhone') ? this.form.controls.phone.value.trim() || 'Telefono' : '',
      this.controlEnabled('documentShowEmail') ? this.form.controls.email.value.trim() || 'Email' : '',
      this.controlEnabled('documentShowCuit') ? this.form.controls.cuit.value.trim() || 'CUIT' : '',
      this.controlEnabled('documentShowLegalName') ? this.form.controls.legalName.value.trim() || 'Razon social' : '',
    ].filter(Boolean);

    return visible.length > 0
      ? visible.join('  •  ')
      : 'Activa los datos que quieras mostrar en el encabezado documental.';
  }

  onMapQueryInput(event: Event): void {
    this.mapSearchQuery.set((event.target as HTMLInputElement | null)?.value ?? '');
    this.searchError.set('');
  }

  async searchMapLocations(): Promise<void> {
    const query = this.mapSearchQuery().trim()
      || this.form.controls.geoAddress.value.trim()
      || this.form.controls.address.value.trim();
    if (!query) {
      this.searchError.set('Ingresa una direccion para buscar el pin.');
      return;
    }

    this.isSearchingLocations.set(true);
    this.searchError.set('');

    try {
      this.locationResults.set(await fetchGeocode(query));
    } catch {
      this.locationResults.set([]);
      this.searchError.set('No se pudo buscar la ubicacion en este momento.');
    } finally {
      this.isSearchingLocations.set(false);
    }
  }

  selectLocation(hit: GeocodeHit): void {
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      this.searchError.set('No se pudo usar la ubicacion seleccionada.');
      return;
    }

    const label = hit.display_name?.trim()
      || this.form.controls.geoAddress.value.trim()
      || this.form.controls.address.value.trim();
    this.form.patchValue({
      geoAddress: label,
      mapLatitude: lat.toFixed(6),
      mapLongitude: lng.toFixed(6),
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    this.mapSearchQuery.set(label);
    this.locationResults.set([]);
    this.refreshMapPreview();
  }

  save(mode: 'draft' | 'final'): void {
    if (mode === 'final' && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.consultorioSvc.update(this.consultorioId, this.buildRequest(mode)).subscribe({
      next: (updated) => {
        this.loadedConsultorio.set(updated);
        this.patchForm(updated);
        this.form.markAsPristine();
        this.saving.set(false);
        this.completenessRefresh.notify(this.consultorioId);
        this.toast.success(mode === 'draft' ? 'Cambios guardados.' : 'Cambios guardados.');
        if (mode === 'final') {
          void this.router.navigate(['/app/consultorios', this.consultorioId]);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  private isStepComplete(step: StepKey): boolean {
    const controls = STEP_CONTROL_MAP[step];
    if (controls.length === 0) {
      return false;
    }

    return controls.every((name) => {
      const control = this.form.controls[name as keyof typeof this.form.controls];
      control.updateValueAndValidity({ emitEvent: false });
      return control.valid;
    });
  }

  private patchForm(consultorio: Consultorio): void {
    this.form.patchValue({
      name: consultorio.name,
      isActive: consultorio.status === 'ACTIVE',
      description: consultorio.description ?? '',
      logoUrl: consultorio.logoUrl ?? '',
      legalName: consultorio.legalName ?? '',
      cuit: consultorio.cuit ?? '',
      administrativeContact: consultorio.administrativeContact ?? '',
      address: consultorio.address ?? '',
      geoAddress: consultorio.geoAddress ?? '',
      phone: consultorio.phone ?? '',
      email: consultorio.email ?? '',
      accessReference: consultorio.accessReference ?? '',
      floorUnit: consultorio.floorUnit ?? '',
      mapLatitude: consultorio.mapLatitude != null ? String(consultorio.mapLatitude) : '',
      mapLongitude: consultorio.mapLongitude != null ? String(consultorio.mapLongitude) : '',
      googleMapsUrl: consultorio.googleMapsUrl ?? '',
      documentDisplayName: consultorio.documentDisplayName ?? '',
      documentSubtitle: consultorio.documentSubtitle ?? '',
      documentLogoUrl: consultorio.documentLogoUrl ?? '',
      documentFooter: consultorio.documentFooter ?? '',
      documentShowAddress: consultorio.documentShowAddress ?? false,
      documentShowPhone: consultorio.documentShowPhone ?? false,
      documentShowEmail: consultorio.documentShowEmail ?? false,
      documentShowCuit: consultorio.documentShowCuit ?? false,
      documentShowLegalName: consultorio.documentShowLegalName ?? false,
      documentShowLogo: consultorio.documentShowLogo ?? false,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.mapSearchQuery.set(consultorio.geoAddress ?? consultorio.address ?? '');
  }

  private buildRequest(mode: 'draft' | 'final'): ConsultorioRequest {
    const values = this.form.getRawValue();
    const current = this.loadedConsultorio();
    const useDraftFallback = mode === 'draft';
    const controlValue = <K extends keyof typeof this.form.controls>(name: K): string => String(this.form.controls[name].value ?? '');
    const controlInvalid = <K extends keyof typeof this.form.controls>(name: K): boolean => this.form.controls[name].invalid;
    const draftString = <K extends keyof typeof this.form.controls>(name: K, fallback?: string): string | undefined => {
      const trimmed = controlValue(name).trim();
      if (useDraftFallback && controlInvalid(name)) {
        return fallback;
      }
      return trimmed || undefined;
    };
    const draftRequiredString = <K extends keyof typeof this.form.controls>(name: K, fallback = ''): string => {
      const trimmed = controlValue(name).trim();
      if (useDraftFallback && controlInvalid(name)) {
        return fallback;
      }
      return trimmed;
    };
    const draftNumber = <K extends keyof typeof this.form.controls>(name: K, fallback?: number): number | undefined => {
      const raw = controlValue(name).trim().replace(',', '.');
      if (!raw) {
        return useDraftFallback ? fallback : undefined;
      }
      const parsed = Number(raw);
      if (Number.isNaN(parsed) || (useDraftFallback && controlInvalid(name))) {
        return fallback;
      }
      return parsed;
    };

    return {
      name: draftRequiredString('name', current?.name ?? ''),
      status: values.isActive ? 'ACTIVE' : 'INACTIVE',
      description: current?.description ?? undefined,
      logoUrl: values.logoUrl.trim() || undefined,
      address: draftRequiredString('address', current?.address ?? ''),
      geoAddress: draftString('geoAddress', current?.geoAddress),
      phone: draftRequiredString('phone', current?.phone ?? ''),
      email: draftRequiredString('email', current?.email ?? ''),
      accessReference: values.accessReference.trim() || undefined,
      floorUnit: values.floorUnit.trim() || undefined,
      mapLatitude: draftNumber('mapLatitude', current?.mapLatitude),
      mapLongitude: draftNumber('mapLongitude', current?.mapLongitude),
      googleMapsUrl: draftString('googleMapsUrl', current?.googleMapsUrl),
      legalName: values.legalName.trim() || undefined,
      cuit: values.cuit.trim() || undefined,
      administrativeContact: current?.administrativeContact ?? undefined,
      internalNotes: current?.internalNotes ?? undefined,
      documentDisplayName: draftRequiredString('name', current?.name ?? '') || undefined,
      documentSubtitle: values.documentSubtitle.trim() || undefined,
      documentLogoUrl: values.logoUrl.trim() || undefined,
      documentFooter: values.documentFooter.trim() || undefined,
      documentShowAddress: values.documentShowAddress,
      documentShowPhone: values.documentShowPhone,
      documentShowEmail: values.documentShowEmail,
      documentShowCuit: values.documentShowCuit,
      documentShowLegalName: values.documentShowLegalName,
      documentShowLogo: values.documentShowLogo,
      licenseNumber: current?.licenseNumber ?? undefined,
      licenseType: current?.licenseType ?? undefined,
      licenseExpirationDate: current?.licenseExpirationDate ?? undefined,
      professionalDirectorName: current?.professionalDirectorName ?? undefined,
      professionalDirectorLicense: current?.professionalDirectorLicense ?? undefined,
      legalDocumentSummary: current?.legalDocumentSummary ?? undefined,
      legalNotes: current?.legalNotes ?? undefined,
    };
  }

  private refreshMapPreview(): void {
    const lat = Number(this.form.controls.mapLatitude.value.replace(',', '.'));
    const lng = Number(this.form.controls.mapLongitude.value.replace(',', '.'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      if (this.form.controls.googleMapsUrl.value) {
        this.form.controls.googleMapsUrl.setValue('', { emitEvent: false });
      }
      this.mapPreviewUrl.set(null);
      return;
    }

    const syncedGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (this.form.controls.googleMapsUrl.value !== syncedGoogleMapsUrl) {
      this.form.controls.googleMapsUrl.setValue(syncedGoogleMapsUrl, { emitEvent: false });
    }

    this.mapPreviewUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`,
      ),
    );
  }

  private stepValid(): boolean {
    const controls = STEP_CONTROL_MAP[this.activeStep()];
    let valid = true;

    for (const name of controls) {
      const control = this.form.controls[name as keyof typeof this.form.controls];
      control.markAsTouched();
      control.updateValueAndValidity();
      if (control.invalid) {
        valid = false;
      }
    }

    return valid;
  }
}
