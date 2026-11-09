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
import { BudgetService } from '../../services/budget.service';
import { WalletService, benefitOpenValue, monthsUsedInYear } from '../../services/wallet.service';

interface DayCharge {
  id: string;
  categoryId: string;
  categoryName: string;
  note: string;
  amount: number;
}

interface MonthDayRow {
  day: number;
  date: string;
  weekday: string;
  isToday: boolean;
  isWeekend: boolean;
  charges: DayCharge[];
  total: number;
}

/** Soft but brighter card accents so chips stay easy to tell apart. */
const CARD_PALETTE = ['#FF7A6E', '#4ECDC4', '#8B97F0', '#F0B27A', '#74D39A', '#D4A8E8', '#62B4E8', '#E0B57A'];

@Component({
  selector: 'app-wallet-board',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wallet-board.component.html',
  styleUrls: ['./wallet-board.component.scss'],
})
export class WalletBoardComponent {
  wallet = inject(WalletService);
  budget = inject(BudgetService);

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
  showCompleted = signal<Record<string, boolean>>({});
  benefitsOpen = signal<Record<string, boolean>>({});

  /** Focused credit card for the day ledger. */
  focusedCardId = signal<string | null>(null);
  /** Per-day draft amounts / notes / categories keyed by YYYY-MM-DD. */
  dayAmounts = signal<Record<string, number | null>>({});
  dayNotes = signal<Record<string, string>>({});
  dayCategories = signal<Record<string, string>>({});
  lastCategoryByCard = signal<Record<string, string>>({});

  monthLabels = MONTH_LABELS;
  monthIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  activeTab = computed(() => this.wallet.tabs.find((t) => t.kind === this.wallet.selectedKind())!);
  items = this.wallet.accountsForSelected;
  totals = this.wallet.totals;
  editingId = this.wallet.editingId;
  trackingYear = this.wallet.trackingYear;
  currentMonthKey = yearMonthKey(new Date().getFullYear(), new Date().getMonth());
  categorySections = this.budget.allCategoriesGrouped;

  focusedCard = computed(() => {
    const cards = this.items();
    if (this.wallet.selectedKind() !== 'CREDIT_CARD' || !cards.length) {
      return null;
    }
    const id = this.focusedCardId();
    return cards.find((c) => c.id === id) ?? cards[0];
  });

  focusedAccent = computed(() => {
    const card = this.focusedCard();
    if (!card) {
      return CARD_PALETTE[0];
    }
    const cards = this.items();
    const index = Math.max(0, cards.findIndex((c) => c.id === card.id));
    return this.chipAccent(card, index);
  });

  monthDays = computed(() => {
    const card = this.focusedCard();
    if (!card) {
      return [] as MonthDayRow[];
    }
    const month = this.budget.selectedMonth();
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const names = new Map(this.budget.categories().map((c) => [c.id, c.name]));
    const byDay = new Map<string, DayCharge[]>();
    for (const item of this.budget.lineItemsForAccount(card.id)) {
      const list = byDay.get(item.date) ?? [];
      list.push({
        id: item.id,
        categoryId: item.categoryId,
        categoryName: names.get(item.categoryId) ?? 'Category',
        note: item.note,
        amount: item.amount,
      });
      byDay.set(item.date, list);
    }

    const rows: MonthDayRow[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const charges = byDay.get(date) ?? [];
      const weekdayIndex = new Date(year, monthNum - 1, day).getDay();
      rows.push({
        day,
        date,
        weekday: new Date(year, monthNum - 1, day).toLocaleDateString(undefined, { weekday: 'short' }),
        isToday: date === todayIso,
        isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
        charges,
        total: charges.reduce((sum, c) => sum + c.amount, 0),
      });
    }
    return rows;
  });

  trackAccount = (_: number, account: TrackedAccount): string => account.id;
  trackBenefit = (_: number, benefit: AccountBenefit): string => benefit.id;
  trackDay = (_: number, row: MonthDayRow): string => row.date;

