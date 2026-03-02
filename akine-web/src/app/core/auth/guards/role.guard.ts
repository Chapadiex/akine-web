import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects routes that require specific roles.
 * Requires the route to have `data: { roles: string[] }`.
 * Falls back to authGuard behavior if not authenticated.
 *
 * Usage:
 *   {
 *     path: 'admin',
 *     canActivate: [roleGuard],
 *     data: { roles: ['ADMIN'] },
 *     ...
 *   }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const requiredRoles: string[] = route.data['roles'] ?? [];

  // No roles specified → just authentication is enough
  if (requiredRoles.length === 0) return true;

  if (authService.hasAnyRole(...requiredRoles)) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
