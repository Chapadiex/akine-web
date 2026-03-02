import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'akine_access_token';
const REFRESH_TOKEN_KEY = 'akine_refresh_token';
const USER_KEY = 'akine_user';

interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  // ─── Access Token ──────────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // ─── Expiry ────────────────────────────────────────────────────────────────

  isAccessTokenValid(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    const payload = this.decodePayload(token);
    if (!payload) return false;
    // 10-second margin to avoid edge cases
    return payload.exp * 1000 > Date.now() + 10_000;
  }

  // ─── User cache ────────────────────────────────────────────────────────────

  storeUser<T>(user: T): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getStoredUser<T>(): T | null {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  }

  // ─── JWT decode (no library, client-side only) ────────────────────────────

  decodePayload(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
