import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ConvenioFacturacionService } from '../../services/convenio-facturacion.service';
import {
  ActualizarArancelesRequest,
  Arancel,
  Convenio,
  ConvenioVersion,
  CoseguroTipo,
  EstadoConvenio,
  FinanciadorSalud,
  ModalidadConvenio,
  PlanFinanciador,
  Prestacion,
} from '../../models/facturacion.models';

type PageState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-convenios-list',
  standalone: true,
  imports: [DecimalPipe, DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './convenios-list.component.html',
  styleUrl: './convenios-list.component.scss',
})
export class ConveniosListComponent implements OnInit {
  private ctx      = inject(ConsultorioContextService);
  private svc      = inject(ConvenioFacturacionService);
  private toast    = inject(ToastService);
  private errMap   = inject(ErrorMapperService);

  consultorioId = this.ctx.selectedConsultorioId;

  pageState     = signal<PageState>('loading');
  convenios     = signal<Convenio[]>([]);
  prestaciones  = signal<Prestacion[]>([]);
  financiadores = signal<FinanciadorSalud[]>([]);
  planes        = signal<PlanFinanciador[]>([]);
  planesEdit    = signal<PlanFinanciador[]>([]);
  submitting    = signal(false);
  showForm      = signal(false);
  expandedId    = signal<string | null>(null);
  editandoId    = signal<string | null>(null);
  showArancel         = signal<string | null>(null);
  renovandoId         = signal<string | null>(null);
  actualizandoPreciosId = signal<string | null>(null);
  submittingArancel   = signal(false);
  submittingEdit      = signal(false);
  submittingEstado    = signal<string | null>(null);
  submittingRenovar   = signal(false);
  submittingPrecios   = signal(false);
  historialId         = signal<string | null>(null);
  historialVersiones  = signal<ConvenioVersion[]>([]);
  loadingHistorial    = signal(false);
  showFilters       = signal(false);
  filtroTexto       = signal('');
  filtroEstado      = signal<EstadoConvenio | ''>('');
  filtroFinanciadorId = signal('');

  readonly modalidades: { value: ModalidadConvenio; label: string }[] = [
    { value: 'POR_PRESTACION', label: 'Por prestación' },
    { value: 'POR_SESION',     label: 'Por sesión' },
    { value: 'CAPITA',         label: 'Per cápita' },
  ];

  readonly coseguroOpciones: { value: CoseguroTipo; label: string }[] = [
    { value: 'NINGUNO',     label: 'Sin coseguro' },
    { value: 'FIJO',        label: 'Fijo ($)' },
    { value: 'PORCENTAJE',  label: 'Porcentaje (%)' },
  ];

  readonly estadoOpciones: { value: EstadoConvenio; label: string }[] = [
    { value: 'vigente',    label: 'Vigente' },
    { value: 'por-vencer', label: 'Por vencer' },
    { value: 'vencido',    label: 'Vencido' },
    { value: 'sin-fechas', label: 'Sin fechas' },
  ];

