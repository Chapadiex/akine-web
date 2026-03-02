import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * Paths that must NOT trigger 401 → refresh retry.
 * Prevents infinite loops on refresh/login failures.
 */
const SKIP_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/register'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  const shouldSkip = SKIP_REFRESH_PATHS.some((path) => req.url.includes(path));

  // Attach Bearer token to outgoing requests
  const token = tokenService.getAccessToken();
  const outgoing =
    token && !shouldSkip
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        !shouldSkip &&
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        // Single refresh attempt; queue concurrent 401s until resolved
        return authService.refreshWithQueue().pipe(
          switchMap((newToken) =>
            next(
              req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }),
            ),
          ),
          catchError((refreshErr: unknown) => throwError(() => refreshErr)),
        );
      }
      return throwError(() => error);
    }),
  );
};
