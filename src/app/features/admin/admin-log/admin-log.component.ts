import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LogActividadService } from '../../../core/services/log-actividad.service';
import { LogActividad } from '../../../core/models/log-actividad.model';

const ETIQUETAS_ACCION: Record<string, string> = {
  crear_funcion: 'Creó una función',
  eliminar_funcion: 'Eliminó una función',
  validar_qr: 'Validó una entrada'
};

@Component({
  selector: 'app-admin-log',
  imports: [DatePipe],
  templateUrl: './admin-log.component.html',
  styleUrl: './admin-log.component.scss'
})
export class AdminLogComponent {
  private readonly logService = inject(LogActividadService);

  readonly registros = signal<LogActividad[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.registros.set(await this.logService.listarRecientes());
    } catch {
      this.error.set('No pudimos cargar el log de actividad.');
    } finally {
      this.cargando.set(false);
    }
  }

  etiqueta(registro: LogActividad): string {
    return ETIQUETAS_ACCION[registro.accion] ?? registro.accion;
  }

  autor(registro: LogActividad): string {
    if (!registro.usuario) return 'Usuario eliminado';
    return `${registro.usuario.nombre} ${registro.usuario.apellido}`;
  }
}
