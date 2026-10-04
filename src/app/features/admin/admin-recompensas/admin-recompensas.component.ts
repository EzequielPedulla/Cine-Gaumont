import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecompensasService, RecompensaFormData } from '../../../core/services/recompensas.service';
import { Recompensa } from '../../../core/models/recompensa.model';

@Component({
  selector: 'app-admin-recompensas',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-recompensas.component.html',
  styleUrl: './admin-recompensas.component.scss'
})
export class AdminRecompensasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recompensasService = inject(RecompensasService);

  // Hay UNA sola recompensa de tipo "entrada" (config global, requerimientos:
  // "entrada = 500 pts"): al canjear cubre una butaca común, se llame como
  // se llame, así que no tiene sentido tener varias. La base también lo
  // fuerza (migración 031). Las de candy se cargan en cada producto desde
  // Admin > Candy. Si hay que dejar de ofrecerla se desactiva (no se borra)
  // para no romper el historial de canjes.
  readonly recompensa = signal<Recompensa | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarFormulario = signal(false);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    puntos_requeridos: [500, [Validators.required, Validators.min(1)]],
    activo: [true]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const todas = await this.recompensasService.listarTodas();
      this.recompensa.set(todas.find((r) => r.tipo === 'entrada') ?? null);
    } catch {
      this.error.set('No pudimos cargar las recompensas.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Solo se ofrece cuando todavía no existe la recompensa de entrada.
  configurar(): void {
    this.form.reset({ nombre: 'Entrada gratis', puntos_requeridos: 500, activo: true });
    this.mostrarFormulario.set(true);
  }

  editar(recompensa: Recompensa): void {
    this.form.reset({
      nombre: recompensa.nombre,
      puntos_requeridos: recompensa.puntos_requeridos,
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

    const datos: RecompensaFormData = { ...this.form.getRawValue(), tipo: 'entrada' };

    this.guardando.set(true);
    this.error.set(null);
    try {
      const editando = this.recompensa();
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
}
