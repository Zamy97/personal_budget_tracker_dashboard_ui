import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  ActualEntry,
  BudgetCategory,
  BudgetGroup,
  CategoryRow,
  GROUP_CONFIGS,
  GroupTotal,
  StartBalanceEntry,
} from '../models/budget.model';
import { ActualDto, BudgetApiService, CategoryDto, StartBalanceDto } from './budget-api.service';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toCategory(dto: CategoryDto): BudgetCategory {
  return { id: String(dto.id), group: dto.group as BudgetGroup, name: dto.name, order: dto.order };
}

function toActual(dto: ActualDto): ActualEntry {
  return { id: String(dto.id), categoryId: String(dto.categoryId), month: dto.month, actual: dto.actual };
}

function toStartBalance(dto: StartBalanceDto): StartBalanceEntry {
  return { month: dto.month, actual: dto.actual };
}

/**
 * All budget state, backed by the budget-tracker-api Spring Boot + PostgreSQL service.
 * Loads once on startup, then keeps signals in sync with optimistic local updates on every edit
 * (each mutation also fires the matching HTTP call in the background so the change survives reloads).
 */
@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly api = inject(BudgetApiService);

  categories = signal<BudgetCategory[]>([]);
  actuals = signal<ActualEntry[]>([]);
  startBalances = signal<StartBalanceEntry[]>([]);

  /** True once the initial load from the API has completed (success or failure). */
  loaded = signal(false);
  loadError = signal<string | null>(null);

  selectedMonth = signal<string>(currentMonthKey());

  groupConfigs = GROUP_CONFIGS;

  constructor() {
    this.reload();
  }

  private reload(): void {
    forkJoin({
      categories: this.api.getCategories(),
      actuals: this.api.getActuals(),
      startBalances: this.api.getStartBalances(),
    }).subscribe({
      next: ({ categories, actuals, startBalances }) => {
        this.categories.set(categories.map(toCategory));
        this.actuals.set(actuals.map(toActual));
        this.startBalances.set(startBalances.map(toStartBalance));
        this.loaded.set(true);
      },
      error: (err) => {
        console.error('Failed to load budget data from the API', err);
        this.loadError.set('Could not reach the budget API — the backend may be waking up or offline.');
        this.loaded.set(true);
      },
    });
  }

  // ---------- month navigation ----------

  monthLabel = computed(() => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const labels = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${labels[month - 1]} ${year}`;
  });

  isCurrentMonth = computed(() => this.selectedMonth() === currentMonthKey());

  goToPreviousMonth(): void {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    this.selectedMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  goToNextMonth(): void {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const d = new Date(year, month, 1);
    this.selectedMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  goToCurrentMonth(): void {
    this.selectedMonth.set(currentMonthKey());
  }

  daysLeft = computed(() => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    if (this.isCurrentMonth()) {
      return Math.max(daysInMonth - now.getDate(), 0);
    }
    const selected = new Date(year, month - 1, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), 1);
    return selected > today ? daysInMonth : 0;
  });

  // ---------- category rows (per selected month) ----------

  private actualFor(categoryId: string, month: string): number {
    return this.actuals().find((a) => a.categoryId === categoryId && a.month === month)?.actual ?? 0;
  }

  rowsByGroup = computed(() => {
    const month = this.selectedMonth();
    const map = new Map<BudgetGroup, CategoryRow[]>();
    for (const cfg of GROUP_CONFIGS) {
      const rows = this.categories()
        .filter((c) => c.group === cfg.group)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          id: c.id,
          name: c.name,
          actual: this.actualFor(c.id, month),
        } satisfies CategoryRow));
      map.set(cfg.group, rows);
    }
    return map;
  });

  groupTotals = computed<GroupTotal[]>(() => {
    const rowsByGroup = this.rowsByGroup();
    return GROUP_CONFIGS.map((cfg) => {
      const rows = rowsByGroup.get(cfg.group) ?? [];
      return {
        group: cfg.group,
        label: cfg.label,
        color: cfg.color,
        actual: rows.reduce((sum, r) => sum + r.actual, 0),
      };
    });
  });

  private totalFor(group: BudgetGroup): GroupTotal {
    return this.groupTotals().find((g) => g.group === group)!;
  }

  // ---------- cash flow summary ----------

  startBalance = computed<StartBalanceEntry>(() => {
    const month = this.selectedMonth();
    return this.startBalances().find((s) => s.month === month) ?? { month, actual: 0 };
  });

  cashFlow = computed(() => {
    const start = this.startBalance();
    const income = this.totalFor('income');
    const expenses = this.totalFor('expenses');
    const bills = this.totalFor('bills');
    const saving = this.totalFor('saving');
    const debt = this.totalFor('debt');

    const totalLeftover = start.actual + income.actual - expenses.actual - bills.actual - saving.actual - debt.actual;

    return { start, income, expenses, bills, saving, debt, totalLeftover };
  });

  leftToSpend = computed(() => this.cashFlow().totalLeftover);

  /** % breakdown of actual outflows (Expenses/Bills/Saving/Debt) for the allocation donut. */
  allocationBreakdown = computed(() => {
    const outflowGroups = this.groupTotals().filter((g) => GROUP_CONFIGS.find((c) => c.group === g.group)?.isOutflow);
    const total = outflowGroups.reduce((sum, g) => sum + g.actual, 0);
    return outflowGroups.map((g) => ({
      ...g,
      percent: total > 0 ? (g.actual / total) * 100 : 0,
    }));
  });

  // ---------- mutations ----------
  // Each mutation updates the local signal immediately (snappy inline editing), then persists to
  // the API in the background. Errors are logged — the next full reload will pick up server truth.

  setStartBalance(value: number): void {
    const month = this.selectedMonth();
    this.startBalances.update((list) => {
      const existing = list.find((s) => s.month === month);
      if (existing) {
        return list.map((s) => (s.month === month ? { ...s, actual: value } : s));
      }
      return [...list, { month, actual: value }];
    });
    this.api.upsertStartBalance(month, value).subscribe({
      error: (err) => console.error('Failed to save start balance', err),
    });
  }

  updateCategoryName(id: string, name: string): void {
    const category = this.categories().find((c) => c.id === id);
    if (!category) {
      return;
    }
    this.categories.update((list) => list.map((c) => (c.id === id ? { ...c, name } : c)));
    this.api.updateCategory(Number(id), category.group, name).subscribe({
      error: (err) => console.error('Failed to save category name', err),
    });
  }

  updateActual(categoryId: string, actual: number): void {
    const month = this.selectedMonth();
    this.actuals.update((list) => {
      const existing = list.find((a) => a.categoryId === categoryId && a.month === month);
      if (existing) {
        return list.map((a) => (a === existing ? { ...a, actual } : a));
      }
      return [...list, { id: `pending-${categoryId}-${month}`, categoryId, month, actual }];
    });
    this.api.upsertActual(Number(categoryId), month, actual).subscribe({
      next: (dto) =>
        this.actuals.update((list) =>
          list.map((a) => (a.categoryId === categoryId && a.month === month ? toActual(dto) : a)),
        ),
      error: (err) => console.error('Failed to save actual amount', err),
    });
  }

  addCategory(group: BudgetGroup, name = 'New item'): void {
    this.api.createCategory(group, name).subscribe({
      next: (dto) => this.categories.update((list) => [...list, toCategory(dto)]),
      error: (err) => console.error('Failed to create category', err),
    });
  }

  deleteCategory(id: string): void {
    this.categories.update((list) => list.filter((c) => c.id !== id));
    this.actuals.update((list) => list.filter((a) => a.categoryId !== id));
    this.api.deleteCategory(Number(id)).subscribe({
      error: (err) => console.error('Failed to delete category', err),
    });
  }
}
