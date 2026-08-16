import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  ActualLineItem,
  BudgetCategory,
  BudgetGroup,
  CategoryRow,
  GROUP_CONFIGS,
  GroupTotal,
} from '../models/budget.model';
import { AccessService } from './access.service';
import { ActualDto, BudgetApiService, CategoryDto, LineItemDto } from './budget-api.service';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function toCategory(dto: CategoryDto): BudgetCategory {
  return {
    id: String(dto.id),
    group: dto.group as BudgetGroup,
    name: dto.name,
    order: dto.order,
    recurring: dto.recurring,
  };
}

/** Key identifying that a category is part of a given month's row list. */
function membershipKey(categoryId: string | number, month: string): string {
  return `${categoryId}|${month}`;
}

function toLineItem(dto: LineItemDto): ActualLineItem {
  return {
    id: String(dto.id),
    categoryId: String(dto.categoryId),
    month: dto.month,
    date: dto.date,
    note: dto.note,
    amount: dto.amount,
  };
}

/**
 * All budget state, backed by the budget-tracker-api Spring Boot + PostgreSQL service.
 * Loads once on startup, then keeps signals in sync with optimistic local updates on every edit
 * (each mutation also fires the matching HTTP call in the background so the change survives reloads).
 */
@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly api = inject(BudgetApiService);
  private readonly access = inject(AccessService);
  private readonly initializedMonths = new Set<string>();

  categories = signal<BudgetCategory[]>([]);
  lineItems = signal<ActualLineItem[]>([]);

  /**
   * Which categories belong to which month. Categories themselves are shared records, so this is
   * what lets a row be removed from September while August keeps its own copy.
   */
  private monthMembership = signal<ReadonlySet<string>>(new Set());

  /** True once the initial load from the API has completed (success or failure). */
  loaded = signal(false);
  loadError = signal<string | null>(null);

  selectedMonth = signal<string>(currentMonthKey());

  groupConfigs = GROUP_CONFIGS;

  constructor() {
    effect(() => {
      if (this.access.unlocked()) {
        this.reload();
      }
    });
    effect(() => {
      const month = this.selectedMonth();
      if (!this.loaded() || this.initializedMonths.has(month)) {
        return;
      }
      this.initializedMonths.add(month);
      this.api.initializeMonth(month).subscribe({
        next: (actuals) => {
          this.addMembership(actuals);
          this.refreshLineItems();
        },
        error: (err) => {
          this.initializedMonths.delete(month);
          console.error('Failed to carry the previous month forward', err);
        },
      });
    });
  }

  private reload(): void {
    forkJoin({
      categories: this.api.getCategories(),
      actuals: this.api.getActuals(),
      lineItems: this.api.getLineItems(),
    }).subscribe({
      next: ({ categories, actuals, lineItems }) => {
        this.categories.set(categories.map(toCategory));
        this.monthMembership.set(new Set(actuals.map((a) => membershipKey(a.categoryId, a.month))));
        this.lineItems.set(lineItems.map(toLineItem));
        this.loaded.set(true);
      },
      error: (err) => {
        console.error('Failed to load budget data from the API', err);
        this.loadError.set('Could not reach the budget API — the backend may be waking up or offline.');
        this.loaded.set(true);
      },
    });
  }

  private addMembership(actuals: ActualDto[]): void {
    this.monthMembership.update((current) => {
      const next = new Set(current);
      actuals.forEach((a) => next.add(membershipKey(a.categoryId, a.month)));
      return next;
    });
  }

  private refreshLineItems(): void {
    this.api.getLineItems().subscribe({
      next: (dtos) => this.lineItems.set(dtos.map(toLineItem)),
      error: (err) => console.error('Failed to refresh detailed entries', err),
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
    return this.lineItems()
      .filter((item) => item.categoryId === categoryId && item.month === month)
      .reduce((total, item) => total + item.amount, 0);
  }

  rowsByGroup = computed(() => {
    const month = this.selectedMonth();
    const membership = this.monthMembership();
    const map = new Map<BudgetGroup, CategoryRow[]>();
    for (const cfg of GROUP_CONFIGS) {
      const rows = this.categories()
        .filter((c) => c.group === cfg.group && membership.has(membershipKey(c.id, month)))
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
          id: c.id,
          name: c.name,
          actual: this.actualFor(c.id, month),
          recurring: c.recurring,
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

  cashFlow = computed(() => {
    const income = this.totalFor('income');
    const expenses = this.totalFor('expenses');
    const bills = this.totalFor('bills');
    const saving = this.totalFor('saving');
    const debt = this.totalFor('debt');

    const totalLeftover = income.actual - expenses.actual - bills.actual - saving.actual - debt.actual;

    return { income, expenses, bills, saving, debt, totalLeftover };
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

  updateCategoryName(id: string, name: string): void {
    const category = this.categories().find((c) => c.id === id);
    if (!category) {
      return;
    }
    this.categories.update((list) => list.map((c) => (c.id === id ? { ...c, name } : c)));
    this.api.updateCategory(Number(id), category.group, name, category.recurring).subscribe({
      error: (err) => console.error('Failed to save category name', err),
    });
  }

  toggleRecurring(id: string): void {
    const category = this.categories().find((c) => c.id === id);
    if (!category) {
      return;
    }
    const recurring = !category.recurring;
    this.categories.update((list) => list.map((c) => (c.id === id ? { ...c, recurring } : c)));
    this.api.updateCategory(Number(id), category.group, category.name, recurring).subscribe({
      error: (err) => console.error('Failed to save recurring preference', err),
    });
  }

  addCategory(group: BudgetGroup, name = 'New item'): void {
    const month = this.selectedMonth();
    this.api.createCategory(group, name, month).subscribe({
      next: (dto) => {
        this.categories.update((list) => [...list, toCategory(dto)]);
        this.monthMembership.update((current) => new Set(current).add(membershipKey(dto.id, month)));
      },
      error: (err) => console.error('Failed to create category', err),
    });
  }

  /** Removes the row from the month on screen only — the same category in other months stays put. */
  removeRowFromMonth(id: string): void {
    const month = this.selectedMonth();
    this.monthMembership.update((current) => {
      const next = new Set(current);
      next.delete(membershipKey(id, month));
      return next;
    });
    this.lineItems.update((list) => list.filter((item) => !(item.categoryId === id && item.month === month)));
    this.api.removeCategoryFromMonth(Number(id), month).subscribe({
      error: (err) => console.error('Failed to remove the row from this month', err),
    });
  }

  lineItemsFor(categoryId: string): ActualLineItem[] {
    const month = this.selectedMonth();
    return this.lineItems()
      .filter((item) => item.categoryId === categoryId && item.month === month)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  addLineItem(categoryId: string, date: string, note: string, amount: number): void {
    const month = this.selectedMonth();
    this.api.createLineItem(Number(categoryId), month, date, note, amount).subscribe({
      next: (dto) => this.lineItems.update((list) => [...list, toLineItem(dto)]),
      error: (err) => console.error('Failed to add detailed entry', err),
    });
  }

  updateLineItem(item: ActualLineItem): void {
    this.lineItems.update((list) => list.map((current) => (current.id === item.id ? item : current)));
    this.api
      .updateLineItem(Number(item.id), Number(item.categoryId), item.month, item.date, item.note, item.amount)
      .subscribe({
        next: (dto) =>
          this.lineItems.update((list) =>
            list.map((current) => (current.id === item.id ? toLineItem(dto) : current)),
          ),
        error: (err) => console.error('Failed to update detailed entry', err),
      });
  }

  deleteLineItem(id: string): void {
    this.lineItems.update((list) => list.filter((item) => item.id !== id));
    this.api.deleteLineItem(Number(id)).subscribe({
      error: (err) => console.error('Failed to delete detailed entry', err),
    });
  }
}
