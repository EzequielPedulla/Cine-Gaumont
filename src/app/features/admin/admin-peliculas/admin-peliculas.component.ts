import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService, PeliculaFormData } from '../../../core/services/peliculas.service';
import { GenerosService } from '../../../core/services/generos.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Genero, PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { DuracionPipe } from '../../../shared/pipes/duracion.pipe';

@Component({
  selector: 'app-admin-peliculas',
  imports: [ReactiveFormsModule, DuracionPipe],
  templateUrl: './admin-peliculas.component.html',
  styleUrl: './admin-peliculas.component.scss'
})
export class AdminPeliculasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly peliculasService = inject(PeliculasService);
  private readonly generosService = inject(GenerosService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly peliculas = signal<PeliculaConGeneros[]>([]);
  readonly generosDisponibles = signal<Genero[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarFormulario = signal(false);
  readonly peliculaEditando = signal<PeliculaConGeneros | null>(null);
  readonly generosSeleccionados = signal<ReadonlySet<string>>(new Set());

  readonly form = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    sinopsis: ['', Validators.required],
    duracion_min: [90, [Validators.required, Validators.min(1)]],
    imagen_url: [''],
    clasificacion_edad: [''],
    fecha_estreno: [''],
    activa: [true]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [peliculas, generos] = await Promise.all([this.peliculasService.listarTodas(), this.generosService.listarTodos()]);
      this.peliculas.set(peliculas);
      this.generosDisponibles.set(generos);
    } catch {
      this.error.set('No pudimos cargar las películas.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevaPelicula(): void {
    this.peliculaEditando.set(null);
    this.generosSeleccionados.set(new Set());
    this.form.reset({ titulo: '', sinopsis: '', duracion_min: 90, imagen_url: '', clasificacion_edad: '', fecha_estreno: '', activa: true });
    this.mostrarFormulario.set(true);
  }

  editar(pelicula: PeliculaConGeneros): void {
    this.peliculaEditando.set(pelicula);
    this.generosSeleccionados.set(new Set(pelicula.generos.map((g) => g.id)));
    this.form.reset({
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis,
      duracion_min: pelicula.duracion_min,
      imagen_url: pelicula.imagen_url ?? '',
      clasificacion_edad: pelicula.clasificacion_edad ? String(pelicula.clasificacion_edad) : '',
      fecha_estreno: pelicula.fecha_estreno ?? '',
      activa: pelicula.activa
    });
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
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

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const datos: PeliculaFormData = {
      titulo: valores.titulo,
      sinopsis: valores.sinopsis,
      duracion_min: valores.duracion_min,
      imagen_url: valores.imagen_url || null,
      clasificacion_edad: valores.clasificacion_edad ? (Number(valores.clasificacion_edad) as 13 | 18) : null,
      fecha_estreno: valores.fecha_estreno || null,
      activa: valores.activa,
      generoIds: [...this.generosSeleccionados()]
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      const editando = this.peliculaEditando();
      if (editando) {
        await this.peliculasService.actualizar(editando.id, datos);
      } else {
        await this.peliculasService.crear(datos);
      }
      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar la película.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(pelicula: PeliculaConGeneros): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar "${pelicula.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.peliculasService.eliminar(pelicula.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar la película.');
    }
  }
}
