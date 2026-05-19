import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

// ─── Token Refresh State ───────────────────────────────────────
// Prevents multiple simultaneous refresh calls
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean>(false);

// ─── Auth Interceptor (Functional style - Angular 17+) ─────────
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);

  // Clone request with credentials (sends cookies automatically)
  const reqWithCredentials = req.clone({ withCredentials: true });

  return next(reqWithCredentials).pipe(
    catchError((error: HttpErrorResponse) => {

      // ── Handle 401 (Token Expired) ─────────────────────────
      if (
        error.status === 401 &&
        error.error?.code === 'TOKEN_EXPIRED' &&
        !req.url.includes('/auth/refresh-token') &&
        !req.url.includes('/auth/login')
      ) {
        return handleTokenRefresh(req, next, authService);
      }

      // ── Handle 403 (Forbidden) ─────────────────────────────
      if (error.status === 403) {
        authService.setUser(null);
      }

      return throwError(() => error);
    })
  );
};

// ─── Handle Token Refresh Logic ────────────────────────────────
function handleTokenRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(false);

    return authService.refresh().pipe(
      switchMap(() => {
        isRefreshing = false;
        refreshSubject.next(true);
        // Retry original request after refresh
        return next(req.clone({ withCredentials: true }));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshSubject.next(false);
        return throwError(() => err);
      })
    );
  }

  // Wait for refresh to complete then retry
  return refreshSubject.pipe(
    filter((done) => done === true),
    take(1),
    switchMap(() => next(req.clone({ withCredentials: true })))
  );
}
