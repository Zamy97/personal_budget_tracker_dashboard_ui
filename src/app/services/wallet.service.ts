import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AccountKind, TrackedAccount, WALLET_TABS } from '../models/wallet.model';
import { AuthService } from './auth.service';
import { TrackedAccountDto, TrackedAccountPayload, WalletApiService } from './wallet-api.service';

function toAccount(dto: TrackedAccountDto): TrackedAccount {
  return {
    id: String(dto.id),
    kind: dto.kind,
    name: dto.name,
    institution: dto.institution ?? '',
    status: dto.status,
    balance: dto.balance ?? 0,
    creditLimit: dto.creditLimit ?? null,
    interestRate: dto.interestRate ?? null,
    monthlyPayment: dto.monthlyPayment ?? null,
    dueDay: dto.dueDay ?? null,
    annualFee: dto.annualFee ?? null,
    renewsOn: dto.renewsOn ?? null,
    accent: dto.accent || defaultAccent(dto.kind),
    notes: dto.notes ?? '',
    order: dto.order,
  };
}

function defaultAccent(kind: AccountKind): string {
  if (kind === 'CREDIT_CARD') {
    return '#f97066';
  }
  if (kind === 'DEBT') {
    return '#818cf8';
  }
  return '#f5a623';
}

function toPayload(account: Omit<TrackedAccount, 'id' | 'order'>): TrackedAccountPayload {
  return {
    kind: account.kind,
    name: account.name,
    institution: account.institution,
    status: account.status,
    balance: account.balance,
    creditLimit: account.creditLimit,
    interestRate: account.interestRate,
    monthlyPayment: account.monthlyPayment,
    dueDay: account.dueDay,
    annualFee: account.annualFee,
    renewsOn: account.renewsOn,
    accent: account.accent,
    notes: account.notes,
  };
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly api = inject(WalletApiService);
  private readonly auth = inject(AuthService);

  accounts = signal<TrackedAccount[]>([]);
  loaded = signal(false);
  selectedKind = signal<AccountKind>('CREDIT_CARD');
  editingId = signal<string | null>(null);

  tabs = WALLET_TABS;

  constructor() {
    effect(() => {
      if (this.auth.unlocked()) {
        this.reload();
      } else {
        this.accounts.set([]);
        this.loaded.set(false);
        this.editingId.set(null);
      }
    });
  }

  accountsForSelected = computed(() =>
    this.accounts()
      .filter((a) => a.kind === this.selectedKind())
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
  );

  totals = computed(() => {
    const list = this.accounts().filter((a) => a.status !== 'CLOSED');
    const cards = list.filter((a) => a.kind === 'CREDIT_CARD');
    const debts = list.filter((a) => a.kind === 'DEBT');
    const memberships = list.filter((a) => a.kind === 'MEMBERSHIP');
    return {
      cardBalance: cards.reduce((sum, a) => sum + a.balance, 0),
      cardLimit: cards.reduce((sum, a) => sum + (a.creditLimit ?? 0), 0),
      debtBalance: debts.reduce((sum, a) => sum + a.balance, 0),
      debtPayment: debts.reduce((sum, a) => sum + (a.monthlyPayment ?? 0), 0),
      membershipFees: memberships.reduce((sum, a) => sum + (a.annualFee ?? 0), 0),
      plannedCount: list.filter((a) => a.status === 'PLANNED').length,
    };
  });

  selectKind(kind: AccountKind): void {
    this.selectedKind.set(kind);
    this.editingId.set(null);
  }

  private reload(): void {
    this.api.getAccounts().subscribe({
      next: (dtos) => {
        if (dtos.length === 0) {
          this.api.seedDefaults().subscribe({
            next: (seeded) => {
              this.accounts.set(seeded.map(toAccount));
              this.loaded.set(true);
            },
            error: () => {
              this.accounts.set([]);
              this.loaded.set(true);
            },
          });
          return;
        }
        this.accounts.set(dtos.map(toAccount));
        this.loaded.set(true);
      },
      error: (err) => {
        console.error('Failed to load wallet accounts', err);
        this.loaded.set(true);
      },
    });
  }

  startCreate(): void {
    this.editingId.set('new');
  }

  startEdit(id: string): void {
    this.editingId.set(id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveNew(draft: Omit<TrackedAccount, 'id' | 'order'>): void {
    this.api.createAccount(toPayload(draft)).subscribe({
      next: (dto) => {
        this.accounts.update((list) => [...list, toAccount(dto)]);
        this.editingId.set(null);
      },
      error: (err) => console.error('Failed to create account', err),
    });
  }

  saveExisting(account: TrackedAccount): void {
    this.accounts.update((list) => list.map((a) => (a.id === account.id ? account : a)));
    this.api.updateAccount(Number(account.id), toPayload(account)).subscribe({
      next: (dto) => {
        this.accounts.update((list) => list.map((a) => (a.id === account.id ? toAccount(dto) : a)));
        this.editingId.set(null);
      },
      error: (err) => console.error('Failed to update account', err),
    });
  }

  remove(id: string): void {
    this.accounts.update((list) => list.filter((a) => a.id !== id));
    if (this.editingId() === id) {
      this.editingId.set(null);
    }
    this.api.deleteAccount(Number(id)).subscribe({
      error: (err) => console.error('Failed to delete account', err),
    });
  }
}
