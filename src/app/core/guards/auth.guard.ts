import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Mismo patrón que adminGuard: espera a que se resuelva la sesión inicial
// antes de decidir, para no rebotar a un usuario logueado que entró
// directo a /perfil con F5.
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.cargandoSesion).pipe(
    filter((cargando) => !cargando),
    take(1),
    map(() => (authService.estaLogueado() ? true : router.createUrlTree(['/auth/login'])))
  );
};
