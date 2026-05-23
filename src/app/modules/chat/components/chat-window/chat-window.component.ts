import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent implements OnChanges {
  @Input() activeChat: any = null;

  newMessage = '';

  // Mock messages matching the provided screenshot
  messages = [
    {
      type: 'system',
      text: 'Today'
    },
    {
      id: 1,
      sender: 'Sarah K.',
      avatar: '🧡',
      avatarColor: '#1e1e1e',
      text: 'Who\'s joining the 5am run tomorrow? The park trail is perfect this time of year!',
      time: '6:02 AM',
      isMe: false
    },
    {
      id: 2,
      sender: 'Mike R.',
      avatar: '💪',
      avatarColor: '#1e1e1e',
      text: 'I\'m in! Last week\'s session was incredible. Hit a new PB on the hill sprint.',
      time: '6:08 AM',
      isMe: false
    },
    {
      id: 3,
      sender: 'You',
      text: 'Count me in. Should we meet at the usual spot by the fountain?',
      time: '6:15 AM',
      isMe: true
    },
    {
      id: 4,
      sender: 'Sarah K.',
      avatar: '🧡',
      avatarColor: '#1e1e1e',
      text: 'Yes! Fountain at 4:50am so we can warm up before the run starts. Bring water 💧',
      time: '6:17 AM',
      isMe: false
    },
    {
      id: 5,
      sender: 'Alex J.',
      avatar: '🏃‍♂️',
      avatarColor: '#1e1e1e',
      text: 'Great 5am run today! 🏃‍♂️ Personal best this morning — 8.2km in 42 minutes!',
      time: '7:45 AM',
      isMe: false
    }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeChat'] && this.activeChat) {
      // In a real app, fetch messages for this.activeChat.id
    }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    this.messages.push({
      id: Date.now(),
      sender: 'You',
      text: this.newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    });

    this.newMessage = '';
  }
}
