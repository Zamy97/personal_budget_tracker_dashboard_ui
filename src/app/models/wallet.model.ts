export type AccountKind = 'CREDIT_CARD' | 'DEBT' | 'MEMBERSHIP';
export type AccountStatus = 'ACTIVE' | 'PLANNED' | 'CLOSED';

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
}

export interface WalletTabConfig {
  kind: AccountKind;
  label: string;
  hint: string;
  icon: string;
  color: string;
}

export const WALLET_TABS: WalletTabConfig[] = [
  {
    kind: 'CREDIT_CARD',
    label: 'Credit Cards',
    hint: 'Balances, limits, and annual fees',
    icon: 'credit-card',
    color: '--expense',
  },
  {
    kind: 'DEBT',
    label: 'Mortgages & Debt',
    hint: 'Mortgages, loans, and payoffs',
    icon: 'landmark',
    color: '--info',
  },
  {
    kind: 'MEMBERSHIP',
    label: 'Memberships',
    hint: 'Clubs, subscriptions, and renewals',
    icon: 'ticket',
    color: '--warn',
  },
];
