import { ActivatedRoute } from '@angular/router';

export function resolveRouteParam(route: ActivatedRoute, key: string): string | null {
  for (let index = route.pathFromRoot.length - 1; index >= 0; index -= 1) {
    const value = route.pathFromRoot[index].snapshot.paramMap.get(key);
    if (value) return value;
  }
  return null;
}

export function resolveConsultorioId(route: ActivatedRoute): string | null {
  return resolveRouteParam(route, 'id');
}
