import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { EditableCellComponent } from '../editable-cell/editable-cell.component';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-cash-flow-summary',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, EditableCellComponent],
  templateUrl: './cash-flow-summary.component.html',
  styleUrls: ['./cash-flow-summary.component.scss'],
})
export class CashFlowSummaryComponent {
  budget = inject(BudgetService);

  cashFlow = this.budget.cashFlow;
  startBalance = this.budget.startBalance;

  onStartBalanceChange(value: string | number): void {
    this.budget.setStartBalance(Number(value));
  }
}
