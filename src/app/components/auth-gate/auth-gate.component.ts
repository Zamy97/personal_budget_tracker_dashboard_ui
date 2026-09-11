import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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

  mode = signal<'login' | 'signup'>('login');
  email = signal('');
  password = signal('');
  displayName = signal('');
  inviteCode = signal('');

  switchMode(mode: 'login' | 'signup'): void {
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
}
