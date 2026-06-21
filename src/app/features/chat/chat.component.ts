import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SocketService } from '../../core/services/socket.service';
import { ChatSidebarComponent } from './components/chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { PartnerChatComponent } from './components/partner-chat/partner-chat.component';
import { AIChatComponent } from './components/ai-chat/ai-chat.component';
import { AuthService } from '../auth/services/auth.service';
import { GroupService } from './services/group.service';
import { ChatService } from './services/chat.service';
import { IConversation, IGroup } from './models/chat.models';

export interface UIDirectChat extends IConversation {
  avatarColor?: string;
  icon?: string;
  time?: string;
  unreadCount?: number;
}

export interface UIGroupChat extends IGroup {
  avatarColor?: string;
  icon?: string;
  time?: string;
  unreadCount?: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ChatSidebarComponent,
    ChatWindowComponent,
    PartnerChatComponent,
    AIChatComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  groupService = inject(GroupService);
  chatService = inject(ChatService);
  private socketService = inject(SocketService);

  groups: UIGroupChat[] = [];
  conversations: UIDirectChat[] = [];

  currentTab = 'CHAT';
  activeDirectChat:
    | UIDirectChat
    | { type: string; id?: string; _id?: string }
    | null = null;
  activeGroupChat: UIGroupChat | null = null;

  ngOnInit() {
    this.socketService.connect();

    this.fetchConversations();
    this.fetchGroups();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  fetchConversations() {
    this.chatService.getConversations().subscribe({
      next: (res) => {
        const currentUserId = this.authService.user()?._id;
        const apiConversations: UIDirectChat[] =
          res.data?.conversations?.map((c: IConversation) => {
            const otherParticipant: any = c.participants?.find((p: any) => {
              const pId = p._id || p;
              return pId !== currentUserId;
            });

            return {
              ...c,
              name: otherParticipant
                ? `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim() ||
                  otherParticipant.username
                : 'Nexus User',
              avatarColor: '#4A90E2',
              icon: '👤',
              time: 'Now',
              unreadCount: 0,
              isActive: true,
              type: 'DIRECT',
            };
          }) || [];

        this.conversations = apiConversations;

        if (!this.activeDirectChat && this.conversations.length > 0) {
          this.activeDirectChat = this.conversations[0];
        }
      },
      error: (err) => {
        console.error('Failed to fetch direct conversations', err);
        this.conversations = [];
      },
    });
  }

  fetchGroups(targetId?: string) {
    this.groupService.getMyGroups().subscribe({
      next: (res) => {
        this.groups =
          res.data?.groups?.map((g: IGroup) => ({
            ...g,
            avatarColor: g.theme || '#1e1e1e',
            icon: this.getIcon(g.name || ''),
            time: 'Now',
            unreadCount: 0,
            isActive: true,
          })) || [];

        if (!this.activeGroupChat && this.groups.length > 0) {
          this.activeGroupChat = this.groups[0];
        }

        if (targetId) {
          this.activeGroupChat =
            this.groups.find((g) => g._id === targetId) ||
            this.activeGroupChat;
        }
      },
      error: (err) => {
        console.error('Failed to fetch groups', err);
      },
    });
  }

  getIcon(name: string) {
    if (name.toLowerCase().includes('warrior')) return '👥';
    if (name.toLowerCase().includes('hiit')) return '🔥';
    if (name.toLowerCase().includes('yoga')) return '🧘';
    return '👥';
  }

  onTabChange(tab: string) {
    this.currentTab = tab;
    if (tab === 'CHAT') {
      this.fetchConversations();
    } else {
      this.fetchGroups();
    }
  }

  onChatSelected(chat: any) {
    if (chat && chat.reloadGroups) {
      const targetId = chat.chat?._id || chat.chat?.id;
      this.fetchGroups(targetId);
      this.fetchConversations();
    } else {
      if (this.currentTab === 'CHAT') {
        this.activeDirectChat = chat as UIDirectChat;
      } else {
        this.activeGroupChat = chat as UIGroupChat;
      }
    }
  }

  onGroupAction(event: any) {
    if (event.action === 'update') {
      this.fetchGroups(event.groupId);
    } else if (event.action === 'delete' || event.action === 'leave') {
      this.activeGroupChat = null;
      this.fetchGroups();
      this.fetchConversations();
    }
  }
}
