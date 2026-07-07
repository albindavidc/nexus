import { Component, inject, signal, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.scss']
})
export class VerifyOtpComponent implements OnInit, AfterViewInit {
  authService = inject(AuthService);
  private router = inject(Router);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = ['', '', '', '', '', ''];
  email = '';
  resendCooldown = signal<number>(0);
  successMessage = signal<string | null>(null);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.authService.clearError();
    const pending = this.authService.pendingEmail();
    if (pending) {
      this.email = pending;
    } else {
      this.router.navigate(['/auth/register']);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const inputs = this.otpInputs?.toArray();
      if (inputs && inputs.length > 0) {
        inputs[0].nativeElement.focus();
      }
    }, 100);
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!/^\d$/.test(value)) {
      this.digits[index] = '';
      input.value = '';
      return;
    }

    this.digits[index] = value;

    const inputs = this.otpInputs.toArray();
    if (index < 5 && value) {
      inputs[index + 1].nativeElement.focus();
    }

    if (this.isOtpComplete()) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const inputs = this.otpInputs.toArray();

    if (event.key === 'Backspace') {
      if (!this.digits[index] && index > 0) {
        this.digits[index - 1] = '';
        inputs[index - 1].nativeElement.focus();
      } else {
        this.digits[index] = '';
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs[index - 1].nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputs[index + 1].nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text')?.trim() || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      const inputs = this.otpInputs.toArray();
      for (let i = 0; i < 6; i++) {
        this.digits[i] = digits[i];
        inputs[i].nativeElement.value = digits[i];
      }
      inputs[5].nativeElement.focus();
      this.onSubmit();
    }
  }

  isOtpComplete(): boolean {
    return this.digits.every(d => /^\d$/.test(d));
  }

  onSubmit(): void {
    if (!this.isOtpComplete()) return;

    const otp = this.digits.join('');
    this.authService.verifyOtp(this.email, otp).subscribe({
      error: () => {
        this.digits = ['', '', '', '', '', ''];
        const inputs = this.otpInputs?.toArray();
        if (inputs && inputs.length > 0) {
          inputs[0].nativeElement.focus();
        }
      }
    });
  }

  resendOtp(): void {
    if (this.resendCooldown() > 0) return;

    this.successMessage.set(null);
    this.authService.sendOtp(this.email).subscribe({
      next: () => {
        this.successMessage.set('A new OTP has been sent to your email');
        this.startCooldown();
      }
    });
  }

  private startCooldown(): void {
    this.resendCooldown.set(60);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval ?? undefined);

    this.cooldownInterval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        clearInterval(this.cooldownInterval ?? undefined);
        this.cooldownInterval = null;
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  getMaskedEmail(): string {
    if (!this.email) return '';
    const [local, domain] = this.email.split('@');
    if (local.length <= 2) return this.email;
    return `${local[0]}${'•'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }
}
