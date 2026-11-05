import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild, afterNextRender, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-transaction-quick-add',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './transaction-quick-add.component.html',
  styleUrls: ['./transaction-quick-add.component.scss'],
})
export class TransactionQuickAddComponent {
  private readonly budget = inject(BudgetService);

  @Output() closed = new EventEmitter<void>();
  @ViewChild('amountInput') amountInput?: ElementRef<HTMLInputElement>;

  categoryId = signal('');
  addDate = signal(this.defaultDate());
  addNote = signal('');
  addAmount = signal<number | null>(null);
  justAdded = signal<string | null>(null);

  categorySections = this.budget.categoriesForSelectedMonth;
  recent = this.budget.recentLineItems;

  constructor() {
    afterNextRender(() => {
      const sections = this.categorySections();
      if (!this.categoryId() && sections.length) {
        const expenses = sections.find((s) => s.group === 'expenses');
        this.categoryId.set((expenses ?? sections[0]).categories[0]?.id ?? '');
      }
      this.amountInput?.nativeElement.focus();
      this.amountInput?.nativeElement.select();
    });
  }

  get monthLabel(): string {
    return this.budget.monthLabel();
  }

  get monthStart(): string {
    return `${this.budget.selectedMonth()}-01`;
  }

  get monthEnd(): string {
    const [year, month] = this.budget.selectedMonth().split('-').map(Number);
    return `${this.budget.selectedMonth()}-${new Date(year, month, 0).getDate()}`;
  }

  get canAdd(): boolean {
    const amount = this.addAmount();
    return !!this.categoryId() && !!this.addDate() && amount != null && Number.isFinite(amount);
  }

  categoryName(id: string): string {
    for (const section of this.categorySections()) {
      const match = section.categories.find((c) => c.id === id);
      if (match) {
        return match.name;
      }
    }
    return 'category';
  }

  formatDay(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) {
      return iso;
    }
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  add(): void {
    const amount = this.addAmount();
    const categoryId = this.categoryId();
    if (!this.canAdd || amount == null || !categoryId) {
      return;
    }
    this.budget.addLineItem(categoryId, this.addDate(), this.addNote().trim(), amount);
    this.justAdded.set(
      `Added ${formatMoney(amount)} to ${this.categoryName(categoryId)} on ${this.formatDay(this.addDate())}`,
    );
    this.addNote.set('');
    this.addAmount.set(null);
    queueMicrotask(() => {
      this.amountInput?.nativeElement.focus();
    });
  }

  remove(id: string): void {
    this.budget.deleteLineItem(id);
  }

  private defaultDate(): string {
    const month = this.budget.selectedMonth();
    const today = new Date();
    const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return month === todayMonth ? `${month}-${String(today.getDate()).padStart(2, '0')}` : `${month}-01`;
  }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}
