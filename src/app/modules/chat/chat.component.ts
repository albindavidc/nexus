import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ChatSidebarComponent } from './components/chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatSidebarComponent, ChatWindowComponent],
  template: `
    <div class="chat-layout">
      <app-chat-sidebar (selectChat)="onChatSelected($event)"></app-chat-sidebar>
      <app-chat-window [activeChat]="activeChat"></app-chat-window>
    </div>
  `,
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  authService = inject(AuthService);
  activeChat: any = null;

  constructor() {
    // Select Nexus AI by default based on the mock data
    this.activeChat = {
      id: 1,
      name: 'Nexus AI',
      avatarColor: '#ff5722',
      icon: '🤖',
      lastMessage: 'Great workout today! Kee...',
      time: '2m',
      unreadCount: 2,
      isOnline: true
    };
  }

  onChatSelected(chat: any) {
    this.activeChat = chat;
  }
}
