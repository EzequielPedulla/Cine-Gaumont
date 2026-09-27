import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { ResenasService } from '../../../core/services/resenas.service';
import { AuthService } from '../../../core/services/auth.service';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { FuncionConSala } from '../../../core/models/funcion.model';
import { Resena } from '../../../core/models/resena.model';
import { DuracionPipe } from '../../../shared/pipes/duracion.pipe';

interface GrupoPorDia {
  fecha: string;
  etiqueta: string;
  funciones: FuncionConSala[];
}

@Component({
  selector: 'app-seleccion-funcion',
  imports: [DatePipe, DuracionPipe, RouterLink],
  templateUrl: './seleccion-funcion.component.html',
  styleUrl: './seleccion-funcion.component.scss'
})
export class SeleccionFuncionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly resenasService = inject(ResenasService);
  readonly authService = inject(AuthService);

  readonly pelicula = signal<PeliculaConGeneros | null>(null);
  readonly funciones = signal<FuncionConSala[]>([]);
  readonly resenas = signal<Resena[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly enviandoResena = signal(false);
  readonly errorResena = signal<string | null>(null);
  readonly estrellasElegidas = signal(0);
  readonly comentario = signal('');

  readonly promedio = computed(() => {
    const lista = this.resenas();
    if (lista.length === 0) return null;
    return lista.reduce((acc, r) => acc + r.estrellas, 0) / lista.length;
  });

  readonly miResena = computed(() => {
    const usuarioId = this.authService.session()?.user.id;
    if (!usuarioId) return null;
    return this.resenas().find((r) => r.usuario_id === usuarioId) ?? null;
  });

  readonly gruposPorDia = computed<GrupoPorDia[]>(() => {
    const mapa = new Map<string, FuncionConSala[]>();
    for (const funcion of this.funciones()) {
      const fecha = funcion.fecha_hora.slice(0, 10);
      const lista = mapa.get(fecha) ?? [];
      lista.push(funcion);
      mapa.set(fecha, lista);
    }

    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, funciones]) => ({ fecha, etiqueta: this.etiquetaDia(fecha), funciones }));
  });

  constructor() {
    const peliculaId = this.route.snapshot.paramMap.get('peliculaId');
    if (peliculaId) {
      this.cargar(peliculaId);
    }
  }

  irAButacas(funcionId: string): void {
    this.router.navigate(['/funciones', funcionId, 'butacas']);
  }

  elegirEstrellas(cantidad: number): void {
    this.estrellasElegidas.set(cantidad);
  }

  async enviarResena(): Promise<void> {
    const pelicula = this.pelicula();
    const usuarioId = this.authService.session()?.user.id;
    const nombre = this.authService.perfil()?.nombre;
    if (!pelicula || !usuarioId || !nombre || this.estrellasElegidas() === 0) {
      this.errorResena.set('Elegí al menos una estrella antes de enviar.');
      return;
    }

    this.enviandoResena.set(true);
    this.errorResena.set(null);
    try {
      await this.resenasService.guardar(pelicula.id, usuarioId, nombre, this.estrellasElegidas(), this.comentario());
      await this.cargarResenas(pelicula.id);
    } catch (error) {
      this.errorResena.set(error instanceof Error ? error.message : 'No pudimos guardar tu reseña.');
    } finally {
      this.enviandoResena.set(false);
    }
  }

  private async cargar(peliculaId: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [pelicula, funciones] = await Promise.all([
        this.peliculasService.obtenerPorId(peliculaId),
        this.funcionesService.listarPorPelicula(peliculaId)
      ]);
      this.pelicula.set(pelicula);
      this.funciones.set(funciones);
      await this.cargarResenas(peliculaId);
    } catch {
      this.error.set('No pudimos cargar las funciones. Probá de nuevo en un momento.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarResenas(peliculaId: string): Promise<void> {
    const resenas = await this.resenasService.listarPorPelicula(peliculaId);
    this.resenas.set(resenas);

    const propia = this.miResena();
    this.estrellasElegidas.set(propia?.estrellas ?? 0);
    this.comentario.set(propia?.comentario ?? '');
  }

  private etiquetaDia(fechaIso: string): string {
    const hoy = new Date().toISOString().slice(0, 10);
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    if (fechaIso === hoy) return 'Hoy';
    if (fechaIso === manana) return 'Mañana';

    return new Date(`${fechaIso}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }
}
