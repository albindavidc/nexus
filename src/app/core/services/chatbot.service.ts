import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketService } from './socket.service';

export interface ChatBotMessage {
  role: 'user' | 'assistant';
  message: string;
}

export interface ChatBotRequest {
  conversationId: string;
  message: string;
  history?: ChatBotMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private socketService = inject(SocketService);

  chat(data: ChatBotRequest): Observable<any> {
    return this.socketService.emitWithAck('bot_chat_direct', data);
  }

  stream(data: ChatBotRequest): Observable<any> {
    return new Observable<string>((observer) => {
      this.socketService.emit('bot_message', data);

      const chunkSub = this.socketService.onEvent<any>('bot_chunk').subscribe(res => {
        if (res.conversationId === data.conversationId) {
          observer.next(res.chunk);
        }
      });
      
      const doneSub = this.socketService.onEvent<any>('bot_done').subscribe(res => {
        if (res.conversationId === data.conversationId) {
           observer.complete();
           chunkSub.unsubscribe();
           doneSub.unsubscribe();
           errorSub.unsubscribe();
        }
      });

      const errorSub = this.socketService.onEvent<any>('bot_error').subscribe(res => {
        if (res.conversationId === data.conversationId || !res.conversationId) {
           observer.error(new Error(res.message));
           chunkSub.unsubscribe();
           doneSub.unsubscribe();
           errorSub.unsubscribe();
        }
      });

      return () => {
        chunkSub.unsubscribe();
        doneSub.unsubscribe();
        errorSub.unsubscribe();
      };
    });
  }

  bulkChat(data: any): Observable<any> {
    return this.socketService.emitWithAck('bot_bulk_message', data);
  }

  getHistory(): Observable<any> {
    return this.socketService.emitWithAck('get_bot_history');
  }

  clearHistory(): Observable<any> {
    return this.socketService.emitWithAck('clear_bot_history');
  }
}
