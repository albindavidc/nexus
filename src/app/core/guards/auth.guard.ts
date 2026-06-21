import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { catchError, map, of } from 'rxjs';

// ─── Auth Guard - Protects private routes ──────────────────────
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already authenticated in memory, allow
  if (authService.isAuthenticated()) {
    return true;
  }

  // Try to fetch user (validates cookie on server)
  return authService.getMe().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/auth/login']);
      return of(false);
    })
  );
};

// ─── Guest Guard - Redirects logged-in users away from auth pages
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/chat']);
    return false;
  }

  return true;
};
