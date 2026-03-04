import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

type ReportSection = 'general' | 'turnos' | 'caja' | 'os';

interface ReportSectionConfig {
  icon: string;
  title: string;
  description: string;
}

const REPORT_SECTIONS: Record<ReportSection, ReportSectionConfig> = {
  general: {
    icon: '📊',
    title: 'Reportes',
    description:
      'Estadisticas de consultas, facturacion, obras sociales y ocupacion de agenda.',
  },
  turnos: {
    icon: '📅',
    title: 'Reporte de Turnos',
    description: 'Indicadores de ocupacion de agenda y ausentismo por consultorio.',
  },
  caja: {
    icon: '💵',
    title: 'Reporte de Caja',
    description: 'Resumen de ingresos y egresos del consultorio seleccionado.',
  },
  os: {
    icon: '🧾',
    title: 'Reporte de Obras Sociales',
    description: 'Comparativo de facturado versus cobrado por convenio y periodo.',
  },
};

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [ComingSoon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-coming-soon
      [icon]="activeSection().icon"
      [title]="activeSection().title"
      [description]="activeSection().description"
    />
  `,
})
export class Reportes {
  private readonly route = inject(ActivatedRoute);

  private readonly section = toSignal(
    this.route.queryParamMap.pipe(
      map((params): ReportSection => {
        const section = (params.get('section') ?? '').toLowerCase();
        if (section === 'turnos' || section === 'caja' || section === 'os') {
          return section;
        }
        return 'general';
      }),
    ),
    { initialValue: 'general' as ReportSection },
  );

  readonly activeSection = computed<ReportSectionConfig>(
    () => REPORT_SECTIONS[this.section()],
  );
}
