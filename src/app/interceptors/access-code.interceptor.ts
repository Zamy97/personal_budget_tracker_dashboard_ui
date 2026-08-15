import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AccessService } from '../services/access.service';

export const accessCodeInterceptor: HttpInterceptorFn = (req, next) => {
  const access = inject(AccessService);
  const code = access.code();
  const authed = code ? req.clone({ setHeaders: { 'X-Access-Code': code } }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        access.lock();
      }
      return throwError(() => err);
    }),
  );
};
