import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

// Sin esto, DatePipe/CurrencyPipe usan inglés (en-US) por default: los
// nombres de día/mes salen en inglés aunque el resto del template esté en
// español (ej. "Sunday 27 de September" en vez de "domingo 27 de septiembre").
registerLocaleData(localeEsAr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Sin esto, el link "Próximamente" del header (routerLink="/" con
    // fragment="proximamente") cambia la URL pero nunca hace scroll a la
    // sección — Angular no scrollea a anclas por default.
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    { provide: LOCALE_ID, useValue: 'es-AR' }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
