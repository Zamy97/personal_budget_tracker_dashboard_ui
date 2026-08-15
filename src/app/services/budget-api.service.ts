import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetGroup } from '../models/budget.model';

export interface CategoryDto {
  id: number;
  group: string;
  name: string;
  order: number;
}

export interface ActualDto {
  id: number;
  categoryId: number;
  month: string;
  actual: number;
}

export interface StartBalanceDto {
  month: string;
  actual: number;
}

const BASE_URL = '/api/budget';

/** Thin HTTP client for the Spring Boot + PostgreSQL budget-tracker-api backend. */
@Injectable({ providedIn: 'root' })
export class BudgetApiService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`${BASE_URL}/categories`);
  }

  createCategory(group: BudgetGroup, name: string): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${BASE_URL}/categories`, { group, name });
  }

  updateCategory(id: number, group: BudgetGroup, name: string): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${BASE_URL}/categories/${id}`, { group, name });
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/categories/${id}`);
  }

  getActuals(): Observable<ActualDto[]> {
    return this.http.get<ActualDto[]>(`${BASE_URL}/actuals`);
  }

  upsertActual(categoryId: number, month: string, actual: number): Observable<ActualDto> {
    return this.http.put<ActualDto>(`${BASE_URL}/actuals`, { categoryId, month, actual });
  }

  getStartBalances(): Observable<StartBalanceDto[]> {
    return this.http.get<StartBalanceDto[]>(`${BASE_URL}/start-balances`);
  }

  upsertStartBalance(month: string, actual: number): Observable<StartBalanceDto> {
    return this.http.put<StartBalanceDto>(`${BASE_URL}/start-balances`, { month, actual });
  }
}
