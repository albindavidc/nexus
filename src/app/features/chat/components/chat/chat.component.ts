import { Subject, takeUntil, debounceTime, distinctUntilChanged, filter, switchMap, catchError, of } from 'rxjs';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  Output,
  EventEmitter,
  HostListener,
  OnDestroy, OnInit,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../../auth/services/auth.service';
import { GroupService } from '../../services/group.service';
import { SocketService } from '../../../../core/services/socket.service';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { IConversation, IMessage, IUser } from '../../models/chat.models';

export interface UIMessage {
  id: string | number;
  sender: string;
  avatar: string;
  avatarColor: string;
  text: string;
  type?: string;
  mediaUrl?: string;
  mediaMeta?: any;
  time: string;
  isMe: boolean;
  senderId?: string;
  hasPerformanceCard?: boolean;
}

@Component({
  selector: 'app-direct-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnChanges, OnDestroy, OnInit {
  @Input() activeChat: any = null; // Can be a Conversation or a 'bot' chat object
  @Output() groupAction = new EventEmitter<unknown>();

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  menuOpen = false;
  newMessage = '';
  isTyping = false;
  messages: UIMessage[] = [];
  showEmojiPicker = false;
  isUploading = false;

  private chatbotService = inject(ChatbotService);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private socketService = inject(SocketService);

  private currentSubscribedChatId: string | null = null;
  private socketSubscription: any = null;

  // searching feature
  searchResults: IMessage[] = [];
  isSearching = false;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  quickReplies = [
    'Start my workout',
    'Show meal plan',
    'Track progress',
    'Set new goal',
  ];

  emojiCategories = [
    {
      name: 'Smileys',
      emojis: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤩', '😇', '🙃', '😏', '🤔', '🤗', '😤', '😢', '🥺', '😭', '😱', '🤯', '🥳'],
    },
    {
      name: 'Fitness',
      emojis: ['💪', '🏋️', '🏃', '🚴', '🧘', '🤸', '⛹️', '🏊', '🚣', '🤾', '🏆', '🥇', '🎯', '🔥', '⚡', '💯', '🏅', '🎖️', '❤️‍🔥', '🦾'],
    },
    {
      name: 'Food',
      emojis: ['🥗', '🥑', '🍗', '🥩', '🍳', '🥛', '🧃', '🍌', '🍎', '🥕', '🌽', '🥦', '🍚', '🥜', '🫘', '🍫', '☕', '🧋', '💧', '🍹'],
    },
    {
      name: 'Reactions',
      emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🫡', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '⭐', '✨', '💥', '🎉'],
    },
  ];

  @ViewChildren('messageElement') messageElements!: QueryList<ElementRef>;
  currentSearchIndex = 0;
  currentSearchQuery = '';

  ngOnInit(): void {
    this.setupSearchStream();
  }

  originalScrollPosition: number | null = null;

  get activeSearchMessageId(): string | null {
    if (this.searchResults.length > 0 && this.currentSearchIndex >= 0) {
      return this.searchResults[this.currentSearchIndex]._id;
    }
    return null;
  }

  handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        this.prevSearchResult();
      } else {
        this.nextSearchResult();
      }
    }
  }

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.currentSearchQuery = target.value;
    
    if (this.originalScrollPosition === null) {
      const scrollEl = this.myScrollContainer?.nativeElement;
      if (scrollEl) {
        this.originalScrollPosition = scrollEl.scrollTop;
      }
    }
    
    this.searchSubject.next(target.value);
  }

  nextSearchResult() {
    if (this.searchResults.length > 0) {
      this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
      this.scrollToSearchResult();
    }
  }

  prevSearchResult() {
    if (this.searchResults.length > 0) {
      this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
      this.scrollToSearchResult();
    }
  }

  private scrollToMatch(index: number): void {
    if (!this.searchResults[index]) return;
    const matchId = this.searchResults[index]._id || (this.searchResults[index] as any).id;
    
    const targetElement = this.messageElements.find(
      (el) => el.nativeElement.id === `msg-${matchId}`
    );
    
    if (targetElement) {
      targetElement.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  scrollToSearchResult() {
    this.scrollToMatch(this.currentSearchIndex);
  }

  resetScrollPosition() {
    if (this.originalScrollPosition !== null && this.myScrollContainer?.nativeElement) {
      this.myScrollContainer.nativeElement.scrollTo({
        top: this.originalScrollPosition,
        behavior: 'smooth'
      });
      this.originalScrollPosition = null;
    }
  }

  resetSearch(): void {
    this.searchResults = [];
    this.isSearching = false;
    this.currentSearchIndex = 0;
    this.currentSearchQuery = '';
    this.resetScrollPosition();
  }

  private setupSearchStream(): void {
    this.searchSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(400),
        distinctUntilChanged(),
        filter((query: string) => {
          if (query.length < 1) {
            this.resetSearch();
            return false;
          }

          this.isSearching = true;
          return true;
        }),
        switchMap((query) => {
          const chatId = this.activeChat._id || this.activeChat.id;
          return this.chatService.searchMessagesInConversation(
            chatId,
            query,
          ).pipe(
            catchError((err) => {
              console.error('Failed to search messages', err);
              return of({ data: [] });
            })
          );
        }),
      )
      .subscribe({
        next: (response) => {
          this.searchResults = response.data || [];
          console.log('Search Results fetched:', this.searchResults);
          if (this.searchResults.length > 0) {
            this.currentSearchIndex = 0;
            setTimeout(() => this.scrollToMatch(0), 50);
          }
          this.isSearching = false;
        },
        error: (err) => {
          this.isSearching = false;
          this.searchResults = [];
          this.currentSearchIndex = 0;
          console.error('Failed to search messages', err);
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeChat'] && this.activeChat) {
      this.resetSearch();
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

        this.socketService.joinConversation(chatId);

        this.socketSubscription = this.socketService
          .onEvent<IMessage>('new_message')
          .subscribe({
            next: (m: IMessage) => {
              const msgConvObj = m.conversation as any;
              const msgConvId = (
                msgConvObj?._id ||
                msgConvObj ||
                ''
              ).toString();
              if (msgConvId && msgConvId !== chatId) return;

              const myId = this.authService.currentUserId;
              const senderId = this.extractSenderId(m.sender);
              const isMe = !!myId && senderId === myId;

              if (isMe) {
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
                    type: m.type,
                    mediaUrl: m.mediaUrl,
                    mediaMeta: m.mediaMeta,
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
                if (!this.messages.some((msg) => msg.id === m._id)) {
                  this.messages.push({
                    id: m._id,
                    sender: m.sender?.username || 'Partner',
                    avatar:
                      m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
                    avatarColor: '#ff5722',
                    text: m.content,
                    type: m.type,
                    mediaUrl: m.mediaUrl,
                    mediaMeta: m.mediaMeta,
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
    this.destroy$.next();
    this.destroy$.complete();
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
        const newMessages: UIMessage[] = msgList.map((m: IMessage) => {
          const senderId = this.extractSenderId(m.sender);
          return {
            id: m._id,
            sender: m.sender?.username || 'Partner',
            avatar: m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
            avatarColor: '#ff5722',
            text: m.content,
            type: m.type,
            mediaUrl: m.mediaUrl,
            mediaMeta: m.mediaMeta,
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
      error: (err: Error) =>
        console.error('Failed to fetch partner messages', err),
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
      error: (err: Error) => {
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
      this.chatbotService
        .chat({ conversationId: this.activeChat.id, message: userText })
        .subscribe({
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
          error: (err: Error) => {
            console.error(err);
            this.isTyping = false;
          },
        });
    } else {
      const chatId = this.activeChat._id || this.activeChat.id;

      this.chatService.sendMessage(chatId, userText).subscribe({
        next: () => {
          // successfully sent
        },
        error: (err: Error) =>
          console.error('Failed to send partner message', err),
      });
    }
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string) {
    const textarea = this.messageTextarea.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    this.newMessage =
      this.newMessage.substring(0, start) +
      emoji +
      this.newMessage.substring(end);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      textarea.focus();
    });
  }

  insertFormatting(type: 'bold' | 'italic'): void {
    const textarea = this.messageTextarea?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = this.newMessage;
    const wrapper = type === 'bold' ? '**' : '*';

    const isWrapped =
      start >= wrapper.length &&
      end <= text.length - wrapper.length &&
      text.substring(start - wrapper.length, start) === wrapper &&
      text.substring(end, end + wrapper.length) === wrapper;

    if (isWrapped) {
      this.newMessage =
        text.substring(0, start - wrapper.length) +
        text.substring(start, end) +
        text.substring(end + wrapper.length);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start - wrapper.length,
          end - wrapper.length,
        );
      });
      return;
    }

    if (start !== end) {
      const selected = text.substring(start, end);
      this.newMessage =
        text.substring(0, start) +
        wrapper +
        selected +
        wrapper +
        text.substring(end);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          end + wrapper.length * 2,
          end + wrapper.length * 2,
        );
      });
    } else {
      this.newMessage =
        text.substring(0, start) + wrapper + wrapper + text.substring(start);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + wrapper.length,
          start + wrapper.length,
        );
      });
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.');
      input.value = '';
      return;
    }

    this.isUploading = true;
    this.chatService.uploadMedia(file).subscribe({
      next: (res) => {
        if (!res.data) return;
        const { mediaUrl, mediaMeta } = res.data;
        const msgType = file.type.startsWith('image/') ? 'image' : 'file';

        const chatId = this.activeChat._id || this.activeChat.id;
        
        // Add optimistic message
        this.messages.push({
          id: Date.now() + Math.random(),
          sender: 'You',
          avatar: '👤',
          avatarColor: '#1e1e1e',
          text: file.name,
          type: msgType,
          mediaUrl,
          mediaMeta,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
        });
        this.scrollToBottom();

        this.chatService.sendMessage(chatId, file.name, {
          type: msgType,
          mediaUrl,
          mediaMeta,
        }).subscribe({
          next: () => {
            this.isUploading = false;
            input.value = '';
          },
          error: (err) => {
            console.error('Failed to send file message', err);
            this.isUploading = false;
            input.value = '';
          }
        });
      },
      error: (err) => {
        console.error('Upload failed', err);
        alert('Failed to upload file.');
        this.isUploading = false;
        input.value = '';
      },
    });
  }

  onTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
      setTimeout(() => {
        const textarea = this.messageTextarea.nativeElement;
        textarea.style.height = 'auto';
      });
    }
  }

  autoResizeTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  private extractSenderId(sender: unknown): string {
    if (!sender) return '';
    if (typeof sender === 'string') return sender.trim();
    const s = sender as any;
    return (s._id ?? s.id ?? '').toString().trim();
  }

  isMe(msg: UIMessage): boolean {
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
          error: (err: Error) => console.error('Failed to clear history:', err),
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
          error: (err: Error) =>
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
    if (!target.closest('.emoji-picker-wrapper') && !target.closest('.btn-emoji')) {
      this.showEmojiPicker = false;
    }
  }
}
