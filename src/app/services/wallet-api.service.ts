import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountKind, AccountStatus } from '../models/wallet.model';

export interface TrackedAccountDto {
  id: number;
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

export type TrackedAccountPayload = Omit<TrackedAccountDto, 'id' | 'order'>;

const BASE_URL = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/wallet`;

@Injectable({ providedIn: 'root' })
export class WalletApiService {
  private readonly http = inject(HttpClient);

  getAccounts(): Observable<TrackedAccountDto[]> {
    return this.http.get<TrackedAccountDto[]>(`${BASE_URL}/accounts`);
  }

  seedDefaults(): Observable<TrackedAccountDto[]> {
    return this.http.post<TrackedAccountDto[]>(`${BASE_URL}/accounts/seed`, {});
  }

  createAccount(payload: TrackedAccountPayload): Observable<TrackedAccountDto> {
    return this.http.post<TrackedAccountDto>(`${BASE_URL}/accounts`, payload);
  }

  updateAccount(id: number, payload: TrackedAccountPayload): Observable<TrackedAccountDto> {
    return this.http.put<TrackedAccountDto>(`${BASE_URL}/accounts/${id}`, payload);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/accounts/${id}`);
  }
}
