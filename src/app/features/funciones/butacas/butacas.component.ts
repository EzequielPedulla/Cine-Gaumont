import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as QRCode from 'qrcode';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ButacaSeleccionada, ButacasService } from '../../../core/services/butacas.service';
import { AuthService } from '../../../core/services/auth.service';
import { FuncionConSala } from '../../../core/models/funcion.model';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { ReservaButaca } from '../../../core/models/compra.model';
import { Butaca, generarLayoutSala } from '../../../core/sala-layout';

export interface ButacaComprada extends ButacaSeleccionada {
  esVip: boolean;
}

export interface Comprobante {
  compraId: string;
  qrCode: string;
  qrImagenUrl: string;
  butacas: ButacaComprada[];
  total: number;
}

function claveButaca(fila: string, columna: number): string {
  return `${fila}-${columna}`;
}

function esVip(fila: string): boolean {
  return fila >= 'R';
}

@Component({
  selector: 'app-butacas',
  imports: [DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './butacas.component.html',
  styleUrl: './butacas.component.scss'
})
export class ButacasComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly butacasService = inject(ButacasService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly layout = generarLayoutSala();

  readonly funcion = signal<FuncionConSala | null>(null);
  readonly pelicula = signal<PeliculaConGeneros | null>(null);
  readonly ocupadas = signal<ReadonlyMap<string, ReservaButaca>>(new Map());
  readonly seleccionadas = signal<ReadonlySet<string>>(new Set());

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comprando = signal(false);
  readonly avisoSeleccion = signal<string | null>(null);
  readonly compraConfirmada = signal<Comprobante | null>(null);

  readonly edadUsuario = computed<number | null>(() => {
    const fechaNacimiento = this.authService.perfil()?.fecha_nacimiento;
    if (!fechaNacimiento) return null;

    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const noCumplioAunEsteAnio =
      hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    if (noCumplioAunEsteAnio) edad--;
    return edad;
  });

  readonly requiereLogin = computed(() => !!this.pelicula()?.clasificacion_edad && !this.authService.estaLogueado());

  readonly bloqueadoPorEdad = computed(() => {
    const restriccion = this.pelicula()?.clasificacion_edad;
    const edad = this.edadUsuario();
    return !!restriccion && edad !== null && edad < restriccion;
  });

  readonly puedeComprar = computed(() => !this.requiereLogin() && !this.bloqueadoPorEdad());

  readonly totalSeleccion = computed(() => {
    const funcion = this.funcion();
    if (!funcion) return 0;

    let total = 0;
    for (const clave of this.seleccionadas()) {
      const [fila] = clave.split('-');
      total += esVip(fila) ? funcion.precio_vip : funcion.precio_base;
    }
    return total;
  });

  constructor() {
    const funcionId = this.route.snapshot.paramMap.get('funcionId');
    if (funcionId) {
      this.cargar(funcionId);
    }
  }

  estadoButaca(butaca: Butaca): 'libre' | 'ocupada' | 'seleccionada' {
    const clave = claveButaca(butaca.fila, butaca.columna);
    if (this.ocupadas().has(clave)) return 'ocupada';
    if (this.seleccionadas().has(clave)) return 'seleccionada';
    return 'libre';
  }

  toggleButaca(butaca: Butaca): void {
    if (!this.puedeComprar()) return;

    const clave = claveButaca(butaca.fila, butaca.columna);
    if (this.ocupadas().has(clave)) return;

    const actuales = new Set(this.seleccionadas());
    if (actuales.has(clave)) {
      actuales.delete(clave);
    } else {
      actuales.add(clave);
    }
    this.seleccionadas.set(actuales);
  }

  async confirmarCompra(): Promise<void> {
    const funcion = this.funcion();
    if (!funcion || this.seleccionadas().size === 0) return;

    this.comprando.set(true);
    this.error.set(null);
    try {
      const butacas: ButacaSeleccionada[] = [...this.seleccionadas()].map((clave) => {
        const [fila, columnaTexto] = clave.split('-');
        return { fila, columna: Number(columnaTexto) };
      });

      const total = this.totalSeleccion();
      const resultado = await this.butacasService.confirmarCompra({
        funcionId: funcion.id,
        butacas,
        usuarioId: this.authService.session()?.user.id ?? null,
        subtotal: total,
        total
      });

      // El QR se genera en el cliente a partir del código de la compra: es
      // una imagen (dataURL) que cualquier lector de QR puede escanear, no
      // solo un string — así el comprobante impreso sirve de verdad en la
      // puerta de la sala.
      const qrImagenUrl = await QRCode.toDataURL(resultado.qrCode, { width: 220, margin: 1 });

      this.compraConfirmada.set({
        compraId: resultado.compraId,
        qrCode: resultado.qrCode,
        qrImagenUrl,
        butacas: butacas.map((b) => ({ ...b, esVip: esVip(b.fila) })).sort((a, b) => a.fila.localeCompare(b.fila) || a.columna - b.columna),
        total
      });
      this.seleccionadas.set(new Set());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos completar la compra.');
      await this.recargarOcupadas(funcion.id);
    } finally {
      this.comprando.set(false);
    }
  }

  // El "PDF" es el propio diálogo de impresión del navegador: styles.scss
  // define un @media print que oculta todo menos el comprobante, así que
  // "Guardar como PDF" ahí ya da un archivo prolijo sin sumar una librería
  // de generación de PDF solo para esto.
  imprimirComprobante(): void {
    window.print();
  }

  private async cargar(funcionId: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const funcion = await this.funcionesService.obtenerPorId(funcionId);
      if (!funcion) {
        this.error.set('No encontramos esa función.');
        return;
      }
      this.funcion.set(funcion);
      this.pelicula.set(await this.peliculasService.obtenerPorId(funcion.pelicula_id));

      await this.recargarOcupadas(funcionId);

      const desuscribirse = this.butacasService.suscribirseACambios(funcionId, () => this.recargarOcupadas(funcionId));
      this.destroyRef.onDestroy(desuscribirse);
    } catch {
      this.error.set('No pudimos cargar la función. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async recargarOcupadas(funcionId: string): Promise<void> {
    const reservas = await this.butacasService.listarOcupadas(funcionId);
    const mapa = new Map<string, ReservaButaca>();
    for (const reserva of reservas) {
      mapa.set(claveButaca(reserva.fila, reserva.columna), reserva);
    }
    this.ocupadas.set(mapa);

    const seleccionActual = new Set(this.seleccionadas());
    let seLeTomaronAlguna = false;
    for (const clave of seleccionActual) {
      if (mapa.has(clave)) {
        seleccionActual.delete(clave);
        seLeTomaronAlguna = true;
      }
    }
    if (seLeTomaronAlguna) {
      this.seleccionadas.set(seleccionActual);
      this.avisoSeleccion.set('Alguien tomó una de las butacas que habías elegido — la sacamos de tu selección.');
    }
  }
}
