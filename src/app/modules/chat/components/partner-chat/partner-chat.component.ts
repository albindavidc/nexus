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
  ElementRef,
  ViewChild,
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
  selector: 'app-partner-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './partner-chat.component.html',
  styleUrls: ['./partner-chat.component.scss'],
})
export class PartnerChatComponent implements OnChanges, OnDestroy {
  @Input() activeChat: any = null;
  @Output() groupAction = new EventEmitter<any>();

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  menuOpen = false;
  newMessage = '';
  isTyping = false;
  messages: any[] = [];

  private chatbotService = inject(ChatbotService);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private socketService = inject(SocketService);

  private currentSubscribedChatId: string | null = null;
  private socketSubscription: any = null;

  quickReplies = [
    'Start my workout',
    'Show meal plan',
    'Track progress',
    'Set new goal',
  ];

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
        this.fetchPartnerHistory();

        // Join new room
        this.socketService.joinConversation(chatId);

        // Listen for new messages reactively over Socket
        this.socketSubscription = this.socketService
          .onEvent<any>('new_message')
          .subscribe({
            next: (m) => {
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
                // Incoming message from partner
                if (!this.messages.some((msg) => msg.id === m._id)) {
                  this.messages.push({
                    id: m._id,
                    sender: m.sender?.username || 'Partner',
                    avatar:
                      m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
                    avatarColor: '#ff5722',
                    text: m.content,
                    time: new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    isMe: false,
                    senderId,
                    hasPerformanceCard:
                      m.content.toLowerCase().includes('recommend') ||
                      m.content.toLowerCase().includes('stats'),
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

  fetchPartnerHistory() {
    this.messages = [];
    const chatId = this.activeChat._id || this.activeChat.id;

    this.chatService.getMessages(chatId).subscribe({
      next: (res) => {
        const myId = this.authService.currentUserId;
        const msgList = res.data?.messages || [];
        const newMessages = msgList.map((m: any) => {
          // Sender may be a populated object OR raw ObjectId string
          const senderId = this.extractSenderId(m.sender);
          return {
            id: m._id,
            sender: m.sender?.username || 'Partner',
            avatar: m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
            avatarColor: '#ff5722',
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isMe: !!myId && senderId === myId,
            senderId,
            hasPerformanceCard:
              m.content.toLowerCase().includes('recommend') ||
              m.content.toLowerCase().includes('stats'),
          };
        });

        this.messages = newMessages;
        this.scrollToBottom();
      },
      error: (err) => console.error('Failed to fetch partner messages', err),
    });
  }

  fetchBotHistory() {
    this.messages = [];
    this.chatbotService.getHistory().subscribe({
      next: (res) => {
        const history = res.data?.history || [];
        this.messages = history.map((m: any) => ({
          id: m._id || Date.now() + Math.random(),
          sender: m.role === 'user' ? 'You' : 'Nexus AI',
          avatar: m.role === 'user' ? '👤' : '🤖',
          avatarColor: m.role === 'user' ? '#1e1e1e' : '#ff5722',
          text: m.message,
          time: m.timestamp
            ? new Date(m.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Now',
          isMe: m.role === 'user',
          hasPerformanceCard:
            m.message.toLowerCase().includes('recommend') ||
            m.message.toLowerCase().includes('stats'),
        }));

        if (this.messages.length === 0) {
          this.messages.push({
            id: 'bot_msg_1',
            sender: 'Nexus AI',
            avatar: '👩‍🦰',
            avatarColor: '#ff5722',
            text: "Hey! I've been tracking your progress and you're doing amazing! 💪 You've completed 4 workouts this week. How are you feeling?",
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isMe: false,
            hasPerformanceCard: false,
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
    const currentUserId =
      (this.authService.user() as any)?._id ||
      (this.authService.user() as any)?.id;

    // Optimistic UI update
    this.messages.push({
      id: Date.now() + Math.random(),
      sender: 'You',
      avatar: '👤',
      avatarColor: '#1e1e1e',
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
      this.chatbotService.chat({ message: userText }).subscribe({
        next: (res) => {
          this.isTyping = false;
          const replyText =
            res.data?.reply || 'I am not sure how to respond to that.';

          this.messages.push({
            id: Date.now() + Math.random(),
            sender: 'Nexus AI',
            avatar: '👩‍🦰',
            avatarColor: '#ff5722',
            text: replyText,
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isMe: false,
            hasPerformanceCard:
              replyText.toLowerCase().includes('recommend') ||
              replyText.toLowerCase().includes('stats') ||
              replyText.toLowerCase().includes('upper body'),
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

      this.chatService.sendMessage(chatId, userText).subscribe({
        next: (res) => {
          // successfully sent
        },
        error: (err) => console.error('Failed to send partner message', err),
      });
    }
  }

  // ── The only correct isMine computation ──────────────────────────
  // Handles populated object ({ _id, id }) and raw ObjectId string
  private extractSenderId(sender: any): string {
    if (!sender) return '';
    if (typeof sender === 'string') return sender.trim();
    return (sender._id ?? sender.id ?? '').toString().trim();
  }

  isMe(msg: any): boolean {
    return !!msg.isMe;
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.myScrollContainer) {
          this.myScrollContainer.nativeElement.scrollTop =
            this.myScrollContainer.nativeElement.scrollHeight;
        }
      } catch (err) {
        console.error('Scroll error:', err);
      }
    }, 100);
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
              avatar: '👩‍🦰',
              avatarColor: '#ff5722',
              text: "Hey! I've been tracking your progress and you're doing amazing! 💪 You've completed 4 workouts this week. How are you feeling?",
              time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isMe: false,
              hasPerformanceCard: false,
            });
            this.scrollToBottom();
          },
          error: (err) => console.error('Failed to clear history:', err),
        });
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.kebab-wrapper')) {
      this.menuOpen = false;
    }
  }
}
