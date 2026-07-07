import {
  Component,
  OnInit,
  inject,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { ChatBotMessage, ChatbotService } from '../../services/chatbot.service';

interface IAIMessage {
  id: string | number;
  sender: string;
  avatar: string;
  avatarColor: string;
  text: string;
  time: string;
  isMe: boolean;
  hasPerformanceCard?: boolean;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [FormsModule, MarkdownPipe],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AIChatComponent implements OnInit {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  menuOpen = false;
  newMessage = '';
  isTyping = false;
  messages: IAIMessage[] = [];

  private chatbotService = inject(ChatbotService);

  quickReplies = [
    'Start my workout',
    'Show meal plan',
    'Track progress',
    'Set new goal',
  ];

  ngOnInit(): void {
    this.fetchBotHistory();
  }

  fetchBotHistory() {
    this.messages = [];
    this.chatbotService.getHistory().subscribe({
      next: (res) => {
        const history = res.data?.history || [];
        this.messages = history.map((m: ChatBotMessage) => ({
          id: m._id || Date.now() + Math.random(),
          sender: m.role === 'user' ? 'You' : 'Nexus AI',
          avatar: m.role === 'user' ? '👤' : '🤖',
          avatarColor: m.role === 'user' ? '#1e1e1e' : '#ff5722',
          text: m.content || m.message || '',
          time: (m.createdAt || m.timestamp)
            ? new Date((m.createdAt || m.timestamp) as string).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Now',
          isMe: m.role === 'user',
          hasPerformanceCard:
            (m.content || '').toLowerCase().includes('recommend') ||
            (m.content || '').toLowerCase().includes('stats'),
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

    this.isTyping = true;
    this.chatbotService
      .chat({ conversationId: 'ai-coach', message: userText })
      .subscribe({
        next: (res) => {
          this.isTyping = false;
          const replyText =
            res.data?.reply || 'I am not sure how to respond to that.';

          this.messages.push({
            id: Date.now() + Math.random(),
            sender: 'Nexus AI',
            avatar: '🤖',
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
            hasPerformanceCard: false,
          });
          this.scrollToBottom();
        },
        error: (err) => console.error('Failed to clear history:', err),
      });
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
