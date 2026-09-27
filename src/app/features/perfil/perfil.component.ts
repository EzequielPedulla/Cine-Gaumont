import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent {
  private readonly authService = inject(AuthService);

  readonly perfil = this.authService.perfil;
  readonly email = computed(() => this.authService.session()?.user.email ?? '');
}
