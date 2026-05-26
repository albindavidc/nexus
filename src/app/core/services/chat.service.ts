import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chat`;

  getConversations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/conversations`);
  }

  searchUsers(query: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/auth/users/search?q=${query}`);
  }

  startDirectConversation(userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/conversations/direct/${userId}`, {});
  }

  getMessages(conversationId: string, page: number = 1, limit: number = 50): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  sendMessage(conversationId: string, text: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/conversations/${conversationId}/messages`, { content: text });
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/conversations/${conversationId}/read`, {});
  }

  clearConversation(conversationId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/conversations/${conversationId}/clear`);
  }
}
