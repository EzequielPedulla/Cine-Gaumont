import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
