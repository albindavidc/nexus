import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SocketService } from '../../../core/services/socket.service';
import { environment } from '../../../../environments/environment';
import {
  IConversation,
  IMessage,
  IUser,
  ISocketResponse,
} from '../models/chat.models';

export interface SearchUsersResponse {
  success: boolean;
  data?: {
    users: IUser[];
  };
}

export interface UploadMediaResponse {
  success: boolean;
  data?: {
    mediaUrl: string;
    mediaMeta: {
      mimeType: string;
      size: number;
      filename: string;
    };
  };
}

export interface SearchMessagesResponse {
  success: boolean;
  data?: IMessage[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private socketService = inject(SocketService);

  getConversations(): Observable<
    ISocketResponse<{ conversations: IConversation[] }>
  > {
    return this.socketService.emitWithAck<
      ISocketResponse<{ conversations: IConversation[] }>
    >('get_my_conversations', {});
  }

  searchUsers(query: string): Observable<SearchUsersResponse> {
    return this.http.get<SearchUsersResponse>(
      `${environment.apiUrl}/auth/users/search?q=${query}`,
    );
  }

  startDirectConversation(
    userId: string,
  ): Observable<ISocketResponse<{ conversation: IConversation }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ conversation: IConversation }>
    >('start_direct_conversation', {
      userId,
    });
  }

  getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50,
  ): Observable<ISocketResponse<{ messages: IMessage[] }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ messages: IMessage[] }>
    >('get_messages', {
      conversationId,
      page,
      limit,
    });
  }

  sendMessage(
    conversationId: string,
    text: string,
  ): Observable<ISocketResponse<{ message: IMessage }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ message: IMessage }>
    >('send_message', {
      conversationId,
      content: text,
    });
  }

  markAsRead(conversationId: string): Observable<ISocketResponse<void>> {
    return this.socketService.emitWithAck<ISocketResponse<void>>(
      'mark_conversation_read',
      {
        conversationId,
      },
    );
  }

  clearConversation(conversationId: string): Observable<ISocketResponse<void>> {
    return this.socketService.emitWithAck<ISocketResponse<void>>(
      'clear_conversation',
      {
        conversationId,
      },
    );
  }

  uploadMedia(file: File): Observable<UploadMediaResponse> {
    const formData = new FormData();
    formData.append('media', file);
    return this.http.post<UploadMediaResponse>(
      `${environment.apiUrl}/chat/upload`,
      formData,
      {
        withCredentials: true,
      },
    );
  }

  searchMessagesInConversation(
    conversationId: string,
    query: string,
  ): Observable<SearchMessagesResponse> {
    return this.http.get<SearchMessagesResponse>(
      `${environment.apiUrl}/chat/${conversationId}/chat/search`,
      {
        params: {
          q: query,
        },
        withCredentials: true,
      },
    );
  }
}
