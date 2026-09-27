import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss'
})
export class AdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // adminGuard (app.routes.ts) solo se evalúa al navegar hacia /admin — si
    // alguien deja de ser admin estando ya adentro (cerró sesión, la sesión
    // expiró), nada vuelve a correr ese chequeo. Este effect() reacciona en
    // el momento exacto en que esAdmin() pasa a false y saca a la persona,
    // en vez de dejar el panel visible con una sesión que ya no es válida.
    effect(() => {
      if (!this.authService.cargandoSesion() && !this.authService.esAdmin()) {
        this.router.navigateByUrl('/');
      }
    });
  }
}
