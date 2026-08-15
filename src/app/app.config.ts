import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { accessCodeInterceptor } from './interceptors/access-code.interceptor';
import { APP_ICONS } from './shared/lucide-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([accessCodeInterceptor])),
    importProvidersFrom(LucideAngularModule.pick(APP_ICONS)),
  ],
};
