export type AccountKind = 'CREDIT_CARD' | 'DEBT' | 'MEMBERSHIP';
export type AccountStatus = 'ACTIVE' | 'PLANNED' | 'CLOSED';
export type BenefitCadence = 'YEARLY' | 'ONCE';

export interface AccountBenefit {
  id: string;
  label: string;
  amount: number | null;
  cadence: BenefitCadence;
  used: boolean;
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

export const WALLET_TABS: WalletTabConfig[] = [
  {
    kind: 'CREDIT_CARD',
    label: 'Credit Cards',
    hint: 'Track cards and check off annual credits so nothing expires unused',
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
