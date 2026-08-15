import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

const AUTH_URL = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/auth`;
const STORAGE_KEY = 'budget-access-code';
const EXPIRY_KEY = 'budget-access-expires-at';
const SESSION_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'mousemove'] as const;

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly http = inject(HttpClient);

  /** Status check finished — used to avoid flashing the lock screen when no code is required. */
  ready = signal(false);
  unlocked = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  code = signal('');
  private started = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private listening = false;
  private lastBump = 0;

  constructor() {
    this.code.set(this.readStoredCode());
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    const stored = this.code();
    this.http
      .get<{ required: boolean }>(`${AUTH_URL}/status`)
      .pipe(catchError(() => of({ required: true })))
      .subscribe(({ required }) => {
        if (!required) {
          this.unlocked.set(true);
          this.ready.set(true);
          return;
        }
        if (stored && this.remainingMs() > 0) {
          this.unlock(stored, false);
          return;
        }
        this.clearStoredSession();
        this.ready.set(true);
      });
  }

  unlock(code: string, showError = true): void {
    const trimmed = code.trim();
    this.submitting.set(true);
    this.error.set(null);
    this.http.post(`${AUTH_URL}/unlock`, { code: trimmed }).subscribe({
      next: () => {
        this.code.set(trimmed);
        sessionStorage.setItem(STORAGE_KEY, trimmed);
        this.unlocked.set(true);
        this.submitting.set(false);
        this.ready.set(true);
        if (this.remainingMs() <= 0) {
          this.bumpSession();
        } else {
          this.armTimer();
        }
        this.watchActivity();
      },
      error: (err) => {
        this.lock();
        this.submitting.set(false);
        this.ready.set(true);
        if (showError) {
          this.error.set(err?.status === 401 ? 'Wrong code' : 'Could not reach the server. Try again.');
        }
      },
    });
  }

  lock(): void {
    const wasUnlocked = this.unlocked();
    this.unwatchActivity();
    this.clearTimer();
    this.unlocked.set(false);
    this.code.set('');
    this.clearStoredSession();
    if (wasUnlocked) {
      this.error.set('Session expired — enter the access code again.');
    }
  }

  private readStoredCode(): string {
    if (this.remainingMs() <= 0) {
      this.clearStoredSession();
      return '';
    }
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  }

  private remainingMs(): number {
    const raw = sessionStorage.getItem(EXPIRY_KEY);
    if (!raw) {
      return 0;
    }
    const remaining = Number(raw) - Date.now();
    return Number.isFinite(remaining) ? remaining : 0;
  }

  private bumpSession(): void {
    if (!this.unlocked() || !this.code()) {
      return;
    }
    const now = Date.now();
    if (now - this.lastBump < 1000) {
      return;
    }
    this.lastBump = now;
    sessionStorage.setItem(EXPIRY_KEY, String(now + SESSION_MS));
    this.armTimer();
  }

  private armTimer(): void {
    this.clearTimer();
    const remaining = this.remainingMs();
    if (remaining <= 0) {
      this.lock();
      return;
    }
    this.timeoutId = setTimeout(() => this.lock(), remaining);
  }

  private clearTimer(): void {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private onActivity = (): void => {
    this.bumpSession();
  };

  private onVisibility = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    if (this.remainingMs() <= 0) {
      this.lock();
      return;
    }
    this.armTimer();
  };

  private watchActivity(): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, this.onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private unwatchActivity(): void {
    if (!this.listening) {
      return;
    }
    this.listening = false;
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, this.onActivity);
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private clearStoredSession(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
  }
}
