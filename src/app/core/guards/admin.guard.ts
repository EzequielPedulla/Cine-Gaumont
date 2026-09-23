import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Espera a que se resuelva la sesión inicial (importante en un F5 directo
// sobre /admin, donde al arrancar el guard todavía no sabemos si hay
// usuario logueado) y recién ahí decide si deja pasar o redirige al home.
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.cargandoSesion).pipe(
    filter((cargando) => !cargando),
    take(1),
    map(() => (authService.esAdmin() ? true : router.createUrlTree(['/'])))
  );
};
