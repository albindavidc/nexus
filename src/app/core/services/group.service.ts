import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketService } from './socket.service';

export interface GroupMember {
  user: any;
  role: string;
  joinedAt: Date;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: GroupMember[];
  type: string;
  isActive: boolean;
  participants: string[];
  admins: string[];
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private socketService = inject(SocketService);

  getMyGroups(): Observable<any> {
    return this.socketService.emitWithAck('group:get_my_groups');
  }

  getGroupById(groupId: string): Observable<any> {
    return this.socketService.emitWithAck('group:get_by_id', { groupId });
  }

  createGroup(data: any): Observable<any> {
    return this.socketService.emitWithAck('group:create', data);
  }

  joinGroup(groupId: string): Observable<any> {
    return this.socketService.emitWithAck('group:join', { groupId });
  }

  searchGroups(query: string): Observable<any> {
    return this.socketService.emitWithAck('group:search', { q: query });
  }

  updateGroup(groupId: string, data: any): Observable<any> {
    return this.socketService.emitWithAck('group:update', { groupId, ...data });
  }

  deleteGroup(groupId: string): Observable<any> {
    return this.socketService.emitWithAck('group:delete', { groupId });
  }

  leaveGroup(groupId: string): Observable<any> {
    return this.socketService.emitWithAck('group:leave', { groupId });
  }

  getGroupMessages(groupId: string): Observable<any> {
    return this.socketService.emitWithAck('group:get_messages', { groupId });
  }

  sendGroupMessage(groupId: string, text: string): Observable<any> {
    return this.socketService.emitWithAck('group:send_message', { groupId, content: text });
  }
}
