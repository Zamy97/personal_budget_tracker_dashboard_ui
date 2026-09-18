import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  AccountBenefit,
  AccountKind,
  TrackedAccount,
  WALLET_TABS,
  normalizeCadence,
  yearMonthKey,
} from '../models/wallet.model';
import { AuthService } from './auth.service';
import {
  AccountBenefitDto,
  AccountBenefitPayload,
  TrackedAccountDto,
  TrackedAccountPayload,
  WalletApiService,
} from './wallet-api.service';

function toBenefit(dto: AccountBenefitDto): AccountBenefit {
  return {
    id: String(dto.id),
    label: dto.label,
    amount: dto.amount ?? null,
    cadence: normalizeCadence(dto.cadence),
    used: !!dto.used,
    usedMonths: [...(dto.usedMonths ?? [])],
    order: dto.order,
  };
}

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
    benefits: (dto.benefits ?? []).map(toBenefit).sort((a, b) => a.order - b.order),
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

function toPayload(account: Omit<TrackedAccount, 'id' | 'order' | 'benefits'>): TrackedAccountPayload {
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

function monthsUsedInYear(benefit: AccountBenefit, year: number): number {
  const prefix = `${year}-`;
  return benefit.usedMonths.filter((m) => m.startsWith(prefix)).length;
}

function benefitOpenValue(benefit: AccountBenefit, year: number): number {
  if (benefit.cadence === 'MONTHLY') {
    const left = 12 - monthsUsedInYear(benefit, year);
    return left * (benefit.amount ?? 0);
  }
  return benefit.used ? 0 : benefit.amount ?? 0;
}

function benefitDone(benefit: AccountBenefit, year: number): boolean {
  if (benefit.cadence === 'MONTHLY') {
    return monthsUsedInYear(benefit, year) >= 12;
  }
  return benefit.used;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly api = inject(WalletApiService);
  private readonly auth = inject(AuthService);

  accounts = signal<TrackedAccount[]>([]);
  loaded = signal(false);
  selectedKind = signal<AccountKind>('CREDIT_CARD');
  editingId = signal<string | null>(null);
  /** Calendar year used for monthly benefit grids. */
  trackingYear = signal(new Date().getFullYear());

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
    const year = this.trackingYear();
    const list = this.accounts().filter((a) => a.status !== 'CLOSED');
    const allBenefits = list.flatMap((a) => a.benefits);
    const openBenefits = allBenefits.filter((b) => !benefitDone(b, year));
    const openValue = allBenefits.reduce((sum, b) => sum + benefitOpenValue(b, year), 0);
    const monthChecksLeft = allBenefits
      .filter((b) => b.cadence === 'MONTHLY')
      .reduce((sum, b) => sum + (12 - monthsUsedInYear(b, year)), 0);
    const monthChecksTotal = allBenefits.filter((b) => b.cadence === 'MONTHLY').length * 12;
    return {
      benefitsLeft: openBenefits.length,
      benefitsTotal: allBenefits.length,
      openCreditValue: openValue,
      monthChecksLeft,
      monthChecksTotal,
      cardCount: list.filter((a) => a.kind === 'CREDIT_CARD').length,
      debtCount: list.filter((a) => a.kind === 'DEBT').length,
      membershipCount: list.filter((a) => a.kind === 'MEMBERSHIP').length,
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

  saveNew(draft: Omit<TrackedAccount, 'id' | 'order' | 'benefits'>): void {
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

  toggleBenefit(accountId: string, benefitId: string): void {
    this.accounts.update((list) =>
      list.map((account) => {
        if (account.id !== accountId) {
          return account;
        }
        return {
          ...account,
          benefits: account.benefits.map((b) => (b.id === benefitId ? { ...b, used: !b.used } : b)),
        };
      }),
    );
    this.api.toggleBenefit(Number(benefitId)).subscribe({
      next: (dto) => this.patchBenefit(accountId, toBenefit(dto)),
      error: (err) => {
        console.error('Failed to toggle benefit', err);
        this.reload();
      },
    });
  }

  toggleBenefitMonth(accountId: string, benefitId: string, yearMonth: string): void {
    this.accounts.update((list) =>
      list.map((account) => {
        if (account.id !== accountId) {
          return account;
        }
        return {
          ...account,
          benefits: account.benefits.map((b) => {
            if (b.id !== benefitId) {
              return b;
            }
            const has = b.usedMonths.includes(yearMonth);
            const usedMonths = has
              ? b.usedMonths.filter((m) => m !== yearMonth)
              : [...b.usedMonths, yearMonth].sort();
            return { ...b, usedMonths };
          }),
        };
      }),
    );
    this.api.toggleBenefitMonth(Number(benefitId), yearMonth).subscribe({
      next: (dto) => this.patchBenefit(accountId, toBenefit(dto)),
      error: (err) => {
        console.error('Failed to toggle benefit month', err);
        this.reload();
      },
    });
  }

  addBenefit(accountId: string, payload: AccountBenefitPayload): void {
    this.api.addBenefit(Number(accountId), payload).subscribe({
      next: (dto) => {
        const benefit = toBenefit(dto);
        this.accounts.update((list) =>
          list.map((account) =>
            account.id === accountId ? { ...account, benefits: [...account.benefits, benefit] } : account,
          ),
        );
      },
      error: (err) => console.error('Failed to add benefit', err),
    });
  }

  removeBenefit(accountId: string, benefitId: string): void {
    this.accounts.update((list) =>
      list.map((account) =>
        account.id === accountId
          ? { ...account, benefits: account.benefits.filter((b) => b.id !== benefitId) }
          : account,
      ),
    );
    this.api.deleteBenefit(Number(benefitId)).subscribe({
      error: (err) => {
        console.error('Failed to delete benefit', err);
        this.reload();
      },
    });
  }

  resetYearly(accountId: string): void {
    this.api.resetYearlyBenefits(Number(accountId)).subscribe({
      next: (dtos) => {
        const benefits = dtos.map(toBenefit);
        this.accounts.update((list) =>
          list.map((account) => (account.id === accountId ? { ...account, benefits } : account)),
        );
      },
      error: (err) => console.error('Failed to reset yearly benefits', err),
    });
  }

  private patchBenefit(accountId: string, benefit: AccountBenefit): void {
    this.accounts.update((list) =>
      list.map((account) => {
        if (account.id !== accountId) {
          return account;
        }
        return {
          ...account,
          benefits: account.benefits.map((b) => (b.id === benefit.id ? benefit : b)),
        };
      }),
    );
  }
}

export { monthsUsedInYear, benefitOpenValue, yearMonthKey };
