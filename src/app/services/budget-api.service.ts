import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BudgetGroup } from '../models/budget.model';

export interface CategoryDto {
  id: number;
  group: string;
  name: string;
  order: number;
  recurring: boolean;
}

export interface ActualDto {
  id: number;
  categoryId: number;
  month: string;
  actual: number;
}

export interface LineItemDto {
  id: number;
  categoryId: number;
  month: string;
  date: string;
  note: string;
  amount: number;
}

const BASE_URL = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/budget`;

/** Thin HTTP client for the Spring Boot + PostgreSQL budget-tracker-api backend. */
@Injectable({ providedIn: 'root' })
export class BudgetApiService {
  private readonly http = inject(HttpClient);

  getCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`${BASE_URL}/categories`);
  }

  createCategory(group: BudgetGroup, name: string, month: string, recurring = false): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${BASE_URL}/categories`, { group, name, recurring, month });
  }

  updateCategory(id: number, group: BudgetGroup, name: string, recurring: boolean): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(`${BASE_URL}/categories/${id}`, { group, name, recurring });
  }

  getActuals(): Observable<ActualDto[]> {
    return this.http.get<ActualDto[]>(`${BASE_URL}/actuals`);
  }

  upsertActual(categoryId: number, month: string, actual: number): Observable<ActualDto> {
    return this.http.put<ActualDto>(`${BASE_URL}/actuals`, { categoryId, month, actual });
  }

  /** Removes a row from a single month, leaving the same category in other months untouched. */
  removeCategoryFromMonth(categoryId: number, month: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/actuals/${categoryId}/${month}`);
  }

  initializeMonth(month: string): Observable<ActualDto[]> {
    return this.http.post<ActualDto[]>(`${BASE_URL}/actuals/initialize`, { month });
  }

  getLineItems(): Observable<LineItemDto[]> {
    return this.http.get<LineItemDto[]>(`${BASE_URL}/line-items`);
  }

  createLineItem(
    categoryId: number,
    month: string,
    date: string,
    note: string,
    amount: number,
  ): Observable<LineItemDto> {
    return this.http.post<LineItemDto>(`${BASE_URL}/line-items`, { categoryId, month, date, note, amount });
  }

  updateLineItem(
    id: number,
    categoryId: number,
    month: string,
    date: string,
    note: string,
    amount: number,
  ): Observable<LineItemDto> {
    return this.http.put<LineItemDto>(`${BASE_URL}/line-items/${id}`, {
      categoryId,
      month,
      date,
      note,
      amount,
    });
  }

  deleteLineItem(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/line-items/${id}`);
  }
}
