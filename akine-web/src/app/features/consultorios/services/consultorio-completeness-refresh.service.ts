import { Injectable } from '@angular/core';
import { filter, map, Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConsultorioCompletenessRefreshService {
  private readonly refresh$ = new Subject<string>();

  notify(consultorioId: string): void {
    this.refresh$.next(consultorioId);
  }

  onConsultorioChange(consultorioId: string): Observable<void> {
    return this.refresh$.pipe(
      filter((id) => id === consultorioId),
      map(() => void 0),
    );
  }
}
