import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { InsightsService } from '../../services/insights.service';

@Component({
  selector: 'app-auto-insights',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './auto-insights.component.html',
  styleUrls: ['./auto-insights.component.scss'],
})
export class AutoInsightsComponent {
  insights = inject(InsightsService);
}
