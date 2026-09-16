import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { FuncionConSala } from '../../../core/models/funcion.model';
import { DuracionPipe } from '../../../shared/pipes/duracion.pipe';

interface GrupoPorDia {
  fecha: string;
  etiqueta: string;
  funciones: FuncionConSala[];
}

@Component({
  selector: 'app-seleccion-funcion',
  imports: [DatePipe, DuracionPipe],
  templateUrl: './seleccion-funcion.component.html',
  styleUrl: './seleccion-funcion.component.scss'
})
export class SeleccionFuncionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly peliculasService = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);

  readonly pelicula = signal<PeliculaConGeneros | null>(null);
  readonly funciones = signal<FuncionConSala[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

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
    } catch {
      this.error.set('No pudimos cargar las funciones. Probá de nuevo en un momento.');
    } finally {
      this.cargando.set(false);
    }
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
