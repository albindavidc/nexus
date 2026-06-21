import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../../auth/services/auth.service';
import { IConversation, IGroup, IUser } from '../../models/chat.models';

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

export interface UISearchResult {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  avatarColor?: string;
  icon?: string;
  type: 'user' | 'group';
}

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss']
})
export class ChatSidebarComponent implements OnChanges {
  @Input() groups: UIGroupChat[] = [];
  @Input() conversations: UIDirectChat[] = [];
  @Output() selectChat = new EventEmitter<unknown>();
  @Output() tabChange = new EventEmitter<string>();

  activeTab = 'CHAT';
  activeDirectChatId: string | number = '';
  activeGroupChatId: string | number = '';

  tabs = ['CHAT', 'GROUPS', 'AI COACH'];

  searchQuery = '';
  searchResults: UISearchResult[] = [];
  isSearching = false;
  isCreatingGroup = false;

  newGroup = {
    name: '',
    description: '',
    participantIds: [] as string[],
    theme: '#ff6600'
  };

  availableThemes = [
    { name: 'Nexus Orange', value: '#ff6600' },
    { name: 'Neon Blue', value: '#00bfff' },
    { name: 'Toxic Green', value: '#39ff14' },
    { name: 'Cyber Purple', value: '#b026ff' },
    { name: 'Crimson Red', value: '#ff003c' }
  ];

  private groupService = inject(GroupService);
  private chatService = inject(ChatService);
  authService = inject(AuthService);

  get currentUser() {
    return this.authService.user();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['conversations'] && this.conversations && this.conversations.length > 0 && !this.activeDirectChatId) {
      const firstConv = this.conversations[0];
      this.activeDirectChatId = firstConv._id || '';
    }
  }

  isJoined(group: UIGroupChat | UISearchResult): boolean {
    const groupId = group._id;
    return this.groups.some(g => g._id === groupId);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = [];
    this.tabChange.emit(tab);
  }

  onSelectChat(group: UIDirectChat | UIGroupChat | UISearchResult) {
    if (this.isSearching && this.activeTab === 'CHAT') {
       // Start a direct conversation if clicking a user
       this.chatService.startDirectConversation(group._id || (group as any).id || '').subscribe({
          next: (res) => {
             const conv = res.data?.conversation || group;
             this.activeDirectChatId = conv._id || '';
             this.selectChat.emit(conv);
             this.searchQuery = '';
             this.isSearching = false;
          },
          error: (err) => console.error(err)
       });
    } else {
       const id = group._id || '';
       if (this.activeTab === 'CHAT') {
          this.activeDirectChatId = id;
         } else {
          this.activeGroupChatId = id;
         }
       this.selectChat.emit(group);
    }
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) {
      this.isSearching = false;
      this.searchResults = [];
      return;
    }
    this.isSearching = true;
    this.performSearch();
  }

  performSearch() {
    if (this.activeTab === 'CHAT') {
       this.chatService.searchUsers(this.searchQuery).subscribe({
          next: (res: any) => {
             this.searchResults = res.data?.users?.map((u: IUser) => ({
                 ...u,
                 name: u.username,
                 description: `${(u as any).firstName || ''} ${(u as any).lastName || ''}`,
                 avatarColor: '#1e1e1e',
                 icon: '👤',
                 type: 'user'
             })) || [];
          }
       });
    } else if (this.activeTab === 'GROUPS') {
       this.groupService.searchGroups(this.searchQuery).subscribe({
          next: (res) => {
             this.searchResults = res.data?.groups?.map((g: IGroup) => ({
                 ...g,
                 avatarColor: '#1e1e1e',
                 icon: '👥',
                 type: 'group'
             })) || [];
          }
       });
    }
  }

  joinGroup(group: UISearchResult, event: Event) {
    event.stopPropagation();
    this.groupService.joinGroup(group._id || '').subscribe({
       next: (res: any) => {
          this.isSearching = false;
          this.searchQuery = '';
          this.selectChat.emit({ reloadGroups: true, chat: res.data?.group || group });
       },
       error: (err: Error) => console.error(err)
    });
  }

  toggleCreateGroup() {
    this.isCreatingGroup = !this.isCreatingGroup;
  }

  createGroupSubmit() {
    if (!this.newGroup.name.trim()) return;
    
    const payload: any = { ...this.newGroup };
    if (!payload.participantIds || payload.participantIds.length === 0) {
       delete payload.participantIds;
    }

    this.groupService.createGroup(payload).subscribe({
       next: (res: any) => {
          this.isCreatingGroup = false;
          this.newGroup = { name: '', description: '', participantIds: [], theme: '#ff6600' };
          this.selectChat.emit({ reloadGroups: true, chat: res.data?.conversation });
       },
       error: (err: Error) => console.error('Error creating group:', err)
    });
  }

  getLastMessageText(group: UIDirectChat | UIGroupChat | null | undefined): string {
    if (!group) return '';
    if (group.lastMessage) {
      if (typeof group.lastMessage === 'object' && group.lastMessage.content) {
        return group.lastMessage.content;
      }
      if (typeof group.lastMessage === 'string') {
        return group.lastMessage;
      }
    }
    return group.description || '';
  }
}
