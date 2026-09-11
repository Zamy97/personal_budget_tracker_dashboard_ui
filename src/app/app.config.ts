import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { authInterceptor } from './interceptors/auth.interceptor';
import { APP_ICONS } from './shared/lucide-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
  ],
};
