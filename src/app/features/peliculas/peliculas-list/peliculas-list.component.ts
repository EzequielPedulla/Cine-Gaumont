import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { AlertasService } from '../../../core/services/alertas.service';
import { AuthService } from '../../../core/services/auth.service';
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
  private readonly funcionesService = inject(FuncionesService);
  private readonly alertasService = inject(AlertasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Signal en vez de snapshot: el link "Próximamente" del header apunta a
  // esta misma ruta ("/") solo con otro fragment — Angular reutiliza el
  // componente en vez de recrearlo, así que el constructor no vuelve a
  // correr en cada click. Con esto sí reaccionamos cada vez que cambia.
  private readonly fragmentActual = toSignal(this.route.fragment);

  private readonly sesionResuelta$ = toObservable(this.authService.cargandoSesion).pipe(
    filter((cargando) => !cargando),
    take(1)
  );

  private readonly hoy = new Date().toISOString().slice(0, 10);

  readonly peliculas = signal<PeliculaConGeneros[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly busqueda = signal('');
  readonly generosSeleccionados = signal<ReadonlySet<string>>(new Set());
  readonly alertasActivas = signal<ReadonlySet<string>>(new Set());
  readonly preciosPreventa = signal<ReadonlyMap<string, number>>(new Map());

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
    this.cargarAlertas();

    // Scroll manual al fragment: además de habilitar anchorScrolling en el
    // router (app.config.ts), esto cubre el caso en que las películas
    // todavía se están cargando cuando se navega con el fragment — sin
    // esto, el scroll del router puede disparar antes de que exista el
    // elemento #proximamente en el DOM.
    effect(() => {
      const fragment = this.fragmentActual();
      if (!fragment || this.cargando()) return;
      setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' }));
    });
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const peliculas = await this.peliculasService.listarActivas();
      this.peliculas.set(peliculas);

      // Solo tiene sentido buscar precio de preventa para las que todavía
      // no estrenaron — evita una consulta innecesaria para la cartelera.
      const idsProximamente = peliculas.filter((p) => p.fecha_estreno && p.fecha_estreno > this.hoy).map((p) => p.id);
      this.preciosPreventa.set(await this.funcionesService.listarPreciosPreventaPorPelicula(idsProximamente));
    } catch {
      this.error.set('No pudimos cargar la cartelera. Probá de nuevo en un momento.');
    } finally {
      this.cargando.set(false);
    }
  }

  // "Avisarme" (mail 08/03): guarda la intención en alertas_estreno — no
  // hay envío real de notificación (necesitaría un servicio de mail/push
  // aparte), pero el usuario ve confirmado que quedó anotado.
  async toggleAvisarme(peliculaId: string): Promise<void> {
    const usuarioId = this.authService.session()?.user.id;
    if (!usuarioId) {
      this.router.navigateByUrl('/auth/login');
      return;
    }

    const activas = new Set(this.alertasActivas());
    try {
      if (activas.has(peliculaId)) {
        await this.alertasService.desactivar(peliculaId, usuarioId);
        activas.delete(peliculaId);
      } else {
        await this.alertasService.activar(peliculaId, usuarioId);
        activas.add(peliculaId);
      }
      this.alertasActivas.set(activas);
    } catch {
      // Si falla, dejamos el estado como estaba — no hace falta un aviso de
      // error para algo tan chico, el botón simplemente no cambia.
    }
  }

  private async cargarAlertas(): Promise<void> {
    await firstValueFrom(this.sesionResuelta$);
    const usuarioId = this.authService.session()?.user.id;
    if (!usuarioId) return;

    const ids = await this.alertasService.listarPeliculaIds(usuarioId);
    this.alertasActivas.set(new Set(ids));
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
