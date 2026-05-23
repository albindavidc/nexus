import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss']
})
export class ChatSidebarComponent {
  @Input() groups: any[] = [];
  @Output() selectChat = new EventEmitter<any>();

  activeTab = 'GROUPS';
  activeFilter = 'YOUR GROUPS'; // YOUR GROUPS or DISCOVER
  activeChatId: string | number = 1;

  tabs = ['HOME', 'GROUPS', 'PROFILE'];
  filters = ['YOUR GROUPS', 'DISCOVER'];

  setTab(tab: string) {
    this.activeTab = tab;
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  onSelectChat(group: any) {
    this.activeChatId = group.id || group._id;
    this.selectChat.emit(group);
  }
}
