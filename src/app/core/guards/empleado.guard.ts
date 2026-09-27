import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Mismo patrón que adminGuard/authGuard: espera a que se resuelva la
// sesión antes de decidir. esEmpleado() ya incluye a los admins.
export const empleadoGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.cargandoSesion).pipe(
    filter((cargando) => !cargando),
    take(1),
    map(() => (authService.esEmpleado() ? true : router.createUrlTree(['/'])))
  );
};
