import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private socketService = inject(SocketService);

  getConversations(): Observable<any> {
    return this.socketService.emitWithAck('get_my_conversations', {});
  }

  searchUsers(query: string): Observable<any> {
    // This endpoint remains HTTP as it's an Auth module search route
    return this.http.get<any>(`${environment.apiUrl}/auth/users/search?q=${query}`);
  }

  startDirectConversation(userId: string): Observable<any> {
    return this.socketService.emitWithAck('start_direct_conversation', { userId });
  }

  getMessages(conversationId: string, page: number = 1, limit: number = 50): Observable<any> {
    return this.socketService.emitWithAck('get_messages', { conversationId, page, limit });
  }

  sendMessage(conversationId: string, text: string): Observable<any> {
    return this.socketService.emitWithAck('send_message', { conversationId, content: text });
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.socketService.emitWithAck('mark_conversation_read', { conversationId });
  }

  clearConversation(conversationId: string): Observable<any> {
    return this.socketService.emitWithAck('clear_conversation', { conversationId });
  }

  uploadMedia(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('media', file);
    return this.http.post<any>(`${environment.apiUrl}/chat/upload`, formData, {
      withCredentials: true
    });
  }
}
