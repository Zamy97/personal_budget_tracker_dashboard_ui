/** The five sheet sections of the budget spreadsheet, top to bottom. */
export type BudgetGroup = 'income' | 'expenses' | 'bills' | 'saving' | 'debt';

export interface GroupConfig {
  group: BudgetGroup;
  label: string;
  /** CSS color var name, e.g. "--income" — used for header accent + chart series. */
  color: string;
  icon: string;
  /** Whether this group counts as an "outflow" for the allocation donut + cash flow math. */
  isOutflow: boolean;
}

export const GROUP_CONFIGS: GroupConfig[] = [
  { group: 'income', label: 'Income', color: '--income', icon: 'trending-up', isOutflow: false },
  { group: 'expenses', label: 'Expenses', color: '--expense', icon: 'shopping-cart', isOutflow: true },
  { group: 'bills', label: 'Bills', color: '--info', icon: 'receipt', isOutflow: true },
  { group: 'saving', label: 'Saving', color: '--warn', icon: 'piggy-bank', isOutflow: true },
  { group: 'debt', label: 'Debt', color: '--debt', icon: 'credit-card', isOutflow: true },
];

/** A named line item within a group — a simple label, no budget target. */
export interface BudgetCategory {
  id: string;
  group: BudgetGroup;
  name: string;
  /** Sort position within its group. */
  order: number;
  /** Whether this category's dated entries should initialize the next blank month. */
  recurring: boolean;
}

/** The amount actually logged for one category in one specific month ("YYYY-MM"). */
export interface ActualEntry {
  id: string;
  categoryId: string;
  month: string;
  actual: number;
}

/** One dated amount contributing to a category's monthly actual total. */
export interface ActualLineItem {
  id: string;
  categoryId: string;
  month: string;
  date: string;
  note: string;
  amount: number;
}

/** Derived row used for rendering any category table (checkbook-register style). */
export interface CategoryRow {
  id: string;
  name: string;
  actual: number;
  recurring: boolean;
}

/** Derived total for a whole group, used in the Cash Flow Summary + chart. */
export interface GroupTotal {
  group: BudgetGroup;
  label: string;
  color: string;
  actual: number;
}
