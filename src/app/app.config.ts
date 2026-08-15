import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from './shared/lucide-icons';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), importProvidersFrom(LucideAngularModule.pick(APP_ICONS))],
};
