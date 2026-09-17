import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from './services/auth.service';
import { BudgetService } from './services/budget.service';
import { AuthGateComponent } from './components/auth-gate/auth-gate.component';
import { CashFlowSummaryComponent } from './components/cash-flow-summary/cash-flow-summary.component';
import { GroupTotalsChartComponent } from './components/group-totals-chart/group-totals-chart.component';
import { AllocationDonutComponent } from './components/allocation-donut/allocation-donut.component';
import { CategoryTableComponent } from './components/category-table/category-table.component';
import { WalletBoardComponent } from './components/wallet-board/wallet-board.component';

type AppView = 'budget' | 'wallet';

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
    WalletBoardComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  auth = inject(AuthService);
  budget = inject(BudgetService);

  view = signal<AppView>('budget');

  /** Bumps on month change so the tables gently re-animate. */
  monthMotion = signal(0);

  constructor() {
    this.auth.start();
  }

  showBudget(): void {
    this.view.set('budget');
  }

  showWallet(): void {
    this.view.set('wallet');
  }

  previousMonth(): void {
    this.budget.goToPreviousMonth();
    this.pulseMonth();
  }

  nextMonth(): void {
    this.budget.goToNextMonth();
    this.pulseMonth();
  }

  jumpToToday(): void {
    this.budget.goToCurrentMonth();
    this.pulseMonth();
  }

  logout(): void {
    this.auth.logout();
  }

  private pulseMonth(): void {
    this.monthMotion.update((n) => n + 1);
  }
}
