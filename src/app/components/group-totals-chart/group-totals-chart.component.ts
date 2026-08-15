import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-group-totals-chart',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './group-totals-chart.component.html',
  styleUrls: ['./group-totals-chart.component.scss'],
})
export class GroupTotalsChartComponent {
  private budget = inject(BudgetService);

  maxValue = computed(() => Math.max(1, ...this.budget.groupTotals().map((g) => g.actual)));

  bars = computed(() =>
    this.budget.groupTotals().map((g) => ({
      ...g,
      pct: (g.actual / this.maxValue()) * 100,
    })),
  );
}
