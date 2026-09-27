import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ValidacionService } from '../../../core/services/validacion.service';
import { ResultadoValidacion } from '../../../core/models/validacion.model';

@Component({
  selector: 'app-validar-entrada',
  imports: [DatePipe],
  templateUrl: './validar-entrada.component.html',
  styleUrl: './validar-entrada.component.scss'
})
export class ValidarEntradaComponent {
  private readonly validacionService = inject(ValidacionService);

  readonly codigo = signal('');
  readonly validando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultado = signal<ResultadoValidacion | null>(null);

  async validar(): Promise<void> {
    const codigo = this.codigo().trim();
    if (!codigo) return;

    this.validando.set(true);
    this.error.set(null);
    this.resultado.set(null);
    try {
      this.resultado.set(await this.validacionService.validarEntrada(codigo));
      this.codigo.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos validar esa entrada.');
    } finally {
      this.validando.set(false);
    }
  }

  // Al tipear el siguiente código, limpiamos el resultado anterior para no
  // dejar en pantalla "Entrada válida" mientras ya se está cargando otra.
  onEscribir(valor: string): void {
    this.codigo.set(valor);
    this.resultado.set(null);
    this.error.set(null);
  }
}
