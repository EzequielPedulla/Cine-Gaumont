import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CombosService, ComboFormData } from '../../../core/services/combos.service';
import { CandyService } from '../../../core/services/candy.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ComboConItems } from '../../../core/models/combo.model';
import { ProductoCandy } from '../../../core/models/candy.model';

@Component({
  selector: 'app-admin-combos',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './admin-combos.component.html',
  styleUrl: './admin-combos.component.scss'
})
export class AdminCombosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly combosService = inject(CombosService);
  private readonly candyService = inject(CandyService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly combos = signal<ComboConItems[]>([]);
  readonly productos = signal<ProductoCandy[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarFormulario = signal(false);
  readonly comboEditando = signal<ComboConItems | null>(null);
  readonly cantidadesPorProducto = signal<ReadonlyMap<string, number>>(new Map());

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    precio_fijo: [0, [Validators.required, Validators.min(0)]],
    activo: [true]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [combos, productos] = await Promise.all([this.combosService.listarTodos(), this.candyService.listarProductosActivos()]);
      this.combos.set(combos);
      this.productos.set(productos);
    } catch {
      this.error.set('No pudimos cargar los combos.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevoCombo(): void {
    this.comboEditando.set(null);
    this.form.reset({ nombre: '', precio_fijo: 0, activo: true });
    this.cantidadesPorProducto.set(new Map());
    this.mostrarFormulario.set(true);
  }

  editar(combo: ComboConItems): void {
    this.comboEditando.set(combo);
    this.form.reset({ nombre: combo.nombre, precio_fijo: combo.precio_fijo, activo: combo.activo });
    this.cantidadesPorProducto.set(new Map(combo.items.map((item) => [item.producto_id, item.cantidad])));
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
  }

  toggleProducto(productoId: string): void {
    const actuales = new Map(this.cantidadesPorProducto());
    if (actuales.has(productoId)) {
      actuales.delete(productoId);
    } else {
      actuales.set(productoId, 1);
    }
    this.cantidadesPorProducto.set(actuales);
  }

  cambiarCantidad(productoId: string, delta: number): void {
    const actuales = new Map(this.cantidadesPorProducto());
    const actual = actuales.get(productoId);
    if (actual === undefined) return;
    actuales.set(productoId, Math.max(1, actual + delta));
    this.cantidadesPorProducto.set(actuales);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.cantidadesPorProducto().size === 0) {
      this.error.set('El combo necesita al menos un producto de candy.');
      return;
    }

    const datos: ComboFormData = this.form.getRawValue();
    const items = [...this.cantidadesPorProducto()].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));

    this.guardando.set(true);
    this.error.set(null);
    try {
      const editando = this.comboEditando();
      const comboId = editando ? editando.id : (await this.combosService.crear(datos)).id;
      if (editando) await this.combosService.actualizar(editando.id, datos);

      await this.combosService.reemplazarItems(comboId, items);

      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar el combo.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(combo: ComboConItems): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar el combo "${combo.nombre}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.combosService.eliminar(combo.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar el combo.');
    }
  }
}