  private static hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
  private static en1Anio(): string {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10);
  }

  convenioForm = new FormGroup({
    financiadorId: new FormControl<string>('', Validators.required),
    plan:          new FormControl<string>(''),
    modalidad:     new FormControl<ModalidadConvenio>('POR_PRESTACION', Validators.required),
    vigenciaDesde: new FormControl<string>(ConveniosListComponent.hoy(), Validators.required),
    vigenciaHasta: new FormControl<string>(ConveniosListComponent.en1Anio()),
    diaCierre:     new FormControl<number | null>(null),
    requiereAut:   new FormControl<boolean>(false),
    requiereOrden: new FormControl<boolean>(false),
  });

  editForm = new FormGroup({
    modalidad:     new FormControl<ModalidadConvenio>('POR_PRESTACION', Validators.required),
    vigenciaHasta: new FormControl<string>(''),
    diaCierre:     new FormControl<number | null>(null),
    requiereAut:   new FormControl<boolean>(false),
    requiereOrden: new FormControl<boolean>(false),
  });

  arancelForm = new FormGroup({
    prestacionId:    new FormControl<string>('', Validators.required),
    importeOs:       new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    coseguroTipo:    new FormControl<CoseguroTipo>('NINGUNO', Validators.required),
    coseguroValor:   new FormControl<number | null>(null),
    sesionesMesMax:  new FormControl<number | null>(null),
    sesionesAnioMax: new FormControl<number | null>(null),
    vigenciaDesde:   new FormControl<string>('', Validators.required),
    vigenciaHasta:   new FormControl<string>(''),
  });

  renovarForm = new FormGroup({
    vigenciaDesde:   new FormControl<string>('', Validators.required),
    vigenciaHasta:   new FormControl<string>(''),
    motivoCierre:    new FormControl<string>(''),
    copiarAranceles: new FormControl<boolean>(true),
  });

  actualizarPreciosForm = new FormGroup({
    metodo:       new FormControl<'porcentaje' | 'importe_directo'>('porcentaje', Validators.required),
    valor:        new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    vigenciaDesde: new FormControl<string>('', Validators.required),
  });

  // ── Computed ─────────────────────────────────────────────────────────────

  conveniosFiltrados = computed(() => {
    let list = this.convenios();
    const texto = this.filtroTexto().trim().toLowerCase();
    const estado = this.filtroEstado();
    const fin = this.filtroFinanciadorId();
    if (texto) list = list.filter(c =>
      c.siglaDisplay.toLowerCase().includes(texto) ||
      c.financiadorNombre.toLowerCase().includes(texto)
    );
    if (estado) list = list.filter(c => this.estadoConvenio(c) === estado);
    if (fin) list = list.filter(c => c.financiadorId === fin);
    return list;
  });

  metricas = computed(() => {
    const all = this.convenios();
    return {
      total:     all.length,
      vigentes:  all.filter(c => this.estadoConvenio(c) === 'vigente').length,
      porVencer: all.filter(c => this.estadoConvenio(c) === 'por-vencer').length,
      vencidos:  all.filter(c => this.estadoConvenio(c) === 'vencido').length,
    };
  });

  hayFiltrosActivos = computed(() =>
    this.filtroTexto() !== '' || this.filtroEstado() !== '' || this.filtroFinanciadorId() !== ''
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const cid = this.consultorioId();
    if (cid) {
      this.load(cid);
      this.svc.nomenclador().subscribe({ next: (p) => this.prestaciones.set(p), error: () => {} });
      this.svc.financiadoresByConsultorio(cid).subscribe({ next: (f) => this.financiadores.set(f), error: () => {} });
    }
  }

  private load(cid: string): void {
    this.pageState.set('loading');
    this.svc.listByConsultorio(cid).subscribe({
      next: (list) => { this.convenios.set(list); this.pageState.set('loaded'); },
      error: (err) => { this.toast.error(this.errMap.toMessage(err)); this.pageState.set('error'); },
    });
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  estadoConvenio(c: Convenio): EstadoConvenio {
    const v = c.versionActual;
    if (!v) return 'sin-fechas';
    if (v.estado === 'INACTIVA' || v.estado === 'CERRADA') return 'vencido';
    if (!v.vigenciaHasta) return 'vigente';
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(v.vigenciaHasta); hasta.setHours(0, 0, 0, 0);
    if (hasta < hoy) return 'vencido';
    const en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
    if (hasta <= en30) return 'por-vencer';
    return 'vigente';
  }

  estadoLabel(c: Convenio): string {
    const e = this.estadoConvenio(c);
    return e === 'vigente' ? 'Vigente' : e === 'por-vencer' ? 'Por vencer' : e === 'vencido' ? 'Vencido' : 'Sin fechas';
  }

  esActivo(c: Convenio): boolean {
    return c.versionActual?.estado === 'VIGENTE';
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  toggleFilters(): void { this.showFilters.update(v => !v); }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroEstado.set('');
    this.filtroFinanciadorId.set('');
  }

  // ── Crear convenio ────────────────────────────────────────────────────────

  onFinanciadorChange(financiadorId: string): void {
    this.planes.set([]);
    this.convenioForm.patchValue({ plan: '' });
    if (financiadorId) {
      this.svc.planesByFinanciador(financiadorId).subscribe({ next: (p) => this.planes.set(p), error: () => {} });
    }
  }

  toggleForm(): void {
    this.convenioForm.reset({
      modalidad:     'POR_PRESTACION',
      vigenciaDesde: ConveniosListComponent.hoy(),
      vigenciaHasta: ConveniosListComponent.en1Anio(),
      requiereAut:   false,
      requiereOrden: false,
    });
    this.planes.set([]);
    this.showForm.update((v) => !v);
    if (this.showForm()) this.editandoId.set(null);
  }

  guardarConvenio(): void {
    const cid = this.consultorioId();
    if (this.convenioForm.invalid || this.submitting() || !cid) return;
    this.submitting.set(true);
    const v = this.convenioForm.value;
    // plan: use selected plan name from the planes dropdown or direct input
    const planSeleccionado = this.planes().find(p => p.id === v.plan)?.nombrePlan ?? v.plan ?? undefined;
    this.svc.create(cid, {
      financiadorId: v.financiadorId!,
      plan:          planSeleccionado || undefined,
      modalidad:     v.modalidad!,
      vigenciaDesde: v.vigenciaDesde!,
      vigenciaHasta: v.vigenciaHasta || undefined,
      diaCierre:     v.diaCierre ?? undefined,
      requiereAut:   v.requiereAut ?? false,
      requiereOrden: v.requiereOrden ?? false,
    }).subscribe({
      next: (c) => {
        this.convenios.update((list) => [...list, c]);
        this.showForm.set(false);
        this.submitting.set(false);
        this.toast.success('Convenio creado');
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  // ── Editar convenio ───────────────────────────────────────────────────────

  editarConvenio(c: Convenio): void {
    this.showForm.set(false);
    this.expandedId.set(null);
    const v = c.versionActual;
    const tieneAranceles = (v?.aranceles ?? []).length > 0;
    this.editForm.reset({
      modalidad:     c.modalidad,
      vigenciaHasta: v?.vigenciaHasta ?? '',
      diaCierre:     c.diaCierre ?? null,
      requiereAut:   c.requiereAut,
      requiereOrden: c.requiereOrden,
    });
    if (tieneAranceles) {
      this.editForm.get('modalidad')?.disable();
      this.editForm.get('requiereAut')?.disable();
    } else {
      this.editForm.get('modalidad')?.enable();
      this.editForm.get('requiereAut')?.enable();
    }
    this.editandoId.set(c.id);
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.editForm.reset();
  }

  guardarEdicion(): void {
    const id = this.editandoId();
    if (this.editForm.invalid || this.submittingEdit() || !id) return;
    this.submittingEdit.set(true);
    const v = this.editForm.getRawValue();
    this.svc.update(id, {
      modalidad:     v.modalidad ?? undefined,
      diaCierre:     v.diaCierre ?? undefined,
      requiereAut:   v.requiereAut ?? undefined,
      requiereOrden: v.requiereOrden ?? undefined,
      vigenciaHasta: v.vigenciaHasta || undefined,
    }).subscribe({
      next: (updated) => {
        this.convenios.update(list => list.map(c => c.id === id ? updated : c));
        this.editandoId.set(null);
        this.submittingEdit.set(false);
        this.toast.success('Convenio actualizado');
      },
      error: (err) => {
        this.submittingEdit.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  // ── Toggle activo ─────────────────────────────────────────────────────────

  toggleActivo(c: Convenio): void {
    if (this.submittingEstado() === c.id) return;
    this.submittingEstado.set(c.id);
    const nuevoEstado = this.esActivo(c) ? 'INACTIVA' : 'VIGENTE';
    this.svc.cambiarEstado(c.id, nuevoEstado).subscribe({
      next: (updated) => {
        this.convenios.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.submittingEstado.set(null);
        this.toast.success(this.esActivo(updated) ? 'Convenio activado' : 'Convenio desactivado');
      },
      error: (err) => {
        this.submittingEstado.set(null);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  // ── Renovar convenio ──────────────────────────────────────────────────────

  abrirRenovar(c: Convenio): void {
    this.editandoId.set(null);
    this.expandedId.set(null);
    this.renovarForm.reset({
      vigenciaDesde:   ConveniosListComponent.hoy(),
      vigenciaHasta:   ConveniosListComponent.en1Anio(),
      motivoCierre:    'Renovación periódica',
      copiarAranceles: true,
    });
    this.renovandoId.set(c.id);
  }

  cancelarRenovar(): void { this.renovandoId.set(null); }

  guardarRenovacion(c: Convenio): void {
    const id = this.renovandoId();
    if (this.renovarForm.invalid || this.submittingRenovar() || !id) return;
    this.submittingRenovar.set(true);
    const v = this.renovarForm.value;
    const aranceles = v.copiarAranceles
      ? (c.versionActual?.aranceles ?? [])
          .filter(a => a.activo)
          .map(a => ({
            prestacionId:  a.prestacionId,
            importeOs:     a.importeOs,
            coseguroTipo:  a.coseguroTipo,
            coseguroValor: a.coseguroValor,
            sesionesMesMax: a.sesionesMesMax,
            sesionesAnioMax: a.sesionesAnioMax,
            vigenciaDesde: v.vigenciaDesde!,
          }))
      : [];
    this.svc.renovar(id, {
      vigenciaDesde: v.vigenciaDesde!,
      vigenciaHasta: v.vigenciaHasta || undefined,
      motivoCierre:  v.motivoCierre || undefined,
      aranceles,
    }).subscribe({
      next: (updated) => {
        this.convenios.update(list => list.map(x => x.id === id ? updated : x));
        this.renovandoId.set(null);
        this.submittingRenovar.set(false);
        this.toast.success('Convenio renovado — nueva versión creada');
      },
      error: (err) => {
        this.submittingRenovar.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  // ── Aranceles ─────────────────────────────────────────────────────────────

  toggleExpand(id: string): void {
    if (this.expandedId() === id) { this.expandedId.set(null); return; }
    this.editandoId.set(null);
    this.expandedId.set(id);
  }

  arancelesDeConvenio(c: Convenio): Arancel[] {
    return (c.versionActual?.aranceles ?? []).filter(a => a.activo);
  }

  abrirArancel(convenioId: string): void {
    this.arancelForm.reset({
      coseguroTipo: 'NINGUNO',
      vigenciaDesde: ConveniosListComponent.hoy(),
    });
    this.showArancel.set(convenioId);
  }

  cancelarArancel(): void { this.showArancel.set(null); }

  coseguroRequiereValor(): boolean {
    const tipo = this.arancelForm.get('coseguroTipo')?.value;
    return tipo === 'FIJO' || tipo === 'PORCENTAJE';
  }

  guardarArancel(): void {
    const convenioId = this.showArancel();
    if (this.arancelForm.invalid || this.submittingArancel() || !convenioId) return;
    this.submittingArancel.set(true);
    const v = this.arancelForm.value;
    this.svc.agregarArancel(convenioId, {
      prestacionId:    v.prestacionId!,
      importeOs:       v.importeOs!,
      coseguroTipo:    v.coseguroTipo!,
      coseguroValor:   this.coseguroRequiereValor() ? (v.coseguroValor ?? undefined) : undefined,
      sesionesMesMax:  v.sesionesMesMax ?? undefined,
      sesionesAnioMax: v.sesionesAnioMax ?? undefined,
      vigenciaDesde:   v.vigenciaDesde!,
      vigenciaHasta:   v.vigenciaHasta || undefined,
    }).subscribe({
      next: (updated) => {
        this.convenios.update((list) => list.map(c => c.id === convenioId ? updated : c));
        this.showArancel.set(null);
        this.submittingArancel.set(false);
        this.toast.success('Arancel agregado');
      },
      error: (err) => {
        this.submittingArancel.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  // ── Actualizar precios ───────────────────────────────────────────────────

  abrirActualizarPrecios(convenioId: string): void {
    this.actualizarPreciosForm.reset({
      metodo:        'porcentaje',
      vigenciaDesde: ConveniosListComponent.hoy(),
    });
    this.actualizandoPreciosId.set(convenioId);
  }

  cancelarActualizarPrecios(): void { this.actualizandoPreciosId.set(null); }

  metodoLabel(): string {
    return this.actualizarPreciosForm.get('metodo')?.value === 'porcentaje' ? '%' : '$';
  }

  guardarActualizarPrecios(): void {
    const convenioId = this.actualizandoPreciosId();
    if (this.actualizarPreciosForm.invalid || this.submittingPrecios() || !convenioId) return;
    this.submittingPrecios.set(true);
    const v = this.actualizarPreciosForm.value;
    const req: ActualizarArancelesRequest = {
      metodo:        v.metodo!,
      valor:         v.valor!,
      vigenciaDesde: v.vigenciaDesde!,
    };
    this.svc.bulkUpdateAranceles(convenioId, req).subscribe({
      next: (updated) => {
        this.convenios.update(list => list.map(c => c.id === convenioId ? updated : c));
        this.actualizandoPreciosId.set(null);
        this.submittingPrecios.set(false);
        this.toast.success('Precios actualizados');
      },
      error: (err) => {
        this.submittingPrecios.set(false);
        this.toast.error(this.errMap.toMessage(err));
      },
    });
  }

  // ── Historial versiones ───────────────────────────────────────────────────

  toggleHistorial(convenioId: string): void {
    if (this.historialId() === convenioId) {
      this.historialId.set(null);
      return;
    }
    this.historialId.set(convenioId);
    this.historialVersiones.set([]);
    this.loadingHistorial.set(true);
    this.svc.versiones(convenioId).subscribe({
      next: (v) => { this.historialVersiones.set(v); this.loadingHistorial.set(false); },
      error: () => { this.loadingHistorial.set(false); this.toast.error('No se pudo cargar el historial'); },
    });
  }

  versionEstadoLabel(estado: string): string {
    return estado === 'VIGENTE' ? 'Vigente' : estado === 'CERRADA' ? 'Cerrada' : 'Inactiva';
  }

  versionEstadoClass(estado: string): string {
    return estado === 'VIGENTE' ? 'badge-liquidado' : estado === 'CERRADA' ? 'badge-presentado' : 'badge-anulado';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  modalidadLabel(m: ModalidadConvenio): string {
    return this.modalidades.find((x) => x.value === m)?.label ?? m;
  }

  coseguroLabel(a: Arancel): string {
    if (a.coseguroTipo === 'FIJO') return `+ $${a.coseguroValor?.toFixed(2) ?? '0'}`;
    if (a.coseguroTipo === 'PORCENTAJE') return `+ ${a.coseguroValor ?? 0}%`;
    return '—';
  }
}
