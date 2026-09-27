import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { empleadoGuard } from './core/guards/empleado.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/peliculas/peliculas-list/peliculas-list.component').then((m) => m.PeliculasListComponent)
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil.component').then((m) => m.PerfilComponent)
  },
  {
    path: 'mis-compras',
    canActivate: [authGuard],
    loadComponent: () => import('./features/mis-compras/mis-compras.component').then((m) => m.MisComprasComponent)
  },
  {
    path: 'empleado/validar',
    canActivate: [empleadoGuard],
    loadComponent: () => import('./features/empleado/validar-entrada/validar-entrada.component').then((m) => m.ValidarEntradaComponent)
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
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
      {
        path: 'peliculas',
        loadComponent: () => import('./features/admin/admin-peliculas/admin-peliculas.component').then((m) => m.AdminPeliculasComponent)
      },
      {
        path: 'salas',
        loadComponent: () => import('./features/admin/admin-salas/admin-salas.component').then((m) => m.AdminSalasComponent)
      },
      {
        path: 'funciones',
        loadComponent: () => import('./features/admin/admin-funciones/admin-funciones.component').then((m) => m.AdminFuncionesComponent)
      },
      {
        path: 'reportes',
        loadComponent: () => import('./features/admin/admin-reportes/admin-reportes.component').then((m) => m.AdminReportesComponent)
      },
      {
        path: 'cupones',
        loadComponent: () => import('./features/admin/admin-cupones/admin-cupones.component').then((m) => m.AdminCuponesComponent)
      },
      {
        path: 'log',
        loadComponent: () => import('./features/admin/admin-log/admin-log.component').then((m) => m.AdminLogComponent)
      },
      {
        path: 'recompensas',
        loadComponent: () => import('./features/admin/admin-recompensas/admin-recompensas.component').then((m) => m.AdminRecompensasComponent)
      },
      {
        path: 'candy',
        loadComponent: () => import('./features/admin/admin-candy/admin-candy.component').then((m) => m.AdminCandyComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
