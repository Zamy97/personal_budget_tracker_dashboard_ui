import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from './services/auth.service';
import { BudgetService } from './services/budget.service';
import { AuthGateComponent } from './components/auth-gate/auth-gate.component';
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
    AuthGateComponent,
    CashFlowSummaryComponent,
    GroupTotalsChartComponent,
    AllocationDonutComponent,
    CategoryTableComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  auth = inject(AuthService);
  budget = inject(BudgetService);

  constructor() {
    this.auth.start();
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

  logout(): void {
    this.auth.logout();
  }
}
