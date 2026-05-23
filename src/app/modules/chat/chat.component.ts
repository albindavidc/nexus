import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { ChatSidebarComponent } from './components/chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ChatSidebarComponent, ChatWindowComponent],
  template: `
    <div class="chat-layout">
      <app-chat-sidebar 
        [groups]="groups"
        (selectChat)="onChatSelected($event)"></app-chat-sidebar>
      <app-chat-window [activeChat]="activeChat"></app-chat-window>
    </div>
  `,
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  authService = inject(AuthService);
  groupService = inject(GroupService);
  
  groups: any[] = [];
  activeChat: any = null;

  ngOnInit() {
    this.fetchGroups();
  }

  fetchGroups() {
    this.groupService.getMyGroups().subscribe({
      next: (res) => {
        // Map backend groups to the UI format
        this.groups = res.data?.map((g: any) => ({
          ...g,
          // Add default UI properties if missing
          avatarColor: '#1e1e1e', // Dark avatar bg
          icon: this.getIcon(g.name),
          time: '1h',
          unreadCount: 0,
          isActive: true
        })) || [];

        // If no groups from backend, use fallback data for demonstration matching UI screenshot
        if (this.groups.length === 0) {
          this.loadMockGroups();
        }

        if (this.groups.length > 0) {
          this.activeChat = this.groups[0];
        }
      },
      error: (err) => {
        console.error('Failed to fetch groups', err);
        this.loadMockGroups();
        if (this.groups.length > 0) {
          this.activeChat = this.groups[0];
        }
      }
    });
  }

  getIcon(name: string) {
    if (name.toLowerCase().includes('warrior')) return '👥';
    if (name.toLowerCase().includes('hiit')) return '🔥';
    if (name.toLowerCase().includes('yoga')) return '🧘';
    return '👥';
  }

  loadMockGroups() {
    this.groups = [
      {
        id: 1,
        name: 'Morning Warriors',
        description: 'Early birds crushing their fitness goals before sunrise',
        avatarColor: '#1e1e1e',
        icon: '🌅',
        time: '2m',
        unreadCount: 4,
        isActive: true,
        members: new Array(1247),
        activeCount: 324
      },
      {
        id: 2,
        name: 'HIIT Squad',
        description: 'High intensity interval training lovers.',
        avatarColor: '#1e1e1e',
        icon: '🔥',
        time: '15m',
        unreadCount: 1,
        isActive: true,
        members: new Array(540),
        activeCount: 120
      },
      {
        id: 3,
        name: 'Yoga & Mindfulness',
        description: 'Sunrise flow and meditation.',
        avatarColor: '#1e1e1e',
        icon: '🧘',
        time: '1h',
        unreadCount: 0,
        isActive: true,
        members: new Array(890),
        activeCount: 45
      }
    ];
  }

  onChatSelected(chat: any) {
    this.activeChat = chat;
  }
}
