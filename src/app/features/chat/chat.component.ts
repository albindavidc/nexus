import { Component, inject, OnInit, OnDestroy } from '@angular/core';


import { SocketService } from '../../core/services/socket.service';
import { ChatSidebarComponent } from './components/chat-sidebar/chat-sidebar.component';
import { GroupChatComponent } from './components/group-chat/group-chat.component';
import { ChatComponent as DirectChatComponent } from './components/chat/chat.component';
import { AIChatComponent } from './components/ai-chat/ai-chat.component';
import { AuthService } from '../auth/services/auth.service';
import { GroupService } from './services/group.service';
import { ChatService } from './services/chat.service';
import { IConversation, IGroup } from './models/chat.models';
import { UISearchResult } from './components/chat-sidebar/chat-sidebar.component';

export interface UIDirectChat extends IConversation {
  id?: string | number;
  avatarColor?: string;
  icon?: string;
  time?: string;
  unreadCount?: number;
}

export interface UIGroupChat extends IGroup {
  id?: string | number;
  avatarColor?: string;
  icon?: string;
  time?: string;
  unreadCount?: number;
}
import { NotificationsComponent } from './components/notifications/notifications.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    ChatSidebarComponent,
    GroupChatComponent,
    DirectChatComponent,
    AIChatComponent,
    NotificationsComponent
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
            const otherParticipant = c.participants?.find((p) => {
              const pId = p._id || (p as unknown as string);
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

  onChatSelected(chat: UIDirectChat | UIGroupChat | UISearchResult | { reloadGroups: boolean; chat?: UIDirectChat | UIGroupChat | UISearchResult }) {
    if (chat && 'reloadGroups' in chat && chat.reloadGroups) {
      const targetId = chat.chat?._id || chat.chat?.id;
      this.fetchGroups(targetId?.toString());
      this.fetchConversations();
    } else {
      if (this.currentTab === 'CHAT') {
        this.activeDirectChat = chat as UIDirectChat;
      } else {
        this.activeGroupChat = chat as UIGroupChat;
      }
    }
  }

  onPresenceChange() {
    if (this.activeDirectChat) {
      this.activeDirectChat = { ...this.activeDirectChat } as UIDirectChat;
    }
    if (this.activeGroupChat) {
      this.activeGroupChat = { ...this.activeGroupChat } as UIGroupChat;
    }
  }

  onGroupAction(event: { action: string; groupId?: string }) {
    if (event.action === 'update') {
      this.fetchGroups(event.groupId);
    } else if (event.action === 'delete' || event.action === 'leave') {
      this.activeGroupChat = null;
      this.fetchGroups();
      this.fetchConversations();
    }
  }
}
