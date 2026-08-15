import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AccessService } from '../../services/access.service';

@Component({
  selector: 'app-access-gate',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './access-gate.component.html',
  styleUrls: ['./access-gate.component.scss'],
})
export class AccessGateComponent {
  access = inject(AccessService);
  draft = signal('');

  submit(event: Event): void {
    event.preventDefault();
    const code = this.draft().trim();
    if (!code || this.access.submitting()) {
      return;
    }
    this.access.unlock(code);
  }
}
