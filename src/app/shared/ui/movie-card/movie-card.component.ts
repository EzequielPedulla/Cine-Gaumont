import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { DuracionPipe } from '../../pipes/duracion.pipe';

@Component({
  selector: 'app-movie-card',
  imports: [DuracionPipe, RouterLink],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.scss'
})
export class MovieCardComponent {
  readonly pelicula = input.required<PeliculaConGeneros>();
  readonly modo = input<'cartelera' | 'proximamente'>('cartelera');
  readonly avisarme = output<void>();
}
