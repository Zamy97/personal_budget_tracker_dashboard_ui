import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ActualLineItem } from '../../models/budget.model';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-line-item-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './line-item-editor.component.html',
  styleUrls: ['./line-item-editor.component.scss'],
})
export class LineItemEditorComponent {
  private readonly budget = inject(BudgetService);

  @Input({ required: true }) categoryId = '';
  @Input({ required: true }) categoryName = '';
  @Output() closed = new EventEmitter<void>();

  addDate = signal(this.defaultDate());
  addNote = signal('');
  addAmount = signal<number | null>(null);

  get items(): ActualLineItem[] {
    return this.budget.lineItemsFor(this.categoryId);
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.amount, 0);
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
    return !!this.addDate() && amount != null && Number.isFinite(amount);
  }

  /** Formats "2026-08-15" as "Aug 15" without letting the timezone shift the day. */
  formatDay(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) {
      return iso;
    }
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  add(): void {
    const amount = this.addAmount();
    if (!this.canAdd || amount == null) {
      return;
    }
    this.budget.addLineItem(this.categoryId, this.addDate(), this.addNote(), amount);
    this.addNote.set('');
    this.addAmount.set(null);
  }

  update(item: ActualLineItem, patch: Partial<Pick<ActualLineItem, 'date' | 'note' | 'amount'>>): void {
    this.budget.updateLineItem({ ...item, ...patch });
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
