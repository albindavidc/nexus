import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface INotification {
  _id: string;
  userId: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: {
    notifications: INotification[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/notifications`;

  getNotifications(): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(this.apiUrl, {
      withCredentials: true
    });
  }

  markAsRead(id: string): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}, {
      withCredentials: true
    });
  }

  markAllAsRead(): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/read-all`, {}, {
      withCredentials: true
    });
  }
}
