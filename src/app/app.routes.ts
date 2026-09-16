import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/peliculas/peliculas-list/peliculas-list.component').then((m) => m.PeliculasListComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/registro',
    loadComponent: () => import('./features/auth/registro/registro.component').then((m) => m.RegistroComponent)
  },
  {
    path: 'peliculas/:peliculaId/funciones',
    loadComponent: () =>
      import('./features/funciones/seleccion-funcion/seleccion-funcion.component').then((m) => m.SeleccionFuncionComponent)
  },
  {
    path: 'funciones/:funcionId/butacas',
    loadComponent: () => import('./features/funciones/butacas/butacas.component').then((m) => m.ButacasComponent)
  },
  { path: '**', redirectTo: '' }
];
