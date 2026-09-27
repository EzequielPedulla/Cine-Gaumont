import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { RecompensasService } from '../../core/services/recompensas.service';
import { Canje } from '../../core/models/recompensa.model';

@Component({
  selector: 'app-perfil',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent {
  private readonly authService = inject(AuthService);
  private readonly recompensasService = inject(RecompensasService);

  readonly perfil = this.authService.perfil;
  readonly email = computed(() => this.authService.session()?.user.email ?? '');

  // El canje en sí se hace desde la compra de entradas (butacas.component),
  // no desde acá — así tiene un destino inmediato (bajar el total de ESA
  // compra) en vez de acumular crédito suelto sin motivo. Acá solo se
  // muestra el historial, que es lo que pide la consigna (mail 03/03).
  readonly historial = signal<Canje[]>([]);

  constructor() {
    this.cargarHistorial();
  }

  private async cargarHistorial(): Promise<void> {
    const usuarioId = this.authService.session()?.user.id;
    if (!usuarioId) return;
    this.historial.set(await this.recompensasService.listarHistorialPropio(usuarioId));
  }
}
