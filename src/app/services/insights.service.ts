import { Injectable, computed, inject } from '@angular/core';
import { BudgetService } from './budget.service';
import { WalletService } from './wallet.service';

export type InsightTone = 'good' | 'warn' | 'info' | 'neutral';

export interface AutoInsight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private budget = inject(BudgetService);
  private wallet = inject(WalletService);

  /** Days elapsed in the selected month (1-based; full month if past). */
  private daysElapsed = computed(() => {
    const [year, month] = this.budget.selectedMonth().split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    if (this.budget.isCurrentMonth()) {
      return Math.min(Math.max(new Date().getDate(), 1), daysInMonth);
    }
    const selected = new Date(year, month - 1, 1);
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    return selected < current ? daysInMonth : 1;
  });

  private daysInMonth = computed(() => {
    const [year, month] = this.budget.selectedMonth().split('-').map(Number);
    return new Date(year, month, 0).getDate();
  });

  /** Outflow so far (expenses + bills + debt — saving treated separately). */
  private spentSoFar = computed(() => {
    const cf = this.budget.cashFlow();
    return cf.expenses.actual + cf.bills.actual + cf.debt.actual;
  });

  dailyBurn = computed(() => {
    const elapsed = this.daysElapsed();
    return elapsed > 0 ? this.spentSoFar() / elapsed : 0;
  });

  /** Suggested max spend per remaining day from leftover. */
  safePerDay = computed(() => {
    const days = this.budget.daysLeft();
    const left = this.budget.leftToSpend();
    if (days <= 0) {
      return left;
    }
    return left / days;
  });

  /** Project leftover if current daily burn continues. */
  projectedLeftover = computed(() => {
    const income = this.budget.cashFlow().income.actual;
    const saving = this.budget.cashFlow().saving.actual;
    const remainingDays = this.budget.daysLeft();
    const projectedSpend = this.spentSoFar() + this.dailyBurn() * remainingDays;
    return income - saving - projectedSpend;
  });

  topExpenseCategory = computed(() => {
    const rows = this.budget.rowsByGroup().get('expenses') ?? [];
    if (!rows.length) {
      return null;
    }
    return [...rows].sort((a, b) => b.actual - a.actual)[0];
  });

  upcomingDues = computed(() => {
    const today = new Date().getDate();
    const daysInMonth = this.daysInMonth();
    return this.wallet
      .accounts()
      .filter((a) => a.status === 'ACTIVE' && a.dueDay != null)
      .map((a) => {
        const due = a.dueDay!;
        let daysUntil = due - today;
        if (daysUntil < 0) {
          daysUntil = due + (daysInMonth - today);
        }
        return { id: a.id, name: a.name, dueDay: due, daysUntil, payment: a.monthlyPayment };
      })
      .filter((d) => d.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  });

  openBenefitsCount = computed(() => {
    const year = this.wallet.trackingYear();
    let open = 0;
    for (const account of this.wallet.accounts()) {
      for (const benefit of account.benefits) {
        if (benefit.cadence === 'MONTHLY') {
          const used = (benefit.usedMonths ?? []).filter((m) => m.startsWith(`${year}-`)).length;
          if (used < 12) {
            open += 1;
          }
        } else if (!benefit.used) {
          open += 1;
        }
      }
    }
    return open;
  });

  insights = computed((): AutoInsight[] => {
    const tips: AutoInsight[] = [];
    const left = this.budget.leftToSpend();
    const days = this.budget.daysLeft();
    const safe = this.safePerDay();
    const projected = this.projectedLeftover();
    const burn = this.dailyBurn();
    const top = this.topExpenseCategory();
    const dues = this.upcomingDues();
    const isCurrent = this.budget.isCurrentMonth();

    if (isCurrent && days > 0) {
      tips.push({
        id: 'safe-day',
        tone: safe >= 0 ? 'good' : 'warn',
        title: safe >= 0 ? `${formatMoney(safe)} / day` : 'Over budget',
        detail: safe >= 0 ? `Safe to spend for the next ${days} day${days === 1 ? '' : 's'}` : 'Leftover is negative — trim expenses or add income',
        icon: safe >= 0 ? 'circle-dollar-sign' : 'alert-triangle',
      });
    }

    if (isCurrent && burn > 0) {
      const onPace = projected >= 0;
      tips.push({
        id: 'pace',
        tone: onPace ? 'good' : 'warn',
        title: onPace ? 'On pace' : 'Spending hot',
        detail: onPace
          ? `At this rate you’d finish near ${formatMoney(projected)} leftover`
          : `Current pace projects ${formatMoney(projected)} by month-end`,
        icon: onPace ? 'trending-up' : 'trending-down',
      });
    }

    if (top && top.actual > 0) {
      tips.push({
        id: 'top-cat',
        tone: 'info',
        title: top.name,
        detail: `Top expense this month · ${formatMoney(top.actual)}`,
        icon: 'shopping-cart',
      });
    }

    for (const due of dues) {
      tips.push({
        id: `due-${due.id}`,
        tone: due.daysUntil <= 2 ? 'warn' : 'info',
        title: due.daysUntil === 0 ? `${due.name} due today` : `${due.name} due in ${due.daysUntil}d`,
        detail: due.payment != null ? `Payment around ${formatMoney(due.payment)}` : `Due on the ${due.dueDay}${ordinal(due.dueDay)}`,
        icon: 'calendar-clock',
      });
    }

    const openBenefits = this.openBenefitsCount();
    if (openBenefits > 0) {
      tips.push({
        id: 'benefits',
        tone: 'neutral',
        title: `${openBenefits} benefit${openBenefits === 1 ? '' : 's'} open`,
        detail: 'Wallet benefits still unused this year',
        icon: 'zap',
      });
    }

    if (!tips.length) {
      tips.push({
        id: 'empty',
        tone: 'neutral',
        title: 'Add a few transactions',
        detail: 'Insights appear automatically from your budget and wallet activity',
        icon: 'sparkles',
      });
    }

    return tips.slice(0, 4);
  });

  headline = computed(() => {
    const safe = this.safePerDay();
    const projected = this.projectedLeftover();
    return {
      safePerDay: safe,
      projectedLeftover: projected,
      dailyBurn: this.dailyBurn(),
    };
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) {
    return 'th';
  }
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
