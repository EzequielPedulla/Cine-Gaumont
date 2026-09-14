import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/peliculas/peliculas-list/peliculas-list.component').then((m) => m.PeliculasListComponent)
  },
  { path: '**', redirectTo: '' }
];
