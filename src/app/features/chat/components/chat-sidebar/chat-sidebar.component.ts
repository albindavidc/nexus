import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SocketService } from '../../../../core/services/socket.service';
import { IConversation, IGroup, IUser } from '../../models/chat.models';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

export interface UIDirectChat extends IConversation {
  id?: string | number;
  avatarColor?: string;
  icon?: string;
  time?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

export interface UIGroupChat extends IGroup {
  id?: string | number;
  avatarColor?: string;
  icon?: string;
  time?: string;
  unreadCount?: number;
  isOnline?: boolean;
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
export class ChatSidebarComponent implements OnChanges, OnInit, OnDestroy {
  @Input() groups: UIGroupChat[] = [];
  @Input() conversations: UIDirectChat[] = [];
  @Output() selectChat = new EventEmitter<unknown>();
  @Output() tabChange = new EventEmitter<string>();
  @Output() presenceChange = new EventEmitter<void>();

  activeTab = 'CHAT';
  activeDirectChatId: string | number = '';
  activeGroupChatId: string | number = '';

  tabs = ['CHAT', 'GROUPS', 'AI COACH'];

  searchQuery = '';
  searchResults: UISearchResult[] = [];
  isSearching = false;
  isCreatingGroup = false;
  hasUnreadNotifications = false;

  newGroup = {
    name: '',
    description: '',
    participantIds: [] as string[],
    theme: '#ff6600'
  };

  participantSearchQuery = '';
  participantSearchResults: IUser[] = [];
  selectedParticipants: IUser[] = [];

  availableThemes = [
    { name: 'Nexus Orange', value: '#ff6600' },
    { name: 'Neon Blue', value: '#00bfff' },
    { name: 'Toxic Green', value: '#39ff14' },
    { name: 'Cyber Purple', value: '#b026ff' },
    { name: 'Crimson Red', value: '#ff003c' }
  ];

  private groupService = inject(GroupService);
  private chatService = inject(ChatService);
  private socketService = inject(SocketService);
  authService = inject(AuthService);

  private presenceSubscription: any = null;
  private searchSubject = new Subject<string>();

  get currentUser() {
    return this.authService.user();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['conversations'] || changes['groups']) {
      this.recalculateOnlineStatuses();
    }
    
    if (changes['conversations'] && this.conversations && this.conversations.length > 0 && !this.activeDirectChatId) {
      const firstConv = this.conversations[0];
      this.activeDirectChatId = firstConv._id || '';
    }
  }

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query.trim()) {
          this.participantSearchResults = [];
          return [];
        }
        return this.chatService.searchUsers(query);
      })
    ).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const myId = this.authService.currentUserId;
          this.participantSearchResults = (res.data.users || []).filter(
            (u: IUser) => u._id !== myId && !this.selectedParticipants.some((p) => p._id === u._id)
          );
        }
      },
      error: (err: Error) => console.error('Search failed', err)
    });

    const onlineSub = this.socketService.onEvent<{ userId: string }>('user_online').subscribe(({ userId }) => {
      this.updateUserOnlineStatus(userId, true);
    });

    const offlineSub = this.socketService.onEvent<{ userId: string }>('user_offline').subscribe(({ userId }) => {
      this.updateUserOnlineStatus(userId, false);
    });

    const notifSub = this.socketService.onEvent<any>('new_notification').subscribe(() => {
      if (this.activeTab !== 'NOTIFICATIONS') {
        this.hasUnreadNotifications = true;
      }
    });

    this.presenceSubscription = {
      unsubscribe: () => {
        onlineSub.unsubscribe();
        offlineSub.unsubscribe();
        notifSub.unsubscribe();
      }
    };
  }

  ngOnDestroy() {
    if (this.presenceSubscription) {
      this.presenceSubscription.unsubscribe();
      this.presenceSubscription = null;
    }
  }

  private recalculateOnlineStatuses() {
    const myId = this.authService.currentUserId;
    
    if (this.conversations) {
      this.conversations.forEach(chat => {
        if (!chat.participants) return;
        const partner = chat.participants.find(p => p._id !== myId);
        if (partner) {
          chat.isOnline = partner.status === 'online';
        }
      });
    }

    if (this.groups) {
      this.groups.forEach(group => {
        if (!group.members) return;
        // Group is considered 'online' in sidebar if any member (other than me) is online
        const hasOnlineMember = group.members.some(m => {
           const uId = m.user?._id;
           return uId !== myId && m.user?.status === 'online';
        });
        group.isOnline = hasOnlineMember;
      });
    }
  }

  private updateUserOnlineStatus(userId: string, isOnline: boolean) {
    // Update underlying participant/member object and the derived `isOnline` flag
    const statusStr = isOnline ? 'online' : 'offline';
    const myId = this.authService.currentUserId;

    if (this.conversations) {
      this.conversations.forEach(chat => {
        if (chat.participants) {
          const participant = chat.participants.find(p => p._id === userId);
          if (participant) {
            participant.status = statusStr;
            // Update chat's isOnline if this was the partner
            if (participant._id !== myId) {
              chat.isOnline = isOnline;
            }
          }
        }
      });
    }

    if (this.groups) {
      this.groups.forEach(group => {
        let memberUpdated = false;
        if (group.members) {
          const member = group.members.find(m => m.user?._id === userId);
          if (member && member.user) {
            member.user.status = statusStr;
            memberUpdated = true;
          }
        }
        
        // Recalculate group.isOnline if a member was updated
        if (memberUpdated) {
          group.isOnline = group.members?.some(m => {
            const uId = m.user?._id;
            return uId !== myId && m.user?.status === 'online';
          }) || false;
        }
      });
    }

    this.presenceChange.emit();
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
    if (tab === 'NOTIFICATIONS') {
      this.hasUnreadNotifications = false;
    }
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
    if (this.selectedParticipants.length === 0) {
      alert('Please select at least one participant.');
      return;
    }
    
    const payload: any = { ...this.newGroup };

    this.groupService.createGroup(payload).subscribe({
       next: (res: any) => {
          this.isCreatingGroup = false;
          this.newGroup = { name: '', description: '', participantIds: [], theme: '#ff6600' };
          this.selectedParticipants = [];
          this.participantSearchQuery = '';
          this.participantSearchResults = [];
          this.selectChat.emit({ reloadGroups: true, chat: res.data?.conversation });
       },
       error: (err: Error) => console.error('Error creating group:', err)
    });
  }

  searchParticipants() {
    this.searchSubject.next(this.participantSearchQuery);
  }

  addParticipant(user: IUser) {
    if (!this.selectedParticipants.some((u) => u._id === user._id)) {
      this.selectedParticipants.push(user);
      this.newGroup.participantIds.push(user._id as string);
      this.participantSearchResults = this.participantSearchResults.filter(
        (u) => u._id !== user._id
      );
      this.participantSearchQuery = '';
    }
  }

  removeParticipant(user: IUser) {
    this.selectedParticipants = this.selectedParticipants.filter(
      (u) => u._id !== user._id
    );
    this.newGroup.participantIds = this.newGroup.participantIds.filter(
      (id) => id !== user._id
    );
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
