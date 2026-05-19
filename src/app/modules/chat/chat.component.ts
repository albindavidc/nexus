import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-container">
      <header class="header">
        <div class="logo">
          <div class="logo-box">
            <svg class="lightning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <span class="logo-text">NEXUS</span>
        </div>
        
        <div class="user-profile" *ngIf="authService.user() as user">
          <div class="avatar-circle">
            {{ user.firstName[0].toUpperCase() }}{{ user.lastName[0].toUpperCase() }}
          </div>
          <div class="user-info">
            <span class="welcome-text">Welcome,</span>
            <strong class="user-name">{{ user.firstName }} {{ user.lastName }}</strong>
          </div>
          <span class="badge">Coach</span>
          <button (click)="logout()" class="btn-logout" [disabled]="authService.isLoading()">
            @if (authService.isLoading()) {
              <span>Logging out...</span>
            } @else {
              <span>Sign Out</span>
            }
          </button>
        </div>
      </header>
      
      <main class="chat-dashboard">
        <div class="card glow-border">
          <div class="badge-status">
            <span class="ping-pulse"></span>
            <span class="ping-dot"></span>
            <span class="status-lbl">API Server Connected</span>
          </div>
          <h1>Initialization Complete</h1>
          <p class="subtitle">Welcome to your AI Fitness Coaching Hub. The end-to-end full stack authentication flow is fully operational.</p>
          
          <div class="details-grid">
            <div class="detail-item" *ngIf="authService.user() as user">
              <span class="detail-label">USERNAME</span>
              <span class="detail-value">&#64;{{ user.username }}</span>
            </div>
            <div class="detail-item" *ngIf="authService.user() as user">
              <span class="detail-label">EMAIL ADDRESS</span>
              <span class="detail-value">{{ user.email }}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .chat-container {
      min-height: 100vh;
      background: radial-gradient(circle at center, #181818 0%, #0c0c0c 100%);
      color: #fff;
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      background: rgba(20, 20, 20, 0.7);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-box {
      background: linear-gradient(135deg, #ff5722 0%, #ff8a50 100%);
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(255, 87, 34, 0.4);
    }

    .lightning-icon {
      width: 18px;
      height: 18px;
      color: #fff;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #fff 0%, #aaa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff5722 0%, #ff7043 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      box-shadow: 0 0 10px rgba(255, 87, 34, 0.25);
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .welcome-text {
      font-size: 0.75rem;
      color: #888;
    }

    .user-name {
      font-size: 0.9rem;
      color: #eee;
    }

    .badge {
      background: rgba(255, 87, 34, 0.15);
      border: 1px solid rgba(255, 87, 34, 0.3);
      color: #ff7043;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .btn-logout {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #eee;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #ef4444;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
    }

    .chat-dashboard {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .card {
      background: rgba(26, 26, 26, 0.6);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 3rem;
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
      position: relative;
    }

    .glow-border::after {
      content: '';
      position: absolute;
      top: -1px; left: -1px; right: -1px; bottom: -1px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(255,87,34,0.4) 0%, transparent 60%);
      pointer-events: none;
      z-index: -1;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .ping-pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      display: inline-block;
      animation: pulse 1.5s infinite ease-in-out;
    }

    .ping-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      display: inline-block;
      position: absolute;
      left: 17px;
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    h1 {
      font-size: 2.25rem;
      margin: 0 0 1rem 0;
      font-weight: 800;
      background: linear-gradient(135deg, #fff 0%, #888 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: #aaa;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      text-align: left;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 2rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
    }

    .detail-label {
      font-size: 0.75rem;
      color: #ff8a50;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .detail-value {
      font-size: 0.85rem;
      color: #ccc;
      font-weight: 600;
    }
  `]
})
export class ChatComponent {
  authService = inject(AuthService);
  
  logout() {
    this.authService.logout().subscribe();
  }
}
