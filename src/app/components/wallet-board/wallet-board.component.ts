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
  draftPayment = signal<number | null>(null);
  draftDueDay = signal<number | null>(null);
  draftAnnualFee = signal<number | null>(null);
  draftRenewsOn = signal('');
  draftNotes = signal('');
  draftAccent = signal('');
  newBenefitLabel = signal<Record<string, string>>({});

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
    const id = this.editingId();
    const existing = id && id !== 'new' ? this.wallet.accounts().find((a) => a.id === id) : null;

    const payload = {
      kind,
      name,
      institution: this.draftInstitution().trim(),
      status: this.draftStatus(),
      balance: existing?.balance ?? 0,
      creditLimit: existing?.creditLimit ?? null,
      interestRate: existing?.interestRate ?? null,
      monthlyPayment: kind === 'MEMBERSHIP' ? null : this.draftPayment(),
      dueDay: kind === 'MEMBERSHIP' ? null : this.draftDueDay(),
      annualFee: this.draftAnnualFee(),
      renewsOn: kind === 'MEMBERSHIP' ? this.draftRenewsOn() || null : null,
      accent: this.draftAccent() || defaultAccent(kind),
      notes: this.draftNotes().trim(),
    };

    if (id === 'new') {
      this.wallet.saveNew(payload);
      return;
    }
    if (!id || !existing) {
      return;
    }
    this.wallet.saveExisting({ ...existing, ...payload });
  }

  remove(id: string): void {
    this.wallet.remove(id);
  }

  benefitProgress(account: TrackedAccount): { done: number; total: number; leftValue: number } {
    const total = account.benefits.length;
    const done = account.benefits.filter((b) => b.used).length;
    const leftValue = account.benefits.filter((b) => !b.used).reduce((sum, b) => sum + (b.amount ?? 0), 0);
    return { done, total, leftValue };
  }

  toggleBenefit(accountId: string, benefitId: string): void {
    this.wallet.toggleBenefit(accountId, benefitId);
  }

  removeBenefit(accountId: string, benefitId: string): void {
    this.wallet.removeBenefit(accountId, benefitId);
  }

  resetYearly(accountId: string): void {
    this.wallet.resetYearly(accountId);
  }

  setBenefitDraft(accountId: string, value: string): void {
    this.newBenefitLabel.update((map) => ({ ...map, [accountId]: value }));
  }

  benefitDraft(accountId: string): string {
    return this.newBenefitLabel()[accountId] ?? '';
  }

  addBenefit(accountId: string): void {
    const label = this.benefitDraft(accountId).trim();
    if (!label) {
      return;
    }
    this.wallet.addBenefit(accountId, {
      label,
      amount: null,
      cadence: 'YEARLY',
      used: false,
    });
    this.setBenefitDraft(accountId, '');
  }

  private resetDraft(kind: AccountKind): void {
    this.draftName.set('');
    this.draftInstitution.set('');
    this.draftStatus.set('ACTIVE');
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
