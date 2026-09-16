import { Component } from '@angular/core';
import { LogoComponent } from '../../shared/ui/logo/logo.component';

@Component({
  selector: 'app-footer',
  imports: [LogoComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly anioActual = new Date().getFullYear();
}
