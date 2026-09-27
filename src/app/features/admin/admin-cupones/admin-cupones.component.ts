import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CuponesService, CuponFormData } from '../../../core/services/cupones.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CondicionCupon, Cupon } from '../../../core/models/cupon.model';

@Component({
  selector: 'app-admin-cupones',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-cupones.component.html',
  styleUrl: './admin-cupones.component.scss'
})
export class AdminCuponesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cuponesService = inject(CuponesService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly cupones = signal<Cupon[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarFormulario = signal(false);
  readonly cuponEditando = signal<Cupon | null>(null);

  readonly form = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    porcentaje: [20, [Validators.required, Validators.min(1), Validators.max(100)]],
    condicion: ['primera_compra' as CondicionCupon, Validators.required],
    activo: [true]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.cupones.set(await this.cuponesService.listarTodos());
    } catch {
      this.error.set('No pudimos cargar los cupones.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevoCupon(): void {
    this.cuponEditando.set(null);
    this.form.reset({ codigo: '', porcentaje: 20, condicion: 'primera_compra', activo: true });
    this.mostrarFormulario.set(true);
  }

  editar(cupon: Cupon): void {
    this.cuponEditando.set(cupon);
    this.form.reset({
      codigo: cupon.codigo,
      porcentaje: cupon.porcentaje,
      condicion: cupon.condicion,
      activo: cupon.activo
    });
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const datos: CuponFormData = this.form.getRawValue();

    this.guardando.set(true);
    this.error.set(null);
    try {
      const editando = this.cuponEditando();
      if (editando) {
        await this.cuponesService.actualizar(editando.id, datos);
      } else {
        await this.cuponesService.crear(datos);
      }
      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar el cupón.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(cupon: Cupon): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar el cupón "${cupon.codigo}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.cuponesService.eliminar(cupon.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar el cupón.');
    }
  }
}
