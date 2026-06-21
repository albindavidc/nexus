import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { catchError, EMPTY, from, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly sw = inject(SwPush);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  init(): void {
    if (!this.sw.isEnabled) {
      return;
    }

    this.listenForMessage();
    this.listenForNotificationClicks();
  }

  subscribe() {
    if (!this.sw.isEnabled) return;

    from(
      this.sw.requestSubscription({
        serverPublicKey: environment.vapidPublicKey,
      }),
    ).pipe(
      switchMap((sub) =>
        this.http.post(`${environment.apiUrl}/push/subscribe`, sub, {
          withCredentials: true,
        }),
      ),
      catchError((error) => {
        return EMPTY;
      }),
    );
  }

  unsubscribe() {
    if (!this.sw.isEnabled) return;

    from(this.sw.subscription).pipe(
      switchMap((sub) =>
        this.http.post(`${environment.apiUrl}/push/unsubscribe`, sub, {
          withCredentials: true,
        }),
      ),
      catchError((error) => {
        return EMPTY;
      }),
    );
  }

  private listenForMessage() {
    this.sw.messages.subscribe();
  }

  private listenForNotificationClicks() {
    this.sw.notificationClicks
      .pipe(
        tap(({ notification }) => {
          const url = notification.data?.url;
          if (url) {
            this.router.navigateByUrl(url);
          }
        }),
      )
      .subscribe();
  }
}
