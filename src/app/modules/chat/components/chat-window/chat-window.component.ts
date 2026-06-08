import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  Output,
  EventEmitter,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../../../core/services/chatbot.service';
import { ChatService } from '../../../../core/services/chat.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GroupService } from '../../../../core/services/group.service';
import { SocketService } from '../../../../core/services/socket.service';

import { MarkdownPipe } from '../../../../core/pipes/markdown.pipe';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
})
export class ChatWindowComponent implements OnChanges, OnDestroy {
  @Input() activeChat: any = null;
  @Output() groupAction = new EventEmitter<any>();

  menuOpen = false;

  private chatbotService = inject(ChatbotService);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private socketService = inject(SocketService);

  newMessage = '';
  isTyping = false;
  messages: any[] = [];

  isSettingsOpen = false;
  editGroupData = {
    name: '',
    description: '',
    theme: '#ff6600',
  };

  availableThemes = [
    { name: 'Nexus Orange', value: '#ff6600' },
    { name: 'Neon Blue', value: '#00bfff' },
    { name: 'Toxic Green', value: '#39ff14' },
    { name: 'Cyber Purple', value: '#b026ff' },
    { name: 'Crimson Red', value: '#ff003c' },
  ];

  quickReplies = [
    'Start my workout',
    'Show meal plan',
    'Track progress',
    'Set new goal',
  ];

  private currentSubscribedChatId: string | null = null;
  private socketSubscription: any = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeChat'] && this.activeChat) {
      // Leave previous socket room if any
      if (this.currentSubscribedChatId) {
        this.socketService.leaveConversation(this.currentSubscribedChatId);
      }
      if (this.socketSubscription) {
        this.socketSubscription.unsubscribe();
        this.socketSubscription = null;
      }

