import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService, ProductoCandyFormData } from '../../../core/services/candy.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { AlmacenamientoService } from '../../../core/services/almacenamiento.service';
import { RecompensasService, RecompensaFormData } from '../../../core/services/recompensas.service';
import { CategoriaCandy, ProductoCandyConCategoria } from '../../../core/models/candy.model';

@Component({
  selector: 'app-admin-candy',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './admin-candy.component.html',
  styleUrl: './admin-candy.component.scss'
})
export class AdminCandyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly candyService = inject(CandyService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly almacenamientoService = inject(AlmacenamientoService);
  private readonly recompensasService = inject(RecompensasService);

  readonly categorias = signal<CategoriaCandy[]>([]);
  readonly productos = signal<ProductoCandyConCategoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly subiendoImagen = signal(false);

  readonly nombreCategoria = signal('');

  readonly mostrarFormulario = signal(false);
  readonly productoEditando = signal<ProductoCandyConCategoria | null>(null);

  readonly form = this.fb.nonNullable.group({
    categoria_id: ['' as string | null, Validators.required],
    nombre: ['', Validators.required],
    precio: [500, [Validators.required, Validators.min(0)]],
    imagen_url: [''],
    activo: [true],
    puntosCanje: [null as number | null, Validators.min(1)]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [categorias, productos] = await Promise.all([this.candyService.listarCategorias(), this.candyService.listarProductosTodos()]);
      this.categorias.set(categorias);
      this.productos.set(productos);
    } catch {
      this.error.set('No pudimos cargar el candy bar.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crearCategoria(): Promise<void> {
    const nombre = this.nombreCategoria().trim();
    if (!nombre) return;

    this.error.set(null);
    try {
      await this.candyService.crearCategoria(nombre);
      this.nombreCategoria.set('');
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos crear la categoría.');
    }
  }

  async eliminarCategoria(categoria: CategoriaCandy): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar la categoría "${categoria.nombre}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.candyService.eliminarCategoria(categoria.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar la categoría.');
    }
  }

  nuevoProducto(): void {
    this.productoEditando.set(null);
    this.form.reset({ categoria_id: this.categorias()[0]?.id ?? '', nombre: '', precio: 500, imagen_url: '', activo: true, puntosCanje: null });
    this.mostrarFormulario.set(true);
  }

  async editarProducto(producto: ProductoCandyConCategoria): Promise<void> {
    this.productoEditando.set(producto);
    this.form.reset({
      categoria_id: producto.categoria_id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen_url: producto.imagen_url ?? '',
      activo: producto.activo,
      puntosCanje: null
    });
    this.mostrarFormulario.set(true);

    // La recompensa (si existe) vive en otra tabla, vinculada por
    // producto_id — se busca aparte para no tener que tocar candy.service.
    const recompensa = await this.recompensasService.buscarPorProducto(producto.id);
    this.form.patchValue({ puntosCanje: recompensa?.puntos_requeridos ?? null });
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
  }

  async onArchivoSeleccionado(event: Event): Promise<void> {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    this.subiendoImagen.set(true);
    this.error.set(null);
    try {
      const url = await this.almacenamientoService.subirImagen(archivo, 'candy');
      this.form.patchValue({ imagen_url: url });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos subir la imagen.');
    } finally {
      this.subiendoImagen.set(false);
    }
  }

  async guardarProducto(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const datos: ProductoCandyFormData = {
      categoria_id: valores.categoria_id || null,
      nombre: valores.nombre,
      precio: valores.precio,
      imagen_url: valores.imagen_url || null,
      activo: valores.activo
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      const editando = this.productoEditando();
      let productoId: string;
      if (editando) {
        await this.candyService.actualizar(editando.id, datos);
        productoId = editando.id;
      } else {
        productoId = (await this.candyService.crear(datos)).id;
      }

      await this.sincronizarRecompensa(productoId, datos.nombre, datos.activo, valores.puntosCanje);

      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }

  // Mail 03/03: "el admin configura cuántos puntos cuesta cada recompensa
  // (ej. pochoclo grande = 150 pts)" — en vez de una pantalla aparte y
  // desconectada, esto se configura acá mismo, sobre el producto real. Al
  // canjear, el producto se agrega gratis a precio $0 (butacas.component) —
  // no hace falta guardar ningún "valor en crédito" a mano.
  private async sincronizarRecompensa(productoId: string, nombre: string, activo: boolean, puntosCanje: number | null): Promise<void> {
    const existente = await this.recompensasService.buscarPorProducto(productoId);

    if (!puntosCanje) {
      if (!existente) return;
      try {
        await this.recompensasService.eliminar(existente.id);
      } catch {
        throw new Error('El producto se guardó, pero no pudimos sacar el canje: ya lo usó algún cliente. Si querés, subile mucho los puntos requeridos en vez de sacarlo.');
      }
      return;
    }

    const datosRecompensa: RecompensaFormData = {
      nombre,
      tipo: 'producto_candy',
      producto_id: productoId,
      puntos_requeridos: puntosCanje,
      activo
    };

    if (existente) {
      await this.recompensasService.actualizar(existente.id, datosRecompensa);
    } else {
      await this.recompensasService.crear(datosRecompensa);
    }
  }

  async eliminarProducto(producto: ProductoCandyConCategoria): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar "${producto.nombre}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.candyService.eliminar(producto.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar el producto.');
    }
  }
}
