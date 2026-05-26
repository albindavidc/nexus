import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private socketUrl = environment.apiUrl.replace('/api/v1', '');

  // Pending rooms to join once socket is confirmed connected
  private pendingJoins: string[] = [];

  connect(): void {
    // Already has an active connection — do nothing
    if (this.socket?.connected) return;

    // Already creating a socket (may be in the middle of handshake) — do nothing
    if (this.socket) return;

    this.socket = io(this.socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket connected:', this.socket?.id);

      // Drain any rooms that were requested before the connection was ready
      this.pendingJoins.forEach((id) => {
        this.socket?.emit('join_conversation', { conversationId: id });
        console.log(`⚡ (buffered) Joined room: ${id}`);
      });
      this.pendingJoins = [];
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.pendingJoins = [];
      console.log('⚡ Socket disconnected');
    }
  }

  // ── Room management ───────────────────────────────────────────
  joinConversation(conversationId: string): void {
    this.ensureConnected();

    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
      console.log(`⚡ Joined room: ${conversationId}`);
    } else {
      // Buffer: emit once the socket fires its 'connect' event
      if (!this.pendingJoins.includes(conversationId)) {
        this.pendingJoins.push(conversationId);
        console.log(`⚡ Buffered room join: ${conversationId}`);
      }
    }
  }

  leaveConversation(conversationId: string): void {
    // Remove from pending buffer if it was never sent
    this.pendingJoins = this.pendingJoins.filter((id) => id !== conversationId);

    if (this.socket) {
      this.socket.emit('leave_conversation', { conversationId });
      console.log(`⚡ Left room: ${conversationId}`);
    }
  }

  // ── Reactive event stream ─────────────────────────────────────
  // Uses a named handler function so socket.off() removes ONLY this handler,
  // not every listener registered for the same event name.
  onEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      this.ensureConnected();

      const handler = (data: T) => observer.next(data);

      this.socket?.on(eventName, handler);

      // Teardown: remove exactly this handler, not all handlers for the event
      return () => {
        this.socket?.off(eventName, handler);
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  private ensureConnected(): void {
    if (!this.socket) {
      this.connect();
    }
  }
}
