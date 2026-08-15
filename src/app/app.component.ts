import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AccessService } from './services/access.service';
import { BudgetService } from './services/budget.service';
import { AccessGateComponent } from './components/access-gate/access-gate.component';
import { CashFlowSummaryComponent } from './components/cash-flow-summary/cash-flow-summary.component';
import { GroupTotalsChartComponent } from './components/group-totals-chart/group-totals-chart.component';
import { AllocationDonutComponent } from './components/allocation-donut/allocation-donut.component';
import { CategoryTableComponent } from './components/category-table/category-table.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    AccessGateComponent,
    CashFlowSummaryComponent,
    GroupTotalsChartComponent,
    AllocationDonutComponent,
    CategoryTableComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  access = inject(AccessService);
  budget = inject(BudgetService);

  constructor() {
    this.access.start();
  }

  previousMonth(): void {
    this.budget.goToPreviousMonth();
  }

  nextMonth(): void {
    this.budget.goToNextMonth();
  }

  jumpToToday(): void {
    this.budget.goToCurrentMonth();
  }
}
