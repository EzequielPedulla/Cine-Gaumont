import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecompensasService, RecompensaFormData } from '../../../core/services/recompensas.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Recompensa, TipoRecompensa } from '../../../core/models/recompensa.model';

@Component({
  selector: 'app-admin-recompensas',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './admin-recompensas.component.html',
  styleUrl: './admin-recompensas.component.scss'
})
export class AdminRecompensasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recompensasService = inject(RecompensasService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly recompensas = signal<Recompensa[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarFormulario = signal(false);
  readonly recompensaEditando = signal<Recompensa | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: ['entrada' as TipoRecompensa, Validators.required],
    puntos_requeridos: [500, [Validators.required, Validators.min(1)]],
    valor: [0, [Validators.required, Validators.min(0)]],
    activo: [true]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.recompensas.set(await this.recompensasService.listarTodas());
    } catch {
      this.error.set('No pudimos cargar las recompensas.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevaRecompensa(): void {
    this.recompensaEditando.set(null);
    this.form.reset({ nombre: '', tipo: 'entrada', puntos_requeridos: 500, valor: 0, activo: true });
    this.mostrarFormulario.set(true);
  }

  editar(recompensa: Recompensa): void {
    this.recompensaEditando.set(recompensa);
    this.form.reset({
      nombre: recompensa.nombre,
      tipo: recompensa.tipo,
      puntos_requeridos: recompensa.puntos_requeridos,
      valor: recompensa.valor,
      activo: recompensa.activo
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

    const datos: RecompensaFormData = this.form.getRawValue();

    this.guardando.set(true);
    this.error.set(null);
    try {
      const editando = this.recompensaEditando();
      if (editando) {
        await this.recompensasService.actualizar(editando.id, datos);
      } else {
        await this.recompensasService.crear(datos);
      }
      this.mostrarFormulario.set(false);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar la recompensa.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(recompensa: Recompensa): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar "${recompensa.nombre}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.recompensasService.eliminar(recompensa.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar la recompensa.');
    }
  }
}
