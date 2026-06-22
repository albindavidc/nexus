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
  ViewChild,
  ElementRef,
  ViewChildren,
  QueryList,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { ChatbotService } from '../../services/chatbot.service';
import { ChatService } from '../../services/chat.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../../auth/services/auth.service';
import { SocketService } from '../../../../core/services/socket.service';
import { IMessage, IUser } from '../../models/chat.models';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  Subject,
  switchMap,
  takeUntil,
  catchError,
  of,
} from 'rxjs';

export interface UIChatMessage {
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
  selector: 'app-group-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './group-chat.component.html',
  styleUrls: ['./group-chat.component.scss'],
})
export class GroupChatComponent implements OnChanges, OnDestroy, OnInit {
  @Input() activeChat: any = null;
  @Output() groupAction = new EventEmitter<unknown>();
  @ViewChild('messageTextarea')
  messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  @ViewChildren('messageElement') messageElements!: QueryList<ElementRef>;

  menuOpen = false;

  private chatbotService = inject(ChatbotService);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private socketService = inject(SocketService);

  newMessage = '';
  isTyping = false;
  messages: UIChatMessage[] = [];
  showEmojiPicker = false;
  isUploading = false;

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

  emojiCategories = [
    {
      name: 'Smileys',
      emojis: [
        '😀',
        '😂',
        '🤣',
        '😊',
        '😍',
        '🥰',
        '😎',
        '🤩',
        '😇',
        '🙃',
        '😏',
        '🤔',
        '🤗',
        '😤',
        '😢',
        '🥺',
        '😭',
        '😱',
        '🤯',
        '🥳',
      ],
    },
    {
      name: 'Fitness',
      emojis: [
        '💪',
        '🏋️',
        '🏃',
        '🚴',
        '🧘',
        '🤸',
        '⛹️',
        '🏊',
        '🚣',
        '🤾',
        '🏆',
        '🥇',
        '🎯',
        '🔥',
        '⚡',
        '💯',
        '🏅',
        '🎖️',
        '❤️‍🔥',
        '🦾',
      ],
    },
    {
      name: 'Food',
      emojis: [
        '🥗',
        '🥑',
        '🍗',
        '🥩',
        '🍳',
        '🥛',
        '🧃',
        '🍌',
        '🍎',
        '🥕',
        '🌽',
        '🥦',
        '🍚',
        '🥜',
        '🫘',
        '🍫',
        '☕',
        '🧋',
        '💧',
        '🍹',
      ],
    },
    {
      name: 'Reactions',
      emojis: [
        '👍',
        '👎',
        '👏',
        '🙌',
        '🤝',
        '✌️',
        '🤞',
        '🫡',
        '❤️',
        '🧡',
        '💛',
        '💚',
        '💙',
        '💜',
        '🖤',
        '🤍',
        '⭐',
        '✨',
        '💥',
        '🎉',
      ],
    },
    {
      name: 'Objects',
      emojis: [
        '📸',
        '🎵',
        '📝',
        '📌',
        '🔗',
        '💡',
        '🔔',
        '📅',
        '⏰',
        '🗓️',
        '📊',
        '📈',
        '🎬',
        '🎮',
        '🏠',
        '💻',
        '📱',
        '🎧',
        '🔑',
        '🛡️',
      ],
    },
  ];

  private currentSubscribedChatId: string | null = null;
  private socketSubscription: any = null;
  private groupSocketSubscription: any = null;
  private presenceSubscription: any = null;

  //searching feature
  searchResults: IMessage[] = [];
  isSearching = false;
  currentSearchIndex = 0;
  currentSearchQuery = '';

  private searchSubject = new Subject<string>();

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
  
  // Participant search for Edit Group
  participantSearchQuery = '';
  participantSearchResults: IUser[] = [];
  selectedNewParticipants: IUser[] = [];
  private participantSearchSubject = new Subject<string>();

  private destroy$ = new Subject<void>();

  //searching feature
  ngOnInit(): void {
    this.setupSearchStream();
    this.setupParticipantSearchStream();
  }
  


  onParticipantSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.participantSearchSubject.next(target.value);
  }

  addParticipant(user: IUser) {
    if (!this.selectedNewParticipants.some(p => p._id === user._id)) {
      this.selectedNewParticipants.push(user);
    }
    this.participantSearchQuery = '';
    this.participantSearchResults = [];
  }

  removeParticipant(user: IUser) {
    this.selectedNewParticipants = this.selectedNewParticipants.filter(p => p._id !== user._id);
  }

  private setupParticipantSearchStream(): void {
    this.participantSearchSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string) => {
          if (!query.trim()) {
            this.participantSearchResults = [];
            return [];
          }
          return this.chatService.searchUsers(query);
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res && res.data) {
            const myId = this.authService.currentUserId;
            // Exclude current user, existing members, and already selected new participants
            const existingMemberIds = this.activeChat?.members?.map((m: any) => m.user._id || m.user.id) || [];
            this.participantSearchResults = (res.data.users || []).filter(
              (u: IUser) => 
                u._id !== myId && 
                !existingMemberIds.includes(u._id) &&
                !this.selectedNewParticipants.some((p) => p._id === u._id)
            );
          }
        },
        error: (err) => {
          console.error('Participant search failed', err);
          this.participantSearchResults = [];
        }
      });
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
        switchMap((query) =>
          this.chatService.searchMessagesInConversation(
            this.activeChat._id || this.activeChat.id,
            query,
          ).pipe(
            catchError((err) => {
              console.error('Failed to search messages', err);
              return of({ data: [] });
            })
          )
        ),
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
      
      // Leave previous socket room if any
      if (this.currentSubscribedChatId) {
        this.socketService.leaveConversation(this.currentSubscribedChatId);
      }
      if (this.socketSubscription) {
        this.socketSubscription.unsubscribe();
        this.socketSubscription = null;
      }
      if (this.groupSocketSubscription) {
        this.groupSocketSubscription.unsubscribe();
        this.groupSocketSubscription = null;
      }
      if (this.presenceSubscription) {
        this.presenceSubscription.unsubscribe();
        this.presenceSubscription = null;
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
          .onEvent<IMessage>('new_message')
          .subscribe({
            next: (m: IMessage) => {
              const msgConvId = (
                (m.conversation as any)?._id ||
                m.conversation ||
                ''
              ).toString();
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
                    type: m.type || 'text',
                    mediaUrl: m.mediaURL || m.mediaUrl,
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
                // Incoming message from other group member
                if (!this.messages.some((msg) => msg.id === m._id)) {
                  this.messages.push({
                    id: m._id,
                    sender: m.sender?.username || 'Member',
                    avatar:
                      m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
                    avatarColor: '#1e1e1e',
                    text: m.content,
                    type: m.type || 'text',
                    mediaUrl: m.mediaURL || m.mediaUrl,
                    mediaMeta: m.mediaMeta,
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

        // Also listen for group:new_message events
        const isGroup =
          !this.activeChat.type || this.activeChat.type === 'group';
        if (isGroup) {
          this.groupSocketSubscription = this.socketService
            .onEvent<IMessage>('group:new_message')
            .subscribe({
              next: (m: IMessage) => {
                const msgGroupRef = (
                  (m.groupRef as any)?._id ||
                  m.groupRef ||
                  ''
                ).toString();
                if (msgGroupRef && msgGroupRef !== chatId) return;

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
                      type: m.type || 'text',
                      mediaUrl: m.mediaURL || m.mediaUrl,
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
                      sender: m.sender?.username || 'Member',
                      avatar:
                        m.sender?.avatar ||
                        m.sender?.username?.charAt(0) ||
                        '👤',
                      avatarColor: '#1e1e1e',
                      text: m.content,
                      type: m.type || 'text',
                      mediaUrl: m.mediaURL || m.mediaUrl,
                      mediaMeta: m.mediaMeta,
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

        // Listen for online status
        const onlineSub = this.socketService
          .onEvent<{ userId: string }>('user_online')
          .subscribe(({ userId }) => {
            this.updateParticipantStatus(userId, 'online');
          });

        const offlineSub = this.socketService
          .onEvent<{ userId: string }>('user_offline')
          .subscribe(({ userId }) => {
            this.updateParticipantStatus(userId, 'offline');
          });

        this.presenceSubscription = {
          unsubscribe: () => {
            onlineSub.unsubscribe();
            offlineSub.unsubscribe();
          },
        };
      }
    }
  }

  updateParticipantStatus(userId: string, status: string): void {
    if (!this.activeChat) return;

    if (this.activeChat.type === 'group' && this.activeChat.members) {
      const member = this.activeChat.members.find(
        (m: any) => m.user?._id === userId || m.user?.id === userId,
      );
      if (member && member.user) {
        member.user.status = status;
      }
    } else if (this.activeChat.participants) {
      const participant = this.activeChat.participants.find(
        (p: any) => p._id === userId || p.id === userId,
      );
      if (participant) {
        participant.status = status;
      }
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
        const newMessages = msgList.map((m: IMessage) => {
          const senderId = this.extractSenderId(m.sender);
          return {
            id: m._id,
            sender: m.sender?.username || 'Unknown',
            avatar: m.sender?.avatar || m.sender?.username?.charAt(0) || '👤',
            avatarColor: '#1e1e1e',
            text: m.content,
            type: m.type || 'text',
            mediaUrl: m.mediaURL || m.mediaUrl,
            mediaMeta: m.mediaMeta,
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
        const history = res.data?.history || [];
        this.messages = history.map((m: any) => ({
          id: m._id || Date.now(),
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

  // ── Formatting Toolbar Methods ──────────────────────────────────
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

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string): void {
    const textarea = this.messageTextarea?.nativeElement;
    if (textarea) {
      const start = textarea.selectionStart;
      this.newMessage =
        this.newMessage.substring(0, start) +
        emoji +
        this.newMessage.substring(start);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      this.newMessage += emoji;
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading = true;

    this.chatService.uploadMedia(file).subscribe({
      next: (response) => {
        const mediaUrl = response.data?.mediaUrl;
        const mediaMeta = response.data?.mediaMeta;
        const msgType = file.type.startsWith('image/') ? 'image' : 'file';
        const caption = this.newMessage.trim() || file.name;

        // Optimistic UI update
        this.messages.push({
          id: Date.now(),
          sender: 'You',
          avatar: '👤',
          avatarColor: '#1e1e1e',
          text: caption,
          type: msgType,
          mediaUrl,
          mediaMeta,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isMe: true,
        });
        this.scrollToBottom();

        // Send via socket
        if (this.activeChat.type === 'bot') {
          // Bot doesn't support media, skip
        } else {
          const chatId = this.activeChat._id || this.activeChat.id;
          const isGroup =
            !this.activeChat.type || this.activeChat.type === 'group';

          if (isGroup) {
            this.groupService
              .sendGroupMessage(chatId, caption, {
                type: msgType,
                mediaUrl,
                mediaMeta,
              })
              .subscribe({
                error: (err) =>
                  console.error('Failed to send media message', err),
              });
          } else {
            this.socketService.emit('send_message', {
              conversationId: chatId,
              type: msgType,
              content: caption,
              mediaUrl,
              mediaMeta,
            });
          }
        }

        this.newMessage = '';
        this.isUploading = false;
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.isUploading = false;
      },
    });

    // Reset file input so the same file can be re-selected
    input.value = '';
  }

  autoResizeTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
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

  isPartnerOnline(): boolean {
    if (
      !this.activeChat ||
      this.activeChat.type === 'group' ||
      this.activeChat.type === 'bot'
    )
      return false;

    // Find the other participant
    const myId = this.authService.currentUserId;
    if (!this.activeChat.participants) return false;

    const partner = this.activeChat.participants.find(
      (p: any) => (p._id || p.id) !== myId,
    );

    return partner?.status === 'online';
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
    this.selectedNewParticipants = [];
    this.participantSearchQuery = '';
    this.participantSearchResults = [];
    this.isSettingsOpen = true;
  }

  closeGroupSettings() {
    this.isSettingsOpen = false;
  }

  updateGroupSubmit() {
    if (!this.activeChat || this.activeChat.type === 'bot') return;
    const chatId = this.activeChat._id || this.activeChat.id;

    // Handle adding new members
    if (this.selectedNewParticipants.length > 0) {
      const userIds = this.selectedNewParticipants.map(p => p._id);
      this.groupService.addMembers(chatId, userIds).subscribe({
        next: () => {
          this.selectedNewParticipants = [];
          // Note: the backend will emit group:add_members, which can be handled via socket
        },
        error: (err) => console.error('Failed to add members', err)
      });
    }

    // Handle group details update
    if (
      this.editGroupData.name !== this.activeChat.name ||
      this.editGroupData.description !== this.activeChat.description ||
      this.editGroupData.theme !== this.activeChat.theme
    ) {
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
    } else {
      this.isSettingsOpen = false;
    }
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
    if (
      !target.closest('.emoji-picker-wrapper') &&
      !target.closest('.btn-emoji')
    ) {
      this.showEmojiPicker = false;
    }
  }

  // ── Robust sender ID extraction ──────────────────────────────────
  // Handles populated object ({ _id, id }) and raw ObjectId string
  private extractSenderId(sender: unknown): string {
    if (!sender) return '';
    if (typeof sender === 'string') return sender.trim();
    const s = sender as any;
    return (s._id ?? s.id ?? '').toString().trim();
  }

  ngOnDestroy(): void {
    if (this.currentSubscribedChatId) {
      this.socketService.leaveConversation(this.currentSubscribedChatId);
    }
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    if (this.groupSocketSubscription) {
      this.groupSocketSubscription.unsubscribe();
    }

    this.destroy$.next();
    this.destroy$.complete();
  }
}
