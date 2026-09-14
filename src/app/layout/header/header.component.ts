import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  // TODO(auth): cuando exista AuthService, reemplazar los botones de
  // login/registro por el estado real del usuario (nombre + puntos).
}
