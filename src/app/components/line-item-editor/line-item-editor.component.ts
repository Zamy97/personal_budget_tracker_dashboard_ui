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

  add(): void {
    const amount = this.addAmount();
    if (!this.addDate() || amount == null || !Number.isFinite(amount)) {
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
