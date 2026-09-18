import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  AccountBenefit,
  AccountKind,
  AccountStatus,
  MONTH_LABELS,
  TrackedAccount,
  yearMonthKey,
} from '../../models/wallet.model';
import { WalletService, benefitOpenValue, monthsUsedInYear } from '../../services/wallet.service';

@Component({
  selector: 'app-wallet-board',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wallet-board.component.html',
  styleUrls: ['./wallet-board.component.scss'],
})
export class WalletBoardComponent {
  wallet = inject(WalletService);

  draftName = signal('');
  draftInstitution = signal('');
  draftStatus = signal<AccountStatus>('ACTIVE');
  draftPayment = signal<number | null>(null);
  draftDueDay = signal<number | null>(null);
  draftAnnualFee = signal<number | null>(null);
  draftRenewsOn = signal('');
  draftNotes = signal('');
  draftAccent = signal('');
  newBenefitLabel = signal<Record<string, string>>({});
  newBenefitCadence = signal<Record<string, 'MONTHLY' | 'YEARLY'>>({});
  /** When true for an account id, completed benefits stay visible so they can be unchecked. */
  showCompleted = signal<Record<string, boolean>>({});

  monthLabels = MONTH_LABELS;
  monthIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  activeTab = computed(() => this.wallet.tabs.find((t) => t.kind === this.wallet.selectedKind())!);
  items = this.wallet.accountsForSelected;
  totals = this.wallet.totals;
  editingId = this.wallet.editingId;
  trackingYear = this.wallet.trackingYear;
  currentMonthKey = yearMonthKey(new Date().getFullYear(), new Date().getMonth());

  trackAccount = (_: number, account: TrackedAccount): string => account.id;
  trackBenefit = (_: number, benefit: AccountBenefit): string => benefit.id;

  selectTab(kind: AccountKind): void {
    this.wallet.selectKind(kind);
  }

  beginCreate(): void {
    this.resetDraft(this.wallet.selectedKind());
    this.wallet.startCreate();
  }

  beginEdit(account: TrackedAccount): void {
    this.draftName.set(account.name);
    this.draftInstitution.set(account.institution);
    this.draftStatus.set(account.status);
    this.draftPayment.set(account.monthlyPayment);
    this.draftDueDay.set(account.dueDay);
    this.draftAnnualFee.set(account.annualFee);
    this.draftRenewsOn.set(account.renewsOn ?? '');
    this.draftNotes.set(account.notes);
    this.draftAccent.set(account.accent);
    this.wallet.startEdit(account.id);
  }

  cancel(): void {
    this.wallet.cancelEdit();
  }

  save(): void {
    const name = this.draftName().trim();
    if (!name) {
      return;
    }
    const kind = this.wallet.selectedKind();
    const id = this.editingId();
    const existing = id && id !== 'new' ? this.wallet.accounts().find((a) => a.id === id) : null;

    const payload = {
      kind,
      name,
      institution: this.draftInstitution().trim(),
      status: this.draftStatus(),
      balance: existing?.balance ?? 0,
      creditLimit: existing?.creditLimit ?? null,
      interestRate: existing?.interestRate ?? null,
      monthlyPayment: kind === 'MEMBERSHIP' ? null : this.draftPayment(),
      dueDay: kind === 'MEMBERSHIP' ? null : this.draftDueDay(),
      annualFee: this.draftAnnualFee(),
      renewsOn: kind === 'MEMBERSHIP' ? this.draftRenewsOn() || null : null,
      accent: this.draftAccent() || defaultAccent(kind),
      notes: this.draftNotes().trim(),
    };

    if (id === 'new') {
      this.wallet.saveNew(payload);
      return;
    }
    if (!id || !existing) {
      return;
    }
    this.wallet.saveExisting({ ...existing, ...payload });
  }

  remove(id: string): void {
    this.wallet.remove(id);
  }

  benefitProgress(account: TrackedAccount): { done: number; total: number; leftValue: number } {
    const year = this.trackingYear();
    let done = 0;
    let total = 0;
    let leftValue = 0;
    for (const benefit of account.benefits) {
      if (benefit.cadence === 'MONTHLY') {
        const used = monthsUsedInYear(benefit, year);
        done += used;
        total += 12;
        leftValue += benefitOpenValue(benefit, year);
      } else {
        total += 1;
        if (benefit.used) {
          done += 1;
        } else {
          leftValue += benefit.amount ?? 0;
        }
      }
    }
    return { done, total, leftValue };
  }

  isBenefitComplete(benefit: AccountBenefit): boolean {
    if (benefit.cadence === 'MONTHLY') {
      return monthsUsedInYear(benefit, this.trackingYear()) >= 12;
    }
    return benefit.used;
  }

  visibleBenefits(account: TrackedAccount): AccountBenefit[] {
    if (this.showCompleted()[account.id]) {
      return account.benefits;
    }
    return account.benefits.filter((b) => !this.isBenefitComplete(b));
  }

  completedCount(account: TrackedAccount): number {
    return account.benefits.filter((b) => this.isBenefitComplete(b)).length;
  }

  toggleShowCompleted(accountId: string): void {
    this.showCompleted.update((map) => ({ ...map, [accountId]: !map[accountId] }));
  }

  monthsUsed(benefit: AccountBenefit): number {
    return monthsUsedInYear(benefit, this.trackingYear());
  }

  isMonthUsed(benefit: AccountBenefit, monthIndex: number): boolean {
    return benefit.usedMonths.includes(yearMonthKey(this.trackingYear(), monthIndex));
  }

  monthKey(monthIndex: number): string {
    return yearMonthKey(this.trackingYear(), monthIndex);
  }

  toggleBenefit(accountId: string, benefitId: string, event?: Event): void {
    event?.preventDefault();
    this.wallet.toggleBenefit(accountId, benefitId);
  }

  toggleMonth(accountId: string, benefitId: string, monthIndex: number, event?: Event): void {
    event?.preventDefault();
    this.wallet.toggleBenefitMonth(accountId, benefitId, this.monthKey(monthIndex));
  }

  removeBenefit(accountId: string, benefitId: string): void {
    this.wallet.removeBenefit(accountId, benefitId);
  }

  resetYearly(accountId: string): void {
    this.wallet.resetYearly(accountId);
  }

  setBenefitDraft(accountId: string, value: string): void {
    this.newBenefitLabel.update((map) => ({ ...map, [accountId]: value }));
  }

  benefitDraft(accountId: string): string {
    return this.newBenefitLabel()[accountId] ?? '';
  }

  setBenefitCadence(accountId: string, value: 'MONTHLY' | 'YEARLY'): void {
    this.newBenefitCadence.update((map) => ({ ...map, [accountId]: value }));
  }

  benefitCadence(accountId: string): 'MONTHLY' | 'YEARLY' {
    return this.newBenefitCadence()[accountId] ?? 'MONTHLY';
  }

  addBenefit(accountId: string): void {
    const label = this.benefitDraft(accountId).trim();
    if (!label) {
      return;
    }
    this.wallet.addBenefit(accountId, {
      label,
      amount: null,
      cadence: this.benefitCadence(accountId),
      used: false,
      usedMonths: [],
    });
    this.setBenefitDraft(accountId, '');
  }

  private resetDraft(kind: AccountKind): void {
    this.draftName.set('');
    this.draftInstitution.set('');
    this.draftStatus.set('ACTIVE');
    this.draftPayment.set(null);
    this.draftDueDay.set(null);
    this.draftAnnualFee.set(null);
    this.draftRenewsOn.set('');
    this.draftNotes.set('');
    this.draftAccent.set(defaultAccent(kind));
  }
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
