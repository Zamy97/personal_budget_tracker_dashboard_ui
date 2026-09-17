import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountKind, AccountStatus, TrackedAccount } from '../../models/wallet.model';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-wallet-board',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wallet-board.component.html',
  styleUrls: ['./wallet-board.component.scss'],
})
export class WalletBoardComponent {
  wallet = inject(WalletService);

  draftName = signal('');
  draftInstitution = signal('');
  draftStatus = signal<AccountStatus>('ACTIVE');
  draftBalance = signal<number | null>(0);
  draftLimit = signal<number | null>(null);
  draftRate = signal<number | null>(null);
  draftPayment = signal<number | null>(null);
  draftDueDay = signal<number | null>(null);
  draftAnnualFee = signal<number | null>(null);
  draftRenewsOn = signal('');
  draftNotes = signal('');
  draftAccent = signal('');

  activeTab = computed(() => this.wallet.tabs.find((t) => t.kind === this.wallet.selectedKind())!);
  items = this.wallet.accountsForSelected;
  totals = this.wallet.totals;
  editingId = this.wallet.editingId;

  selectTab(kind: AccountKind): void {
    this.wallet.selectKind(kind);
  }

  beginCreate(): void {
    this.resetDraft(this.wallet.selectedKind());
    this.wallet.startCreate();
  }

  beginEdit(account: TrackedAccount): void {
    this.draftName.set(account.name);
    this.draftInstitution.set(account.institution);
    this.draftStatus.set(account.status);
    this.draftBalance.set(account.balance);
    this.draftLimit.set(account.creditLimit);
    this.draftRate.set(account.interestRate);
    this.draftPayment.set(account.monthlyPayment);
    this.draftDueDay.set(account.dueDay);
    this.draftAnnualFee.set(account.annualFee);
    this.draftRenewsOn.set(account.renewsOn ?? '');
    this.draftNotes.set(account.notes);
    this.draftAccent.set(account.accent);
    this.wallet.startEdit(account.id);
  }

  cancel(): void {
    this.wallet.cancelEdit();
  }

  save(): void {
    const name = this.draftName().trim();
    if (!name) {
      return;
    }
    const kind = this.wallet.selectedKind();
    const payload = {
      kind,
      name,
      institution: this.draftInstitution().trim(),
      status: this.draftStatus(),
      balance: this.draftBalance() ?? 0,
      creditLimit: this.draftLimit(),
      interestRate: this.draftRate(),
      monthlyPayment: this.draftPayment(),
      dueDay: this.draftDueDay(),
      annualFee: this.draftAnnualFee(),
      renewsOn: this.draftRenewsOn() || null,
      accent: this.draftAccent() || defaultAccent(kind),
      notes: this.draftNotes().trim(),
    };

    const id = this.editingId();
    if (id === 'new') {
      this.wallet.saveNew(payload);
      return;
    }
    if (!id) {
      return;
    }
    const existing = this.wallet.accounts().find((a) => a.id === id);
    if (!existing) {
      return;
    }
    this.wallet.saveExisting({ ...existing, ...payload });
  }

  remove(id: string): void {
    this.wallet.remove(id);
  }

  utilization(account: TrackedAccount): number | null {
    if (!account.creditLimit || account.creditLimit <= 0) {
      return null;
    }
    return Math.min(100, (account.balance / account.creditLimit) * 100);
  }

  private resetDraft(kind: AccountKind): void {
    this.draftName.set('');
    this.draftInstitution.set('');
    this.draftStatus.set('ACTIVE');
    this.draftBalance.set(0);
    this.draftLimit.set(null);
    this.draftRate.set(null);
    this.draftPayment.set(null);
    this.draftDueDay.set(null);
    this.draftAnnualFee.set(null);
    this.draftRenewsOn.set('');
    this.draftNotes.set('');
    this.draftAccent.set(defaultAccent(kind));
  }
}

function defaultAccent(kind: AccountKind): string {
  if (kind === 'CREDIT_CARD') {
    return '#f97066';
  }
  if (kind === 'DEBT') {
    return '#818cf8';
  }
  return '#f5a623';
}
