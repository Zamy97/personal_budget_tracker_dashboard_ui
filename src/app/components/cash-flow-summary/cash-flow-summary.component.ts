import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-cash-flow-summary',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './cash-flow-summary.component.html',
  styleUrls: ['./cash-flow-summary.component.scss'],
})
export class CashFlowSummaryComponent {
  budget = inject(BudgetService);

  cashFlow = this.budget.cashFlow;
}
