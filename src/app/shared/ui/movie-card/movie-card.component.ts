import { Component, computed, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { DuracionPipe } from '../../pipes/duracion.pipe';

@Component({
  selector: 'app-movie-card',
  imports: [DuracionPipe, CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.scss'
})
export class MovieCardComponent {
  readonly pelicula = input.required<PeliculaConGeneros>();
  readonly modo = input<'cartelera' | 'proximamente'>('cartelera');
  readonly avisado = input(false);
  readonly precioPreventa = input<number | null>(null);
  readonly avisarme = output<void>();

  // Misma cuenta que ButacasComponent (estreno - 7 días) — se calcula acá
  // en vez de traerla del backend porque ya tenemos fecha_estreno en la
  // propia película.
  readonly fechaAperturaPreventa = computed(() => {
    const fechaEstreno = this.pelicula().fecha_estreno;
    if (!fechaEstreno) return null;
    const apertura = new Date(`${fechaEstreno}T00:00:00`);
    apertura.setDate(apertura.getDate() - 7);
    return apertura;
  });

  readonly ventaPreventaAbierta = computed(() => {
    const apertura = this.fechaAperturaPreventa();
    return apertura !== null && new Date() >= apertura;
  });

  // Una película "próximamente" con la preventa ya abierta se puede
  // comprar igual que una de cartelera — sin esto, el link quedaba
  // hardcodeado en null para cualquier "próximamente", incluso cuando el
  // propio badge de arriba decía "ya podés comprarla".
  readonly puedeVerFunciones = computed(() => this.modo() === 'cartelera' || this.ventaPreventaAbierta());
}