      if (this.activeChat.type === 'bot') {
        this.fetchBotHistory();
      } else {
        const chatId = this.activeChat._id || this.activeChat.id;
        this.currentSubscribedChatId = chatId;
        this.fetchGroupHistory();

        // Join new room
        this.socketService.joinConversation(chatId);

        // Listen for new messages reactively over Socket
        // Backend emits 'new_message' for both direct and group conversations
        this.socketSubscription = this.socketService
          .onEvent<any>('new_message')
          .subscribe({
            next: (m) => {
              const msgConvId = (m.conversation?._id || m.conversation || '').toString();
              if (msgConvId && msgConvId !== chatId) return;

              const myId = this.authService.currentUserId;
              const senderId = this.extractSenderId(m.sender);
              const isMe = !!myId && senderId === myId;

              if (isMe) {
                // Match and replace optimistic message
                const optMsg = this.messages.find(
                  (msg) =>
                    msg.isMe &&
                    msg.text === m.content &&
                    typeof msg.id === 'number',
                );
                if (optMsg) {
                  optMsg.id = m._id;
                  optMsg.time = new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                } else if (!this.messages.some((msg) => msg.id === m._id)) {
                  this.messages.push({
                    id: m._id,
                    sender: 'You',
                    avatar: '👤',
                    avatarColor: '#1e1e1e',
                    text: m.content,
                    time: new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    isMe: true,
                    senderId,
                  });
                  this.scrollToBottom();
                }
              } else {
                // Incoming message from other group member
                if (!this.messages.some((msg) => msg.id === m._id)) {
                  this.messages.push({
                    id: m._id,
                    sender: m.sender?.username || 'Member',
                    avatar:
                      m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
                    avatarColor: '#1e1e1e',
                    text: m.content,
                    time: new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    isMe: false,
                    senderId,
                  });
                  this.scrollToBottom();
                }
              }
            },
          });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.currentSubscribedChatId) {
      this.socketService.leaveConversation(this.currentSubscribedChatId);
    }
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }

  fetchGroupHistory() {
    this.messages = [];
    const chatId = this.activeChat._id || this.activeChat.id;
    const isGroup = !this.activeChat.type || this.activeChat.type === 'group';

    const messageObs = isGroup
      ? this.groupService.getGroupMessages(chatId)
      : this.chatService.getMessages(chatId);

    messageObs.subscribe({
      next: (res) => {
        const myId = this.authService.currentUserId;
        const msgList = res.data?.messages || [];
        const newMessages = msgList.map((m: any) => {
          const senderId = this.extractSenderId(m.sender);
          return {
            id: m._id,
            sender: m.sender?.username || 'Unknown',
            avatar: m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
            avatarColor: '#1e1e1e',
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isMe: !!myId && senderId === myId,
          };
        });

        this.messages = newMessages;
        this.scrollToBottom();
      },
      error: (err) => console.error('Failed to fetch messages', err),
    });
  }

  fetchBotHistory() {
    this.messages = [];
    this.chatbotService.getHistory().subscribe({
      next: (res) => {
        const history = res.data?.messages || [];
        this.messages = history.map((m: any) => ({
          id: m._id || Date.now(),
          sender: m.role === 'user' ? 'You' : 'Nexus AI',
          avatar: m.role === 'user' ? '👤' : '🤖',
          avatarColor: m.role === 'user' ? '#1e1e1e' : '#ff5722',
          text: m.content,
          time: m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Now',
          isMe: m.role === 'user',
        }));

        if (this.messages.length === 0) {
          this.messages.push({
            id: 'bot_msg_1',
            sender: 'Nexus AI',
            avatar: '🤖',
            avatarColor: '#ff5722',
            text: "Hey! I've been tracking your progress and you're doing amazing! 💪 You've completed 4 workouts this week. How are you feeling?",
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isMe: false,
          });
        }
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to fetch bot history', err);
        this.messages = [];
      },
    });
  }

  sendQuickReply(reply: string) {
    this.newMessage = reply;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const userText = this.newMessage;

    // Optimistic UI update
    this.messages.push({
      id: Date.now(),
      sender: 'You',
      text: userText,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isMe: true,
    });

    this.newMessage = '';
    this.scrollToBottom();

    if (this.activeChat.type === 'bot') {
      this.isTyping = true;
      this.chatbotService.chat({ conversationId: this.activeChat.id, message: userText }).subscribe({
        next: (res) => {
          this.isTyping = false;
          const replyText =
            res.data?.reply || 'I am not sure how to respond to that.';

          this.messages.push({
            id: Date.now(),
            sender: 'Nexus AI',
            avatar: '🤖',
            avatarColor: '#ff5722',
            text: replyText,
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isMe: false,
          });
          this.scrollToBottom();
        },
        error: (err) => {
          console.error(err);
          this.isTyping = false;
        },
      });
    } else {
      const chatId = this.activeChat._id || this.activeChat.id;
      const isGroup = !this.activeChat.type || this.activeChat.type === 'group';

      const sendObs = isGroup
        ? this.groupService.sendGroupMessage(chatId, userText)
        : this.chatService.sendMessage(chatId, userText);

      sendObs.subscribe({
        next: (res) => {
          // Successfully sent to backend
        },
        error: (err) => console.error('Failed to send message', err),
      });
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        const element = document.querySelector('.messages-container');
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      } catch (err) {
        console.error('Scroll error:', err);
      }
    }, 100);
  }

  getOnlineCount(): number {
    if (!this.activeChat || !this.activeChat.members) return 1;
    const count = this.activeChat.members.filter(
      (m: any) => m.user?.status === 'online',
    ).length;
    return count > 0 ? count : 1;
  }

  isGroupAdminOrOwner(): boolean {
    if (!this.activeChat || this.activeChat.type === 'bot') return false;

    const myId = this.authService.currentUserId;
    if (!myId) return false;

    // Check members array — m.user may be a populated object OR raw string
    if (this.activeChat.members) {
      const member = this.activeChat.members.find((m: any) => {
        const mId = this.extractSenderId(m.user);
        return mId === myId;
      });
      if (member?.role === 'admin' || member?.role === 'owner') return true;
    }

    // Fallback: check creator field
    const creatorId = this.extractSenderId(this.activeChat.creator);
    return !!creatorId && creatorId === myId;
  }

  openGroupSettings() {
    if (!this.activeChat || this.activeChat.type === 'bot') return;
    this.editGroupData = {
      name: this.activeChat.name || '',
      description: this.activeChat.description || '',
      theme: this.activeChat.theme || '#ff6600',
    };
    this.isSettingsOpen = true;
  }

  closeGroupSettings() {
    this.isSettingsOpen = false;
  }

  updateGroupSubmit() {
    if (!this.activeChat || this.activeChat.type === 'bot') return;
    const chatId = this.activeChat._id || this.activeChat.id;

    this.groupService.updateGroup(chatId, this.editGroupData).subscribe({
      next: (res) => {
        this.isSettingsOpen = false;
        const updatedGroup = res.data?.group;
        this.groupAction.emit({
          action: 'update',
          groupId: chatId,
          group: updatedGroup,
        });
      },
      error: (err) => {
        console.error('Failed to update group settings:', err);
      },
    });
  }

  deleteGroup() {
    if (!this.activeChat || this.activeChat.type === 'bot') return;
    const chatId = this.activeChat._id || this.activeChat.id;

    if (
      confirm(
        `Are you absolutely sure you want to delete "${this.activeChat.name}"? This will permanently delete all messages and remove all members.`,
      )
    ) {
      this.groupService.deleteGroup(chatId).subscribe({
        next: () => {
          this.isSettingsOpen = false;
          this.menuOpen = false;
          this.groupAction.emit({ action: 'delete', groupId: chatId });
        },
        error: (err) => {
          console.error('Failed to delete group:', err);
        },
      });
    }
  }

  leaveGroup() {
    if (!this.activeChat || this.activeChat.type === 'bot') return;
    const chatId = this.activeChat._id || this.activeChat.id;

    if (confirm(`Are you sure you want to leave "${this.activeChat.name}"?`)) {
      this.groupService.leaveGroup(chatId).subscribe({
        next: () => {
          this.menuOpen = false;
          this.groupAction.emit({ action: 'leave', groupId: chatId });
        },
        error: (err) => {
          console.error('Failed to leave group:', err);
        },
      });
    }
  }

  deleteChat() {
    if (!this.activeChat) return;

    if (this.activeChat.type === 'bot') {
      if (
        confirm('Are you sure you want to clear the AI Trainer chat history?')
      ) {
        this.chatbotService.clearHistory().subscribe({
          next: () => {
            this.messages = [];
            this.messages.push({
              id: 'bot_msg_1',
              sender: 'Nexus AI',
              avatar: '🤖',
              avatarColor: '#ff5722',
              text: "Hey! I've been tracking your progress and you're doing amazing! 💪 You've completed 4 workouts this week. How are you feeling?",
              time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isMe: false,
            });
            this.scrollToBottom();
          },
          error: (err) => console.error('Failed to clear history:', err),
        });
      }
    } else {
      const isGroup = !this.activeChat.type || this.activeChat.type === 'group';
      if (isGroup) {
        if (this.isGroupAdminOrOwner()) {
          this.deleteGroup();
        } else {
          this.leaveGroup();
        }
      } else {
        if (
          confirm('Are you sure you want to clear this conversation history?')
        ) {
          const chatId = this.activeChat._id || this.activeChat.id;
          this.chatService.clearConversation(chatId).subscribe({
            next: () => {
              this.messages = [];
            },
            error: (err) =>
              console.error('Failed to clear conversation history:', err),
          });
        }
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.kebab-wrapper')) {
      this.menuOpen = false;
    }
  }

  // ── Robust sender ID extraction ──────────────────────────────────
  // Handles populated object ({ _id, id }) and raw ObjectId string
  private extractSenderId(sender: any): string {
    if (!sender) return '';
    if (typeof sender === 'string') return sender.trim();
    return (sender._id ?? sender.id ?? '').toString().trim();
  }
}
