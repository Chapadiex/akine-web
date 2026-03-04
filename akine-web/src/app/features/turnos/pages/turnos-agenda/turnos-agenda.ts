import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { ConsultorioContextService } from '../../../../core/consultorio/consultorio-context.service';
import { ErrorMapperService } from '../../../../core/error/error-mapper.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { TurnoService } from '../../services/turno.service';
import { Turno, TURNO_ESTADO_COLORS } from '../../models/turno.models';
import { TurnoFilters, TurnoFilterValues } from '../../components/turno-filters/turno-filters';
import { TurnoDetail } from '../../components/turno-detail/turno-detail';
import { TurnoDialog } from '../../components/turno-dialog/turno-dialog';

@Component({
  selector: 'app-turnos-agenda',
  standalone: true,
  imports: [FullCalendarModule, TurnoFilters, TurnoDetail, TurnoDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './turnos-agenda.html',
  styleUrl: './turnos-agenda.scss',
})
export class TurnosAgendaPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private turnoSvc = inject(TurnoService);
  private consultorioCtx = inject(ConsultorioContextService);
  private toast = inject(ToastService);
  private errMap = inject(ErrorMapperService);

  @ViewChild('calendar') calendarRef!: FullCalendarComponent;

  currentFilters = signal<TurnoFilterValues | null>(null);
  selectedConsultorioId = this.consultorioCtx.selectedConsultorioId;
  events = signal<EventInput[]>([]);
  selectedTurno = signal<Turno | null>(null);
  showDialog = signal(false);
  dialogStart = signal('');
  turnosCache = signal<Map<string, Turno>>(new Map());

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },
    locale: esLocale,
    allDaySlot: false,
    nowIndicator: true,
    firstDay: 1,
    slotMinTime: '07:00:00',
    slotMaxTime: '22:00:00',
    slotDuration: '00:15:00',
    selectable: true,
    editable: true,
    eventDurationEditable: false,
    height: 'auto',
    datesSet: (info) => this.onDatesSet(info),
    select: (info) => this.onSelect(info),
    eventClick: (info) => this.onEventClick(info),
    eventDrop: (info) => this.onEventDrop(info),
    events: [],
  };

  irAVistaDiaria(): void {
    this.router.navigate(['../hoy'], { relativeTo: this.route });
  }

  onFiltersChanged(filters: TurnoFilterValues): void {
    this.currentFilters.set(filters);
    if (filters.consultorioId && filters.consultorioId !== this.selectedConsultorioId()) {
      this.consultorioCtx.setSelectedConsultorioId(filters.consultorioId);
    }
    this.reloadEvents();
  }

  private onDatesSet(info: DatesSetArg): void {
    this.reloadEvents(
      this.toLocalDateTimeParam(info.start),
      this.toLocalDateTimeParam(info.end),
    );
  }

  private onSelect(info: DateSelectArg): void {
    const filters = this.currentFilters();
    if (!filters?.consultorioId) return;
    this.dialogStart.set(info.startStr.substring(0, 16));
    this.showDialog.set(true);
  }

  private onEventClick(info: EventClickArg): void {
    const turno = this.turnosCache().get(info.event.id);
    if (turno) this.selectedTurno.set(turno);
  }

  private onEventDrop(info: EventDropArg): void {
    const turno = this.turnosCache().get(info.event.id);
    if (!turno) { info.revert(); return; }

    const newStart = info.event.startStr.substring(0, 16);
    this.turnoSvc.reprogramar(turno.consultorioId, turno.id, {
      nuevaFechaHoraInicio: newStart,
    }).subscribe({
      next: () => {
        this.toast.success('Turno reprogramado');
        this.reloadEvents();
      },
      error: (err) => {
        this.toast.error(this.errMap.toMessage(err));
        info.revert();
      },
    });
  }

  onTurnoSaved(_turno: Turno): void {
    this.showDialog.set(false);
    this.reloadEvents();
  }

  onEstadoCambiado(_turno: Turno): void {
    this.selectedTurno.set(null);
    this.reloadEvents();
  }

  getConsultorioId(): string {
    return this.currentFilters()?.consultorioId ?? '';
  }

  private reloadEvents(start?: string, end?: string): void {
    const filters = this.currentFilters();
    if (!filters?.consultorioId) return;

    const calApi = this.calendarRef?.getApi();
    const from = start ?? (calApi ? this.toLocalDateTimeParam(calApi.view.activeStart) : '');
    const to = end ?? (calApi ? this.toLocalDateTimeParam(calApi.view.activeEnd) : '');
    if (!from || !to) return;

    this.turnoSvc.list(filters.consultorioId, {
      from,
      to,
      profesionalId: filters.profesionalId,
      boxId: filters.boxId,
      estado: filters.estado,
    }).subscribe({
      next: (turnos) => {
        const cache = new Map<string, Turno>();
        const evts: EventInput[] = turnos.map((t) => {
          cache.set(t.id, t);
          const profName = `${t.profesionalNombre ?? ''} ${t.profesionalApellido ?? ''}`.trim();
          const pacName = t.pacienteNombre ? `${t.pacienteApellido}, ${t.pacienteNombre}` : '';
          const titleParts = [profName, pacName, t.motivoConsulta].filter(Boolean);
          return {
            id: t.id,
            title: titleParts.join(' - '),
            start: t.fechaHoraInicio,
            end: t.fechaHoraFin,
            backgroundColor: TURNO_ESTADO_COLORS[t.estado],
            borderColor: TURNO_ESTADO_COLORS[t.estado],
          };
        });
        this.turnosCache.set(cache);
        this.events.set(evts);
        if (calApi) {
          calApi.removeAllEvents();
          evts.forEach((e) => calApi.addEvent(e));
        }
      },
      error: (err) => this.toast.error(this.errMap.toMessage(err)),
    });
  }

  private toLocalDateTimeParam(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
  }
}
