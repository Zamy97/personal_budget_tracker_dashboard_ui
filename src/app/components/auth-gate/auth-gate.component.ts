import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-gate',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './auth-gate.component.html',
  styleUrls: ['./auth-gate.component.scss'],
})
export class AuthGateComponent {
  auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  mode = signal<'login' | 'signup'>('login');
  email = signal('');
  password = signal('');
  displayName = signal('');
  inviteCode = signal('');
  showSlowHint = signal(false);

  private slowHintTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const busy = this.auth.submitting();
      this.clearSlowHint();
      if (!busy) {
        this.showSlowHint.set(false);
        return;
      }
      this.slowHintTimer = setTimeout(() => this.showSlowHint.set(true), 4500);
    });

    this.destroyRef.onDestroy(() => this.clearSlowHint());
  }

  switchMode(mode: 'login' | 'signup'): void {
    if (this.auth.submitting()) {
      return;
    }
    this.mode.set(mode);
    this.auth.error.set(null);
  }

  submit(event: Event): void {
    event.preventDefault();
    if (this.auth.submitting()) {
      return;
    }
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      return;
    }

    if (this.mode() === 'signup') {
      const name = this.displayName().trim();
      const invite = this.inviteCode().trim();
      if (!name || password.length < 6) {
        this.auth.error.set(password.length < 6 ? 'Password must be at least 6 characters' : 'Enter your name');
        return;
      }
      if (this.auth.signupInviteRequired() && !invite) {
        this.auth.error.set('Enter the invite code you were given');
        return;
      }
      this.auth.signup(email, password, name, invite).subscribe();
      return;
    }

    this.auth.login(email, password).subscribe();
  }

  private clearSlowHint(): void {
    if (this.slowHintTimer != null) {
      clearTimeout(this.slowHintTimer);
      this.slowHintTimer = null;
    }
  }
}
