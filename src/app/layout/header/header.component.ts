import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LogoComponent } from '../../shared/ui/logo/logo.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Navegar a "/" después de cerrar sesión evita quedar parado en una
  // pantalla que ya no debería verse (admin, perfil) esperando a que algo
  // más te saque de ahí.
  async cerrarSesion(): Promise<void> {
    await this.authService.cerrarSesion();
    this.router.navigateByUrl('/');
  }
}
