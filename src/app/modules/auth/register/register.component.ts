import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        
        <!-- Logo Header -->
        <div class="logo-section">
          <div class="logo-box">
            <svg class="lightning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 class="logo-title">NEXUS</h1>
          <p class="subtitle">YOUR AI FITNESS COACH</p>
        </div>

        <!-- Pill Segment Switcher -->
        <div class="segment-switcher">
          <button class="switcher-btn" routerLink="/auth/login">Sign In</button>
          <button class="switcher-btn active">Sign Up</button>
        </div>

        <!-- Error Banner -->
        @if (authService.error()) {
          <div class="error-banner">
            <svg class="err-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>{{ authService.error() }}</span>
          </div>
        }

        <!-- Register Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" autocomplete="off">

          <!-- First Name & Last Name in same row -->
          <div class="form-row">
            <!-- First Name -->
            <div class="form-group">
              <label class="form-label" for="firstName">FIRST NAME</label>
              <div class="input-container" [class.focused]="focusedField === 'firstName'" [class.invalid]="isInvalid('firstName')">
                <input
                  id="firstName"
                  type="text"
                  formControlName="firstName"
                  placeholder="John"
                  (focus)="onFocus('firstName')"
                  (blur)="onBlur()"
                />
              </div>
            </div>

            <!-- Last Name -->
            <div class="form-group">
              <label class="form-label" for="lastName">LAST NAME</label>
              <div class="input-container" [class.focused]="focusedField === 'lastName'" [class.invalid]="isInvalid('lastName')">
                <input
                  id="lastName"
                  type="text"
                  formControlName="lastName"
                  placeholder="Doe"
                  (focus)="onFocus('lastName')"
                  (blur)="onBlur()"
                />
              </div>
            </div>
          </div>
          @if (isInvalid('firstName') || isInvalid('lastName')) {
            <span class="error-text m-top-neg">First and last names are required</span>
          }

          <!-- Username Input Group -->
          <div class="form-group">
            <label class="form-label" for="username">USERNAME</label>
            <div class="input-container" [class.focused]="focusedField === 'username'" [class.invalid]="isInvalid('username')">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <input
                id="username"
                type="text"
                formControlName="username"
                placeholder="johndoe"
                (focus)="onFocus('username')"
                (blur)="onBlur()"
              />
            </div>
            @if (isInvalid('username')) {
              <span class="error-text">Username is required</span>
            }
          </div>

          <!-- Email Input Group -->
          <div class="form-group">
            <label class="form-label" for="email">EMAIL</label>
            <div class="input-container" [class.focused]="focusedField === 'email'" [class.invalid]="isInvalid('email')">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"/>
              </svg>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="you&#64;example.com"
                (focus)="onFocus('email')"
                (blur)="onBlur()"
              />
            </div>
            @if (isInvalid('email')) {
              <span class="error-text">Please enter a valid email address</span>
            }
          </div>

          <!-- Password Input Group -->
          <div class="form-group">
            <label class="form-label" for="password">PASSWORD</label>
            <div class="input-container" [class.focused]="focusedField === 'password'" [class.invalid]="isInvalid('password')">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                (focus)="onFocus('password')"
                (blur)="onBlur()"
              />
              <button type="button" class="eye-toggle" (click)="togglePasswordVisibility()">
                @if (showPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="eye-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="eye-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                }
              </button>
            </div>
            @if (isInvalid('password')) {
              <span class="error-text">Password must be 6-20 chars and contain: A-Z, a-z, 0-9, and a special character</span>
            }
          </div>

          <!-- Action Button -->
          <button
            type="submit"
            class="btn-primary"
            [disabled]="registerForm.invalid || authService.isLoading()"
          >
            @if (authService.isLoading()) {
              <span>Creating Account...</span>
            } @else {
              <span class="btn-text">
                Continue
                <svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
              </span>
            }
          </button>

        </form>

        <!-- Divider -->
        <div class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">or continue with</span>
          <span class="divider-line"></span>
        </div>

        <!-- Footer Redirection Link -->
        <p class="auth-footer-link">
          Already have an account?
          <a class="highlight-link" routerLink="/auth/login">Sign In</a>
        </p>

      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg-dark: #0f0f0f;
      --card-bg: #161616;
      --primary-orange: #ff5722;
      --primary-orange-glow: rgba(255, 87, 34, 0.4);
      --primary-orange-light: #ff7043;
      --text-main: #ffffff;
      --text-gray: #7d7d7d;
      --text-gray-light: #b0b0b0;
      --border-dark: #2c2c2c;
      --border-focus: #3d3d3d;
      --input-bg: #212121;
      --error-red: #ff3b30;
      --error-banner-bg: rgba(255, 59, 48, 0.08);
      font-family: 'Outfit', 'Inter', sans-serif;
    }

    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #181818 0%, #0c0c0c 100%);
      padding: 1.5rem;
    }

    .auth-card {
      background: var(--card-bg);
      padding: 2.75rem 2.25rem;
      border-radius: 20px;
      width: 100%;
      max-width: 440px;
      border: 1px solid var(--border-dark);
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.5), 0 0 24px var(--primary-orange-glow);
      transition: box-shadow 0.3s ease;
      box-sizing: border-box;
      position: relative;
    }

    .logo-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 2rem;
    }

    .logo-box {
      background: linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-light) 100%);
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px var(--primary-orange-glow);
      margin-bottom: 1rem;
    }

    .lightning-icon {
      width: 24px;
      height: 24px;
      color: #fff;
    }

    .logo-title {
      color: var(--text-main);
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: 6px;
      margin: 0 0 0.4rem 0;
      line-height: 1;
      font-family: 'Outfit', 'Inter', sans-serif;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }

    .subtitle {
      color: var(--text-gray);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 0;
      opacity: 0.95;
    }

    /* Switcher styles */
    .segment-switcher {
      background: #202020;
      border: 1px solid rgba(255, 255, 255, 0.03);
      padding: 4px;
      border-radius: 30px;
      display: flex;
      margin-bottom: 2.25rem;
    }

    .switcher-btn {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--text-gray-light);
      padding: 0.65rem 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 26px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .switcher-btn.active {
      background: linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-light) 100%);
      color: #fff;
      box-shadow: 0 4px 12px rgba(255, 87, 34, 0.35);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.35rem;
    }

    .form-row .form-group {
      margin-bottom: 0;
    }

    .form-group {
      margin-bottom: 1.35rem;
      display: flex;
      flex-direction: column;
    }

    .form-label {
      color: var(--text-gray-light);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 0.55rem;
      align-self: flex-start;
    }

    .input-container {
      display: flex;
      align-items: center;
      background: var(--input-bg);
      border: 1.5px solid var(--border-dark);
      border-radius: 12px;
      padding: 0 1rem;
      height: 48px;
      transition: all 0.2s ease;
    }

    .input-container:hover {
      border-color: var(--border-focus);
    }

    .input-container.focused {
      border-color: var(--primary-orange);
      box-shadow: 0 0 0 3px rgba(255, 87, 34, 0.15);
      background: rgba(255, 87, 34, 0.01);
    }

    .input-container.invalid {
      border-color: var(--error-red);
    }

    .input-icon {
      width: 18px;
      height: 18px;
      color: var(--text-gray);
      margin-right: 0.75rem;
      flex-shrink: 0;
    }

    input {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 0.92rem;
      width: 100%;
      height: 100%;
      outline: none;
      font-family: inherit;
    }

    input::placeholder {
      color: #555;
    }

    .eye-toggle {
      background: transparent;
      border: none;
      color: var(--text-gray);
      cursor: pointer;
      padding: 0;
      margin-left: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
    }

    .eye-toggle:hover {
      color: var(--text-gray-light);
    }

    .eye-icon {
      width: 18px;
      height: 18px;
    }

    .error-text {
      color: var(--error-red);
      font-size: 0.75rem;
      margin-top: 0.4rem;
      align-self: flex-start;
      font-weight: 500;
      text-align: left;
      line-height: 1.35;
    }

    .m-top-neg {
      margin-top: -0.85rem;
      margin-bottom: 1.35rem;
    }

    .error-banner {
      background: var(--error-banner-bg);
      border: 1px solid rgba(255, 59, 48, 0.2);
      color: #ff6b64;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      text-align: left;
    }

    .err-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .btn-primary {
      width: 100%;
      height: 50px;
      background: linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-light) 100%);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 16px var(--primary-orange-glow);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1.75rem;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 20px rgba(255, 87, 34, 0.5);
      background: linear-gradient(135deg, var(--primary-orange-light) 0%, var(--primary-orange) 100%);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .arrow-icon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
    }

    .btn-primary:hover .arrow-icon {
      transform: translateX(3px);
    }

    /* Divider styling */
    .divider {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1.75rem 0;
      width: 100%;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: var(--border-dark);
    }

    .divider-text {
      color: #4a4a4a;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .auth-footer-link {
      color: var(--text-gray);
      text-align: center;
      margin: 0;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .highlight-link {
      color: var(--primary-orange-light);
      text-decoration: none;
      font-weight: 700;
      margin-left: 0.25rem;
      transition: color 0.2s ease;
    }

    .highlight-link:hover {
      color: var(--primary-orange);
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  focusedField: string | null = null;
  showPassword = signal<boolean>(false);

  registerForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
        // matches regex required by express validator: uppercase, lowercase, digit, special character
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]
    ],
  });

  constructor() {
    this.authService.clearError();
  }

  isInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  onFocus(field: string): void {
    this.focusedField = field;
  }

  onBlur(): void {
    this.focusedField = null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(val => !val);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    
    this.authService.register(this.registerForm.value as any).subscribe();
  }
}
