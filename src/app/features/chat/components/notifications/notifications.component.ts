import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, INotification } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications: INotification[] = [];
  isLoading = true;

  private notificationService = inject(NotificationService);

  ngOnInit() {
    this.fetchNotifications();
  }

  fetchNotifications() {
    this.isLoading = true;
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.data.notifications;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch notifications', err);
        this.isLoading = false;
      }
    });
  }

  markAsRead(notification: INotification) {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification._id).subscribe({
      next: () => {
        notification.isRead = true;
      },
      error: (err) => console.error('Failed to mark as read', err)
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
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
