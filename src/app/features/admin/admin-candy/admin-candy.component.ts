import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService, ProductoCandyFormData } from '../../../core/services/candy.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
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

  readonly categorias = signal<CategoriaCandy[]>([]);
  readonly productos = signal<ProductoCandyConCategoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly nombreCategoria = signal('');

  readonly mostrarFormulario = signal(false);
  readonly productoEditando = signal<ProductoCandyConCategoria | null>(null);

  readonly form = this.fb.nonNullable.group({
    categoria_id: ['' as string | null, Validators.required],
    nombre: ['', Validators.required],
    precio: [500, [Validators.required, Validators.min(0)]],
    imagen_url: [''],
    activo: [true]
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
    this.form.reset({ categoria_id: this.categorias()[0]?.id ?? '', nombre: '', precio: 500, imagen_url: '', activo: true });
    this.mostrarFormulario.set(true);
  }

  editarProducto(producto: ProductoCandyConCategoria): void {
    this.productoEditando.set(producto);
    this.form.reset({
      categoria_id: producto.categoria_id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen_url: producto.imagen_url ?? '',
      activo: producto.activo
    });
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
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
      if (editando) {
        await this.candyService.actualizar(editando.id, datos);
      } else {
        await this.candyService.crear(datos);
      }
      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar el producto.');
    } finally {
      this.guardando.set(false);
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
