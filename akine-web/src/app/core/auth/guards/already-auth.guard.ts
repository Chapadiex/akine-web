import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Redirects already-authenticated users away from auth pages (login, register).
 * Sends them directly to /app (shell).
 *
 * Usage:
 *   { path: 'login', canActivate: [alreadyAuthGuard], ... }
 */
export const alreadyAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/app']);
  }

  return true;
};
