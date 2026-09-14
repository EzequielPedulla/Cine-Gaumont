import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { Genero, PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { MovieCardComponent } from '../../../shared/ui/movie-card/movie-card.component';

@Component({
  selector: 'app-peliculas-list',
  imports: [FormsModule, MovieCardComponent],
  templateUrl: './peliculas-list.component.html',
  styleUrl: './peliculas-list.component.scss'
})
export class PeliculasListComponent {
  private readonly peliculasService = inject(PeliculasService);

  private readonly hoy = new Date().toISOString().slice(0, 10);

  readonly peliculas = signal<PeliculaConGeneros[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly busqueda = signal('');
  readonly generosSeleccionados = signal<ReadonlySet<string>>(new Set());

  readonly generosDisponibles = computed<Genero[]>(() => {
    const mapa = new Map<string, Genero>();
    for (const pelicula of this.peliculas()) {
      for (const genero of pelicula.generos) {
        mapa.set(genero.id, genero);
      }
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  private readonly enCartelera = computed(() => this.peliculas().filter((p) => !p.fecha_estreno || p.fecha_estreno <= this.hoy));

  readonly proximamente = computed(() => this.peliculas().filter((p) => p.fecha_estreno && p.fecha_estreno > this.hoy));

  readonly carteleraFiltrada = computed(() => this.enCartelera().filter((p) => this.coincideConFiltros(p)));

  constructor() {
    this.cargarPeliculas();
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const peliculas = await this.peliculasService.listarActivas();
      this.peliculas.set(peliculas);
    } catch {
      this.error.set('No pudimos cargar la cartelera. Probá de nuevo en un momento.');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleGenero(id: string): void {
    const actuales = new Set(this.generosSeleccionados());
    if (actuales.has(id)) {
      actuales.delete(id);
    } else {
      actuales.add(id);
    }
    this.generosSeleccionados.set(actuales);
  }

  private coincideConFiltros(pelicula: PeliculaConGeneros): boolean {
    const termino = this.busqueda().trim().toLowerCase();
    const coincideTexto = !termino || pelicula.titulo.toLowerCase().includes(termino);

    const seleccionados = this.generosSeleccionados();
    const coincideGenero = seleccionados.size === 0 || pelicula.generos.some((g) => seleccionados.has(g.id));

    return coincideTexto && coincideGenero;
  }
}
