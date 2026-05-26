import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatBotMessage {
  role: 'user' | 'assistant';
  message: string;
}

export interface ChatBotRequest {
  message: string;
  history?: ChatBotMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chatbot`;

  chat(data: ChatBotRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chat`, data);
  }

  stream(data: ChatBotRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/stream`, data, {
      responseType: 'text' as 'json',
      observe: 'events'
    });
  }

  bulkChat(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bulk`, data);
  }

  getHistory(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/history`);
  }

  clearHistory(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/history`);
  }
}
