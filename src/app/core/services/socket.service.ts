import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;
  private socketUrl = (() => {
    const url = new URL(environment.apiUrl);
    return url.origin;
  })();

  private pendingJoins: string[] = [];
  private hasAttemptedRefresh = false;

  connect(): void {
    if (this.socket?.connected || this.socket) return;

    this.socket = io(this.socketUrl, {
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket connected:', this.socket?.id);
      this.hasAttemptedRefresh = false;

      this.pendingJoins.forEach((id) => {
        this.socket?.emit('join_conversation', { conversationId: id });
        console.log(`⚡ (buffered) Joined room: ${id}`);
      });
      this.pendingJoins = [];
    });

    this.socket.on('connect_error', async (err) => {
      console.error('❌ Socket connection error:', err.message);

      if (
        (err.message === 'Invalid Token' ||
          err.message === 'Unauthenticated') &&
        !this.hasAttemptedRefresh
      ) {
        this.hasAttemptedRefresh = true;
        console.log('🔄 Attempting token refresh before reconnecting...');

        const refreshed = await this.refreshToken();
        if (refreshed) {
          console.log('✅ Token refreshed, reconnecting socket...');
          this.socket?.disconnect();
          this.socket = null;
          this.connect();
        } else {
          console.error('❌ Token refresh failed. User must re-login.');
        }
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.pendingJoins = [];
      this.hasAttemptedRefresh = false;
      console.log('⚡ Socket disconnected');
    }
  }

  joinConversation(conversationId: string): void {
    this.ensureConnected();

    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
      console.log(`⚡ Joined room: ${conversationId}`);
    } else {
      if (!this.pendingJoins.includes(conversationId)) {
        this.pendingJoins.push(conversationId);
        console.log(`⚡ Buffered room join: ${conversationId}`);
      }
    }
  }

  leaveConversation(conversationId: string): void {
    this.pendingJoins = this.pendingJoins.filter((id) => id !== conversationId);
    if (this.socket) {
      this.socket.emit('leave_conversation', { conversationId });
      console.log(`⚡ Left room: ${conversationId}`);
    }
  }

  onEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      this.ensureConnected();
      const handler = (data: T) => observer.next(data);
      this.socket?.on(eventName, handler);
      return () => {
        this.socket?.off(eventName, handler);
      };
    });
  }

  emit(eventName: string, data?: any): void {
    this.ensureConnected();
    this.socket?.emit(eventName, data);
  }

  emitWithAck<T = any>(eventName: string, data?: any): Observable<T> {
    return new Observable<T>((observer) => {
      this.ensureConnected();

      const doEmit = () => {
        this.socket?.emit(eventName, data || {}, (response: any) => {
          if (response?.success) {
            observer.next(response);
            observer.complete();
          } else {
            observer.error(new Error(response?.error || 'Socket error'));
          }
        });
      };

      if (this.socket?.connected) {
        doEmit();
      } else {
        const onConnect = () => {
          doEmit();
          this.socket?.off('connect', onConnect);
        };
        this.socket?.on('connect', onConnect);
      }
    });
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${environment.apiUrl}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private ensureConnected(): void {
    if (!this.socket) {
      this.connect();
    }
  }
}
