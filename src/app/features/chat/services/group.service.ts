import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SocketService } from '../../../core/services/socket.service';
import { environment } from '../../../../environments/environment';
import {
  IGroup,
  IMessage,
  ISocketResponse,
  IMediaMeta,
} from '../models/chat.models';

export interface CreateGroupDto {
  name: string;
  description?: string;
  participantIds: string[];
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private socketService = inject(SocketService);
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chat`;

  getMyGroups(): Observable<ISocketResponse<{ groups: IGroup[] }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ groups: IGroup[] }>
    >('group:get_my_groups');
  }

  getGroupById(
    groupId: string,
  ): Observable<ISocketResponse<{ group: IGroup }>> {
    return this.socketService.emitWithAck<ISocketResponse<{ group: IGroup }>>(
      'group:get_by_id',
      { groupId },
    );
  }

  createGroup(
    data: CreateGroupDto,
  ): Observable<ISocketResponse<{ conversation: IGroup }>> {
    return this.http.post<ISocketResponse<{ conversation: IGroup }>>(`${this.apiUrl}/group`, data, {
      withCredentials: true,
    });
  }

  joinGroup(groupId: string): Observable<ISocketResponse<{ group: IGroup }>> {
    return this.socketService.emitWithAck<ISocketResponse<{ group: IGroup }>>(
      'group:join',
      { groupId },
    );
  }

  searchGroups(
    query: string,
  ): Observable<ISocketResponse<{ groups: IGroup[] }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ groups: IGroup[] }>
    >('group:search', { q: query });
  }

  updateGroup(
    groupId: string,
    data: UpdateGroupDto,
  ): Observable<ISocketResponse<{ group: IGroup }>> {
    return this.socketService.emitWithAck<ISocketResponse<{ group: IGroup }>>(
      'group:update',
      { groupId, ...data },
    );
  }

  deleteGroup(groupId: string): Observable<ISocketResponse<void>> {
    return this.socketService.emitWithAck<ISocketResponse<void>>(
      'group:delete',
      { groupId },
    );
  }

  leaveGroup(groupId: string): Observable<ISocketResponse<void>> {
    return this.socketService.emitWithAck<ISocketResponse<void>>(
      'group:leave',
      {
        groupId,
      },
    );
  }

  getGroupMessages(
    groupId: string,
  ): Observable<ISocketResponse<{ messages: IMessage[] }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ messages: IMessage[] }>
    >('group:get_messages', { groupId });
  }

  sendGroupMessage(
    groupId: string,
    text: string,
    options?: { type?: string; mediaUrl?: string; mediaMeta?: IMediaMeta },
  ): Observable<ISocketResponse<{ message: IMessage }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ message: IMessage }>
    >('group:send_message', {
      groupId,
      content: text,
      type: options?.type,
      mediaUrl: options?.mediaUrl,
      mediaMeta: options?.mediaMeta,
    });
  }

  addMembers(
    groupId: string,
    userIds: string[],
  ): Observable<ISocketResponse<{ group: IGroup }>> {
    return this.socketService.emitWithAck<ISocketResponse<{ group: IGroup }>>(
      'group:add_members',
      { groupId, userIds },
    );
  }

  removeMember(
    groupId: string,
    targetUserId: string,
  ): Observable<ISocketResponse<{ group: IGroup }>> {
    return this.socketService.emitWithAck<ISocketResponse<{ group: IGroup }>>(
      'group:remove_member',
      { groupId, targetUserId },
    );
  }
}
