import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  map,
  Observable,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ApiClient } from '../../api/api-client.service';
import { API } from '../../api/api-endpoints';
import { TokenService } from './token.service';
import {
  ActivateRequest,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshRequest,
  RefreshResponse,
  RegisterPatientRequest,
  RegisterProfessionalRequest,
  ResendActivationRequest,
  UpdateProfileRequest,
  UserProfile,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  // ─── Reactive state ────────────────────────────────────────────────────────

  private readonly _currentUser = signal<AuthUser | null>(this.restoreSession());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly userRoles = computed(() => this._currentUser()?.roles ?? []);

  // ─── Refresh queue (handles concurrent 401s) ───────────────────────────────

  private isRefreshing = false;
  private readonly refreshSubject = new BehaviorSubject<string | null>(null);

  // ─── Role helpers ──────────────────────────────────────────────────────────

  hasRole(role: string): boolean {
    return (this.userRoles() as string[]).includes(role);
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.some((r) => this.hasRole(r));
  }

  // ─── Authentication ────────────────────────────────────────────────────────

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>(API.auth.login, request).pipe(
      tap((response) => {
        this.tokenService.setTokens(response.accessToken, response.refreshToken);
        this.tokenService.storeUser(response.user);
        this._currentUser.set(response.user);
      }),
    );
  }

  logout(): void {
    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      const body: LogoutRequest = { refreshToken };
      // Best-effort: fire and forget — interceptor adds Bearer token automatically
      this.api.post(API.auth.logout, body).subscribe({ error: () => {} });
    }
    this.clearSession();
  }

  /** Clears local state and redirects to /login (called by interceptor on failed refresh) */
  clearSession(): void {
    this.tokenService.clearTokens();
    this._currentUser.set(null);
    void this.router.navigate(['/login']);
  }

  // ─── Token refresh with concurrent-request queuing ────────────────────────

  /**
   * Called by the interceptor on 401.
   * Only one refresh call is in flight at a time; concurrent requests wait.
   * The /auth/refresh path is in SKIP_REFRESH_PATHS → no infinite retry loop.
   */
  refreshWithQueue(): Observable<string> {
    if (this.isRefreshing) {
      return this.refreshSubject.pipe(
        filter((token): token is string => token !== null),
        switchMap(
          (token) =>
            new Observable<string>((observer) => {
              observer.next(token);
              observer.complete();
            }),
        ),
      );
    }

    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    this.isRefreshing = true;
    this.refreshSubject.next(null);

    const body: RefreshRequest = { refreshToken };
    return this.api.post<RefreshResponse>(API.auth.refresh, body).pipe(
      tap((response) => {
        this.tokenService.setTokens(response.accessToken, response.refreshToken);
        this.isRefreshing = false;
        this.refreshSubject.next(response.accessToken);
      }),
      map((response) => response.accessToken),
      catchError((err: unknown) => {
        this.isRefreshing = false;
        this.clearSession();
        return throwError(() => err);
      }),
    );
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  registerPatient(request: RegisterPatientRequest): Observable<void> {
    return this.api.post<void>(API.auth.registerPatient, request);
  }

  registerProfessional(request: RegisterProfessionalRequest): Observable<void> {
    return this.api.post<void>(API.auth.registerProfessional, request);
  }

  // ─── Account activation ────────────────────────────────────────────────────

  activate(token: string): Observable<void> {
    const body: ActivateRequest = { token };
    return this.api.post<void>(API.auth.activate, body);
  }

  resendActivation(email: string): Observable<void> {
    const body: ResendActivationRequest = { email };
    return this.api.post<void>(API.auth.resendActivation, body);
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  getMyProfile(): Observable<UserProfile> {
    return this.api.get<UserProfile>(API.users.me);
  }

  updateMyProfile(request: UpdateProfileRequest): Observable<UserProfile> {
    return this.api.patch<UserProfile>(API.users.me, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.patch<void>(API.users.mePassword, request);
  }

  // ─── Session restore ───────────────────────────────────────────────────────

  private restoreSession(): AuthUser | null {
    if (!this.tokenService.isAccessTokenValid()) {
      this.tokenService.clearTokens();
      return null;
    }
    return this.tokenService.getStoredUser<AuthUser>();
  }
}
