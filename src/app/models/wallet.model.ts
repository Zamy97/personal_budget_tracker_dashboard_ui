export type AccountKind = 'CREDIT_CARD' | 'DEBT' | 'MEMBERSHIP';
export type AccountStatus = 'ACTIVE' | 'PLANNED' | 'CLOSED';
export type BenefitCadence = 'MONTHLY' | 'YEARLY' | 'ONCE';

export interface AccountBenefit {
  id: string;
  label: string;
  amount: number | null;
  cadence: BenefitCadence;
  used: boolean;
  /** YYYY-MM keys checked for MONTHLY benefits. */
  usedMonths: string[];
  order: number;
}

export interface TrackedAccount {
  id: string;
  kind: AccountKind;
  name: string;
  institution: string;
  status: AccountStatus;
  balance: number;
  creditLimit: number | null;
  interestRate: number | null;
  monthlyPayment: number | null;
  dueDay: number | null;
  annualFee: number | null;
  renewsOn: string | null;
  accent: string;
  notes: string;
  order: number;
  benefits: AccountBenefit[];
}

export interface WalletTabConfig {
  kind: AccountKind;
  label: string;
  hint: string;
  icon: string;
  color: string;
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const WALLET_TABS: WalletTabConfig[] = [
  {
    kind: 'CREDIT_CARD',
    label: 'Credit Cards',
    hint: 'Check off monthly credits as you use them — Uber, entertainment, and more',
    icon: 'credit-card',
    color: '--expense',
  },
  {
    kind: 'DEBT',
    label: 'Mortgages & Debt',
    hint: 'Keep mortgages and loans visible without juggling balances here',
    icon: 'landmark',
    color: '--info',
  },
  {
    kind: 'MEMBERSHIP',
    label: 'Memberships',
    hint: 'Clubs and subscriptions — renewals and what you get for the fee',
    icon: 'ticket',
    color: '--warn',
  },
];

export function yearMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function normalizeCadence(raw: string | null | undefined): BenefitCadence {
  if (raw === 'MONTHLY') {
    return 'MONTHLY';
  }
  if (raw === 'ONCE') {
    return 'ONCE';
  }
  return 'YEARLY';
}
