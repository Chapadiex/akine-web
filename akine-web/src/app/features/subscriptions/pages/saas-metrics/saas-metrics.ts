import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../../services/subscription.service';
import { SaasMetrics, VencimientoProximo } from '../../models/subscription.models';

interface PlanRow {
  plan: string;
  count: number;
  pct: number;
  mrr: number;
}

@Component({
  selector: 'app-saas-metrics-page',
  standalone: true,
  imports: [],
  templateUrl: './saas-metrics.html',
  styleUrl: './saas-metrics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaasMetricsPage implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly metrics = signal<SaasMetrics | null>(null);

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }

  planRows(): PlanRow[] {
    const m = this.metrics();
    if (!m) return [];
    const total = Object.values(m.distribucionPlanes).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m.distribucionPlanes)
      .map(([plan, count]) => ({
        plan,
        count,
        pct: Math.round((count / total) * 100),
        mrr: m.mrr.porPlan[plan] ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  expirations(): VencimientoProximo[] {
    return this.metrics()?.vencimientosProximos ?? [];
  }

  kpiActivas(): number {
    return this.metrics()?.totalSuscripciones['ACTIVE'] ?? 0;
  }

  kpiPendientes(): number {
    return this.metrics()?.totalSuscripciones['PENDING_APPROVAL'] ?? 0;
  }

  kpiExpirando(): number {
    return this.expirations().length;
  }

  kpiMrr(): number {
    return this.metrics()?.mrr.total ?? 0;
  }

  formatCurrency(value: number): string {
    return '$' + new Intl.NumberFormat('es-AR').format(value);
  }

  urgencyClass(days: number): string {
    if (days <= 3) return 'days-badge days-badge--critical';
    if (days <= 7) return 'days-badge days-badge--urgent';
    return 'days-badge';
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.subscriptionService.getSaasMetrics().subscribe({
      next: (m) => {
        this.metrics.set(m);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as { message?: string; detail?: string };
        this.errorMessage.set(
          body?.message ?? body?.detail ?? 'No se pudieron cargar las métricas. Intentá de nuevo.',
        );
      },
    });
  }
}
