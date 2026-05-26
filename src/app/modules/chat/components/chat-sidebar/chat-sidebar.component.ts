import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../../core/services/group.service';
import { ChatService } from '../../../../core/services/chat.service';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss']
})
export class ChatSidebarComponent implements OnChanges {
  @Input() groups: any[] = [];
  @Input() conversations: any[] = [];
  @Output() selectChat = new EventEmitter<any>();
  @Output() tabChange = new EventEmitter<string>();

  activeTab = 'CHAT';
  activeDirectChatId: string | number = '';
  activeGroupChatId: string | number = '';

  tabs = ['CHAT', 'GROUPS', 'AI COACH'];

  searchQuery = '';
  searchResults: any[] = [];
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['conversations'] && this.conversations && this.conversations.length > 0 && !this.activeDirectChatId) {
      const firstConv = this.conversations[0];
      this.activeDirectChatId = firstConv.id || firstConv._id;
    }
  }

  isJoined(group: any): boolean {
    const groupId = group._id || group.id;
    return this.groups.some(g => (g._id || g.id) === groupId);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = [];
    this.tabChange.emit(tab);
  }

  onSelectChat(group: any) {
    if (this.isSearching && this.activeTab === 'CHAT') {
       // Start a direct conversation if clicking a user
       this.chatService.startDirectConversation(group._id || group.id).subscribe({
          next: (res) => {
             const conv = res.data?.conversation || group;
             this.activeDirectChatId = conv._id || conv.id;
             this.selectChat.emit(conv);
             this.searchQuery = '';
             this.isSearching = false;
          },
          error: (err) => console.error(err)
       });
    } else {
       const id = group.id || group._id;
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
          next: (res) => {
             this.searchResults = res.data?.users?.map((u: any) => ({
                 ...u,
                 name: u.username,
                 description: `${u.firstName} ${u.lastName}`,
                 avatarColor: '#1e1e1e',
                 icon: '👤',
                 type: 'user'
             })) || [];
          }
       });
    } else if (this.activeTab === 'GROUPS') {
       this.groupService.searchGroups(this.searchQuery).subscribe({
          next: (res) => {
             this.searchResults = res.data?.groups?.map((g: any) => ({
                 ...g,
                 avatarColor: '#1e1e1e',
                 icon: '👥',
                 type: 'group'
             })) || [];
          }
       });
    }
  }

  joinGroup(group: any, event: Event) {
    event.stopPropagation();
    this.groupService.joinGroup(group._id || group.id).subscribe({
       next: (res) => {
          this.isSearching = false;
          this.searchQuery = '';
          // We should ideally reload groups from ChatComponent, so we emit an event
          this.selectChat.emit({ reloadGroups: true, chat: res.data?.group || group });
       },
       error: (err) => console.error(err)
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
       next: (res) => {
          this.isCreatingGroup = false;
          this.newGroup = { name: '', description: '', participantIds: [], theme: '#ff6600' };
          this.selectChat.emit({ reloadGroups: true, chat: res.data?.group });
       },
       error: (err) => console.error('Error creating group:', err)
    });
  }

  getLastMessageText(group: any): string {
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
