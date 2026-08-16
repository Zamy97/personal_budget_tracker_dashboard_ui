import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { EditableCellComponent } from '../editable-cell/editable-cell.component';
import { LineItemEditorComponent } from '../line-item-editor/line-item-editor.component';
import { BudgetService } from '../../services/budget.service';
import { BudgetGroup, CategoryRow, GROUP_CONFIGS } from '../../models/budget.model';

@Component({
  selector: 'app-category-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, EditableCellComponent, LineItemEditorComponent],
  templateUrl: './category-table.component.html',
  styleUrls: ['./category-table.component.scss'],
})
export class CategoryTableComponent {
  private budget = inject(BudgetService);

  @Input({ required: true }) group!: BudgetGroup;

  config = computed(() => GROUP_CONFIGS.find((c) => c.group === this.group)!);
  rows = computed(() => this.budget.rowsByGroup().get(this.group) ?? []);
  total = computed(() => this.budget.groupTotals().find((g) => g.group === this.group)!);
  selectedRow = signal<CategoryRow | null>(null);

  onNameChange(id: string, value: string | number): void {
    this.budget.updateCategoryName(id, String(value));
  }

  toggleRecurring(id: string): void {
    this.budget.toggleRecurring(id);
  }

  openDetails(row: CategoryRow): void {
    this.selectedRow.set(row);
  }

  addRow(): void {
    this.budget.addCategory(this.group);
  }

  deleteRow(id: string): void {
    this.budget.deleteCategory(id);
  }
}
