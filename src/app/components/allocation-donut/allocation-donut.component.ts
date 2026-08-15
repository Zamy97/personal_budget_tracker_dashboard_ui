import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-allocation-donut',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './allocation-donut.component.html',
  styleUrls: ['./allocation-donut.component.scss'],
})
export class AllocationDonutComponent {
  private budget = inject(BudgetService);

  breakdown = this.budget.allocationBreakdown;

  /** CSS conic-gradient stops built from each group's percent of total actual outflow. */
  gradient = computed(() => {
    const segments = this.breakdown().filter((s) => s.percent > 0);
    if (segments.length === 0) {
      return 'conic-gradient(rgba(255,255,255,0.08) 0deg 360deg)';
    }
    let cursor = 0;
    const stops = segments.map((s) => {
      const start = cursor;
      cursor += (s.percent / 100) * 360;
      return `var(${s.color}) ${start}deg ${cursor}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  hasData = computed(() => this.breakdown().some((s) => s.actual > 0));
}
