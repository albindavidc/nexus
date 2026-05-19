import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent {
  @Input() activeChat: any = null;

  messages = [
    {
      id: 1,
      sender: 'ai',
      text: 'Hey! I\'ve been tracking your progress and you\'re doing amazing! 💪 You\'ve completed 4 workouts this week. How are you feeling?',
      time: '10:30 AM'
    },
    {
      id: 2,
      sender: 'user',
      text: 'Feeling great! A bit tired but motivated. What should I focus on today?',
      time: '10:32 AM'
    },
    {
      id: 3,
      sender: 'ai',
      text: 'Based on your recent activity, I\'d recommend an upper body strength session.\nHere\'s your stats from this week:',
      time: '10:33 AM',
      hasCard: true,
      cardData: {
        title: 'Weekly Performance',
        workouts: 4,
        hours: 3.2,
        calories: '1.8k',
        progress: 80
      }
    }
  ];

  suggestions = [
    'Start my workout',
    'Show meal plan',
    'Track progress',
    'Set new goal'
  ];

  isTyping = true;
}
