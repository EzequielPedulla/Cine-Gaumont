import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SalasService } from '../../../core/services/salas.service';
import { Sala } from '../../../core/models/funcion.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-admin-salas',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-salas.component.html',
  styleUrl: './admin-salas.component.scss'
})
export class AdminSalasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly salasService = inject(SalasService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly salas = signal<Sala[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.salas.set(await this.salasService.listarTodas());
    } catch {
      this.error.set('No pudimos cargar las salas.');
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.salasService.crear(this.form.getRawValue().nombre);
      this.form.reset({ nombre: '' });
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos crear la sala.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(sala: Sala): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar "${sala.nombre}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.salasService.eliminar(sala.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar la sala.');
    }
  }
}
