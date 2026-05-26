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

const USER_STORAGE_KEY = 'nexus_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // ─── Signals (Reactive State) ──────────────────────────────
  // Rehydrate immediately from localStorage so _id is available before getMe() resolves
  private _user = signal<User | null>(this._loadUserFromStorage());
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // ─── Public Computed ───────────────────────────────────────
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());

  // ─── Convenience getter: always returns a normalised _id string ──
  get currentUserId(): string {
    const u = this._user() as any;
    if (!u) return '';
    return (u._id ?? u.id ?? '').toString();
  }

  constructor(private http: HttpClient, private router: Router) {}

  // ─── Load from localStorage ────────────────────────────────
  private _loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      // Normalise: always ensure _id is set
      if (!parsed._id && parsed.id) parsed._id = parsed.id;
      return parsed as User;
    } catch {
      return null;
    }
  }

  // ─── Persist to localStorage ───────────────────────────────
  private _saveUser(user: any): void {
    // Normalise backend shapes: some responses have "id" instead of "_id"
    if (!user._id && user.id) user._id = user.id;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    this._user.set(user as User);
  }

  // ─── Remove from localStorage ──────────────────────────────
  private _clearUser(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
    this._user.set(null);
  }

  // ─── Register ──────────────────────────────────────────────
  register(data: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this._saveUser(res.data.user);
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
          this._saveUser(res.data.user);
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
          this._clearUser();
          this.router.navigate(['/auth/login']);
        }),
        catchError((err) => {
          // Still clear user on error
          this._clearUser();
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
          this._saveUser(res.data.user);
        }),
        catchError((err) => {
          this._clearUser();
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
          this._saveUser(res.data.user);
        }),
        catchError((err) => {
          this._clearUser();
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
    if (user) {
      this._saveUser(user);
    } else {
      this._clearUser();
    }
  }
}