  /** Stable bold color per card position so the picker is easy to scan. */
  chipAccent(_account: TrackedAccount, index: number): string {
    return CARD_PALETTE[index % CARD_PALETTE.length];
  }

  nextCardAccent(): string {
    const used = new Set(this.items().map((c) => (c.accent || '').trim().toLowerCase()));
    return CARD_PALETTE.find((color) => !used.has(color.toLowerCase())) ?? CARD_PALETTE[this.items().length % CARD_PALETTE.length];
  }

  selectTab(kind: AccountKind): void {
    this.wallet.selectKind(kind);
    this.clearDayDrafts();
    if (kind === 'CREDIT_CARD') {
      const first = this.wallet.accountsForSelected()[0];
      this.focusedCardId.set(first?.id ?? null);
    }
  }

  focusCard(account: TrackedAccount): void {
    this.focusedCardId.set(account.id);
    this.clearDayDrafts();
    this.benefitsOpen.update((map) => ({ ...map, [account.id]: false }));
  }

  cardSpend(accountId: string): number {
    return this.budget.accountSpendThisMonth(accountId);
  }

  previousMonth(): void {
    this.budget.goToPreviousMonth();
    this.clearDayDrafts();
  }

  nextMonth(): void {
    this.budget.goToNextMonth();
    this.clearDayDrafts();
  }

  jumpToToday(): void {
    this.budget.goToCurrentMonth();
    this.clearDayDrafts();
    setTimeout(() => {
      document.querySelector('.day-row--today')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
  }

  clearDayDrafts(): void {
    this.dayAmounts.set({});
    this.dayNotes.set({});
    this.dayCategories.set({});
  }

  defaultCategoryId(): string {
    const card = this.focusedCard();
    const remembered = card ? this.lastCategoryByCard()[card.id] : '';
    if (remembered) {
      return remembered;
    }
    const sections = this.categorySections();
    return (
      sections.find((s) => s.group === 'expenses')?.categories[0]?.id ?? sections[0]?.categories[0]?.id ?? ''
    );
  }

  dayAmountValue(date: string): number | null {
    return this.dayAmounts()[date] ?? null;
  }

  setDayAmount(date: string, value: number | null): void {
    this.dayAmounts.update((map) => ({ ...map, [date]: value }));
  }

  dayNoteValue(date: string): string {
    return this.dayNotes()[date] ?? '';
  }

  setDayNote(date: string, value: string): void {
    this.dayNotes.update((map) => ({ ...map, [date]: value }));
  }

  dayCategoryValue(date: string): string {
    return this.dayCategories()[date] || this.defaultCategoryId();
  }

  setDayCategory(date: string, value: string): void {
    this.dayCategories.update((map) => ({ ...map, [date]: value }));
  }

  canAddDay(date: string): boolean {
    const amount = this.dayAmountValue(date);
    return !!this.focusedCard() && !!this.dayCategoryValue(date) && amount != null && Number.isFinite(amount);
  }

  addDayCharge(date: string): void {
    const card = this.focusedCard();
    const amount = this.dayAmountValue(date);
    const categoryId = this.dayCategoryValue(date);
    if (!card || amount == null || !categoryId || !this.canAddDay(date)) {
      return;
    }
    this.budget.addLineItem(categoryId, date, this.dayNoteValue(date).trim(), amount, card.id);
    this.lastCategoryByCard.update((map) => ({ ...map, [card.id]: categoryId }));
    this.dayAmounts.update((map) => ({ ...map, [date]: null }));
    this.dayNotes.update((map) => ({ ...map, [date]: '' }));
  }

  removeCharge(id: string): void {
    this.budget.deleteLineItem(id);
  }

  toggleBenefits(accountId: string): void {
    this.benefitsOpen.update((map) => ({ ...map, [accountId]: !map[accountId] }));
  }

  benefitsExpanded(accountId: string): boolean {
    return !!this.benefitsOpen()[accountId];
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
    if (this.focusedCardId() === id) {
      this.focusedCardId.set(null);
    }
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
    this.draftAccent.set(kind === 'CREDIT_CARD' ? this.nextCardAccent() : defaultAccent(kind));
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
