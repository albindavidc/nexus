import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // ─── Signals (Reactive State) ──────────────────────────────
  private _user = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // ─── Public Computed ───────────────────────────────────────
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());

  constructor(private http: HttpClient, private router: Router) {}

  // ─── Register ──────────────────────────────────────────────
  register(data: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data, {
        withCredentials: true,      // send/receive cookies
      })
      .pipe(
        tap((res) => {
          this._user.set(res.user);
          this._isLoading.set(false);
          this.router.navigate(['/chat']);
        }),
        catchError((err) => {
          const message = err.error?.message || 'Registration failed';
          this._error.set(message);
          this._isLoading.set(false);
          return throwError(() => err);
        })
      );
  }

  // ─── Login ─────────────────────────────────────────────────
  login(data: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this._user.set(res.user);
          this._isLoading.set(false);
          this.router.navigate(['/chat']);
        }),
        catchError((err) => {
          const message = err.error?.message || 'Login failed';
          this._error.set(message);
          this._isLoading.set(false);
          return throwError(() => err);
        })
      );
  }

  // ─── Logout ────────────────────────────────────────────────
  logout(): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this._user.set(null);
          this.router.navigate(['/auth/login']);
        }),
        catchError((err) => {
          // Still clear user on error
          this._user.set(null);
          this.router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
  }

  // ─── Refresh Token ─────────────────────────────────────────
  // Called by interceptor when access token expires
  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh-token`, {}, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this._user.set(res.user);
        }),
        catchError((err) => {
          this._user.set(null);
          this.router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
  }

  // ─── Get Current User ──────────────────────────────────────
  getMe(): Observable<AuthResponse> {
    return this.http
      .get<AuthResponse>(`${this.apiUrl}/user`, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._user.set(res.user);
        }),
        catchError((err) => {
          this._user.set(null);
          return throwError(() => err);
        })
      );
  }

  // ─── Clear Error ───────────────────────────────────────────
  clearError(): void {
    this._error.set(null);
  }

  // ─── Set User (used by auth guard) ─────────────────────────
  setUser(user: User | null): void {
    this._user.set(user);
  }
}
