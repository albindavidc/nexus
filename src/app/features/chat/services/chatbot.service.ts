import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketService } from '../../../core/services/socket.service';
import { ISocketResponse } from '../models/chat.models';

export interface ChatBotMessage {
  role: 'user' | 'assistant';
  message: string;
}

export interface ChatBotRequest {
  conversationId: string;
  message: string;
  history?: ChatBotMessage[];
}

export interface ChatBotChunkEvent {
  conversationId: string;
  chunk: string;
}

export interface ChatBotDoneEvent {
  conversationId: string;
}

export interface ChatBotErrorEvent {
  conversationId?: string;
  message: string;
}

export interface BulkChatRequest {
  conversationIds: string[];
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private socketService = inject(SocketService);

  chat(data: ChatBotRequest): Observable<ISocketResponse<{ reply: string }>> {
    return this.socketService.emitWithAck<ISocketResponse<{ reply: string }>>(
      'bot_chat_direct',
      data,
    );
  }

  stream(data: ChatBotRequest): Observable<string> {
    return new Observable<string>((observer) => {
      this.socketService.emit('bot_message', data);

      const chunkSub = this.socketService
        .onEvent<ChatBotChunkEvent>('bot_chunk')
        .subscribe((res) => {
          if (res.conversationId === data.conversationId) {
            observer.next(res.chunk);
          }
        });

      const doneSub = this.socketService
        .onEvent<ChatBotDoneEvent>('bot_done')
        .subscribe((res) => {
          if (res.conversationId === data.conversationId) {
            observer.complete();
            chunkSub.unsubscribe();
            doneSub.unsubscribe();
            errorSub.unsubscribe();
          }
        });

      const errorSub = this.socketService
        .onEvent<ChatBotErrorEvent>('bot_error')
        .subscribe((res) => {
          if (
            res.conversationId === data.conversationId ||
            !res.conversationId
          ) {
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

  bulkChat(data: BulkChatRequest): Observable<ISocketResponse<void>> {
    return this.socketService.emitWithAck<ISocketResponse<void>>(
      'bot_bulk_message',
      data,
    );
  }

  getHistory(): Observable<ISocketResponse<{ history: ChatBotMessage[] }>> {
    return this.socketService.emitWithAck<
      ISocketResponse<{ history: ChatBotMessage[] }>
    >('get_bot_history');
  }

  clearHistory(): Observable<ISocketResponse<void>> {
    return this.socketService.emitWithAck<ISocketResponse<void>>(
      'clear_bot_history',
    );
  }
}
