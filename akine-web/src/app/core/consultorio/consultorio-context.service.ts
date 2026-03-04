import { computed, Injectable, signal } from '@angular/core';
import { Consultorio } from '../../features/consultorios/models/consultorio.models';

const STORAGE_KEY = 'akine.activeConsultorioId';

@Injectable({ providedIn: 'root' })
export class ConsultorioContextService {
  readonly consultorios = signal<Consultorio[]>([]);
  readonly selectedConsultorioId = signal<string>('');

  readonly selectedConsultorio = computed(() =>
    this.consultorios().find((c) => c.id === this.selectedConsultorioId()) ?? null,
  );

  setConsultorios(items: Consultorio[]): void {
    const activeItems = items.filter((c) => c.status === 'ACTIVE');
    this.consultorios.set(activeItems);
    const stored = localStorage.getItem(STORAGE_KEY) ?? '';
    const stillExists = activeItems.some((c) => c.id === stored);
    const next = stillExists ? stored : activeItems[0]?.id ?? '';
    this.setSelectedConsultorioId(next);
  }

  setSelectedConsultorioId(id: string): void {
    this.selectedConsultorioId.set(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
