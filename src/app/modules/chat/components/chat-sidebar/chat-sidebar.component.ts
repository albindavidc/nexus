import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss']
})
export class ChatSidebarComponent {
  @Output() selectChat = new EventEmitter<any>();

  activeTab = 'HOME';
  activeChatId = 1;

  tabs = ['HOME', 'GROUPS', 'PROFILE'];

  aiCoaches = [
    {
      id: 1,
      name: 'Nexus AI',
      avatarColor: '#ff5722',
      icon: '🤖',
      lastMessage: 'Great workout today! Kee...',
      time: '2m',
      unreadCount: 2,
      isOnline: true
    },
    {
      id: 2,
      name: 'Burn Bot',
      avatarColor: '#ff7043',
      icon: '🔥',
      lastMessage: 'Ready for tomorrow\'s HIIT sessi...',
      time: '1h',
      unreadCount: 0,
      isOnline: true
    },
    {
      id: 3,
      name: 'NutriGuide',
      avatarColor: '#ff9800',
      icon: '🥗',
      lastMessage: 'Your meal plan is ready',
      time: '3h',
      unreadCount: 0,
      isOnline: false
    },
    {
      id: 4,
      name: 'ZenFlow',
      avatarColor: '#ffb74d',
      icon: '🧘',
      lastMessage: 'Don\'t forget your rest day',
      time: '5h',
      unreadCount: 0,
      isOnline: false
    }
  ];

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onSelectChat(coach: any) {
    this.activeChatId = coach.id;
    this.selectChat.emit(coach);
  }
}
