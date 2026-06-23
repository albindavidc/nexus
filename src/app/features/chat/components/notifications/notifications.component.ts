import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, INotification } from '../../services/notification.service';
import { SocketService } from '../../../../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: INotification[] = [];
  isLoading = true;

  private notificationService = inject(NotificationService);
  private socketService = inject(SocketService);
  private cdr = inject(ChangeDetectorRef);
  private socketSub?: Subscription;

  ngOnInit() {
    this.fetchNotifications();

    this.socketSub = this.socketService.onEvent<INotification>('new_notification').subscribe({
      next: (newNotification) => {
        this.notifications = [newNotification, ...this.notifications];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
    }
  }

  fetchNotifications() {
    this.isLoading = true;
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.data.notifications;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch notifications', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  markAsRead(notification: INotification) {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification._id).subscribe({
      next: () => {
        notification.isRead = true;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to mark as read', err)
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to mark all as read', err)
    });
  }

  getIconForType(type: string): string {
    switch(type) {
      case 'system': return '⚙️';
      case 'message': return '💬';
      case 'group': return '👥';
      case 'alert': return '⚠️';
      default: return '🔔';
    }
  }
}
