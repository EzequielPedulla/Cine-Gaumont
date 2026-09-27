import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import * as QRCode from 'qrcode';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ButacaSeleccionada, ButacasService } from '../../../core/services/butacas.service';
import { AuthService } from '../../../core/services/auth.service';
import { CuponesService } from '../../../core/services/cupones.service';
import { FuncionConSala } from '../../../core/models/funcion.model';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { ReservaButaca } from '../../../core/models/compra.model';
import { Cupon } from '../../../core/models/cupon.model';
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
  private readonly cuponesService = inject(CuponesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly layout = generarLayoutSala();

  // toObservable() necesita crearse en contexto de inyección (acá, durante
  // la construcción del componente) — por eso es un campo y no algo que se
  // arma recién dentro de cargar(), que corre después de un await.
  private readonly sesionResuelta$ = toObservable(this.authService.cargandoSesion).pipe(
    filter((cargando) => !cargando),
    take(1)
  );

  readonly funcion = signal<FuncionConSala | null>(null);
  readonly pelicula = signal<PeliculaConGeneros | null>(null);
  readonly ocupadas = signal<ReadonlyMap<string, ReservaButaca>>(new Map());
  readonly seleccionadas = signal<ReadonlySet<string>>(new Set());

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comprando = signal(false);
  readonly avisoSeleccion = signal<string | null>(null);
  readonly compraConfirmada = signal<Comprobante | null>(null);
  readonly cuponAplicado = signal<Cupon | null>(null);
  readonly codigoCupon = signal('');
  readonly errorCupon = signal<string | null>(null);
  readonly aplicandoCupon = signal(false);

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

  // El cupón de bienvenida (mail 01/01 y 06/02: 20% en la primera compra,
  // porcentaje configurable por el admin) se resuelve una sola vez al
  // entrar a la pantalla, no en cada click de butaca — así no repetimos la
  // consulta de "¿es su primera compra?" todo el tiempo.
  readonly totalConDescuento = computed(() => {
    const subtotal = this.totalSeleccion();
    const cupon = this.cuponAplicado();
    if (!cupon) return subtotal;
    return Math.round(subtotal * (1 - cupon.porcentaje / 100) * 100) / 100;
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

  async aplicarCupon(): Promise<void> {
    const codigo = this.codigoCupon().trim();
    if (!codigo) return;

    this.aplicandoCupon.set(true);
    this.errorCupon.set(null);
    try {
      const cupon = await this.cuponesService.buscarPorCodigo(codigo);
      if (!cupon || !cupon.activo) {
        this.errorCupon.set('Ese código no existe o ya no está activo.');
        return;
      }

      if (cupon.condicion === 'primera_compra') {
        const usuarioId = this.authService.session()?.user.id;
        if (!usuarioId) {
          this.errorCupon.set('Iniciá sesión para usar este cupón.');
          return;
        }
        if (await this.cuponesService.tieneComprasPrevias(usuarioId)) {
          this.errorCupon.set('Este cupón es solo para tu primera compra.');
          return;
        }
      }

      if (cupon.condicion === 'mayor_50') {
        const edad = this.edadUsuario();
        if (edad === null || edad < 50) {
          this.errorCupon.set('Este cupón es solo para mayores de 50 años.');
          return;
        }
      }

      this.cuponAplicado.set(cupon);
      this.codigoCupon.set('');
    } finally {
      this.aplicandoCupon.set(false);
    }
  }

  quitarCupon(): void {
    this.cuponAplicado.set(null);
    this.errorCupon.set(null);
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

      const subtotal = this.totalSeleccion();
      const total = this.totalConDescuento();
      const cupon = this.cuponAplicado();
      const resultado = await this.butacasService.confirmarCompra({
        funcionId: funcion.id,
        butacas,
        usuarioId: this.authService.session()?.user.id ?? null,
        cuponId: cupon?.id ?? null,
        subtotal,
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

      // Refresca los puntos de fidelidad que acaba de acreditar el trigger
      // de la compra, así el header/perfil los muestra al instante.
      await this.authService.recargarPerfil();
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

      // Sin esto, entrar directo a esta URL (F5, o un link) podía leer
      // session()=null aunque la persona estuviera logueada — la sesión
      // todavía no se había terminado de resolver — y el cupón de
      // bienvenida se salteaba en silencio en el peor momento posible:
      // justo la primera compra de un usuario nuevo.
      await firstValueFrom(this.sesionResuelta$);
      const usuarioId = this.authService.session()?.user.id;
      if (usuarioId) {
        this.cuponAplicado.set(await this.cuponesService.buscarCuponBienvenida(usuarioId));
      }

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
