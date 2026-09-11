import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Attaches the JWT and locks the UI if a protected call comes back 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const withAuth = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(withAuth).pipe(
    catchError((err) => {
      if (err?.status === 401 && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/signup')) {
        auth.lock();
      }
      return throwError(() => err);
    }),
  );
};
