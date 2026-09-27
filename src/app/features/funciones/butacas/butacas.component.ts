import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ButacaSeleccionada, ButacasService } from '../../../core/services/butacas.service';
import { AuthService } from '../../../core/services/auth.service';
import { CuponesService } from '../../../core/services/cupones.service';
import { RecompensasService } from '../../../core/services/recompensas.service';
import { CandyService } from '../../../core/services/candy.service';
import { CombosService } from '../../../core/services/combos.service';
import { FuncionConSala } from '../../../core/models/funcion.model';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { ReservaButaca } from '../../../core/models/compra.model';
import { Cupon } from '../../../core/models/cupon.model';
import { Recompensa } from '../../../core/models/recompensa.model';
import { CategoriaCandy, ProductoCandy } from '../../../core/models/candy.model';
import { ComboConItems } from '../../../core/models/combo.model';
import { Butaca, generarLayoutSala } from '../../../core/sala-layout';
import { ComprobanteEntradaComponent } from '../../../shared/ui/comprobante-entrada/comprobante-entrada.component';

export interface ButacaComprada extends ButacaSeleccionada {
  esVip: boolean;
}

export interface ItemCandyComprado {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Comprobante {
  compraId: string;
  qrCode: string;
  butacas: ButacaComprada[];
  candy: ItemCandyComprado[];
  total: number;
  creditoUsado: number;
}

// Un canje "pendiente" no toca la base todavía — recién se aplica (resta
// puntos de verdad) cuando se confirma la compra, todo junto y atómico.
// `producto` distingue el tipo: null = recompensa de entrada, con producto
// = recompensa de candy (y ese producto se suma gratis al carrito).
export interface CanjePendiente {
  recompensa: Recompensa;
  producto: ProductoCandy | null;
}

function claveButaca(fila: string, columna: number): string {
  return `${fila}-${columna}`;
}

function esVip(fila: string): boolean {
  return fila >= 'R';
}

@Component({
  selector: 'app-butacas',
  imports: [DatePipe, CurrencyPipe, RouterLink, ComprobanteEntradaComponent],
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
  private readonly recompensasService = inject(RecompensasService);
  private readonly candyService = inject(CandyService);
  private readonly combosService = inject(CombosService);
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
  readonly usarCredito = signal(false);
  readonly recompensasActivas = signal<Recompensa[]>([]);
  readonly canjesPendientes = signal<CanjePendiente[]>([]);
  readonly categoriasCandy = signal<CategoriaCandy[]>([]);
  readonly productosCandy = signal<ProductoCandy[]>([]);
  readonly cantidadesCandy = signal<ReadonlyMap<string, number>>(new Map());
  readonly combos = signal<ComboConItems[]>([]);
  readonly cantidadesCombo = signal<ReadonlyMap<string, number>>(new Map());

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

  // Preventa (mail 08/03): precio especial desde 7 días antes del estreno
  // hasta el día del estreno. La ventana se calcula EN VIVO a partir de
  // pelicula.fecha_estreno en vez de leer funcion.fecha_apertura_preventa
  // (que se guarda al crear la función): si un admin edita la fecha de
  // estreno después desde Admin > Películas, esta cuenta siempre queda
  // consistente con el valor actual — la columna guardada podría quedar
  // desactualizada y no queremos depender de ella para decidir el precio.
  private readonly ventanaPreventa = computed<{ apertura: Date; estreno: Date } | null>(() => {
    const funcion = this.funcion();
    const pelicula = this.pelicula();
    if (!funcion?.es_preventa || funcion.precio_preventa == null || !pelicula?.fecha_estreno) {
      return null;
    }
    const estreno = new Date(`${pelicula.fecha_estreno}T00:00:00`);
    const apertura = new Date(estreno);
    apertura.setDate(apertura.getDate() - 7);
    return { apertura, estreno };
  });

  readonly fechaAperturaPreventa = computed(() => this.ventanaPreventa()?.apertura ?? null);

  readonly enPreventa = computed(() => {
    const ventana = this.ventanaPreventa();
    if (!ventana) return false;
    const ahora = new Date();
    return ahora >= ventana.apertura && ahora < ventana.estreno;
  });

  // Antes de que abra la preventa, la venta está directamente cerrada — no
  // "precio normal mientras tanto". Esto sí bloquea la compra por completo
  // (a diferencia de después del estreno, donde simplemente se cobra el
  // precio normal y la venta sigue abierta).
  readonly ventaAunNoAbierta = computed(() => {
    const ventana = this.ventanaPreventa();
    return !!ventana && new Date() < ventana.apertura;
  });

  readonly puedeComprar = computed(() => !this.requiereLogin() && !this.bloqueadoPorEdad() && !this.ventaAunNoAbierta());

  readonly totalSeleccion = computed(() => {
    const funcion = this.funcion();
    if (!funcion) return 0;

    const enPreventa = this.enPreventa();
    let total = 0;
    for (const clave of this.seleccionadas()) {
      const [fila] = clave.split('-');
      total += enPreventa ? funcion.precio_preventa! : esVip(fila) ? funcion.precio_vip : funcion.precio_base;
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

  // Candy (mail 06/02: "que lo puedan comprar junto con la entrada") — el
  // cupón de la entrada no se extiende al candy, así que se suma DESPUÉS
  // del descuento de las butacas, no antes.
  readonly carritoCandy = computed(() => {
    const cantidades = this.cantidadesCandy();
    return this.productosCandy()
      .map((producto) => ({ producto, cantidad: cantidades.get(producto.id) ?? 0 }))
      .filter((item) => item.cantidad > 0);
  });

  readonly totalCandy = computed(() => this.carritoCandy().reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0));

  // Combos (mail 08/03: "a precio fijo... destacados en la pantalla de
  // compra") — no se descomponen en sus productos individuales al comprar:
  // cada combo elegido es UNA fila propia (compra_candy_items.combo_id),
  // al precio fijo que definió el admin, sin importar la suma de sus partes.
  readonly carritoCombos = computed(() => {
    const cantidades = this.cantidadesCombo();
    return this.combos()
      .map((combo) => ({ combo, cantidad: cantidades.get(combo.id) ?? 0 }))
      .filter((item) => item.cantidad > 0);
  });

  readonly totalCombos = computed(() => this.carritoCombos().reduce((acc, item) => acc + item.combo.precio_fijo * item.cantidad, 0));

  // Puntos gastados en canjes que todavía no se confirmaron — se descuentan
  // de los puntos "disponibles para gastar" así no se puede armar un
  // carrito de canjes que en total superen lo que la persona realmente tiene.
  readonly puntosComprometidos = computed(() => this.canjesPendientes().reduce((acc, c) => acc + c.recompensa.puntos_requeridos, 0));

  readonly puntosRestantes = computed(() => (this.authService.perfil()?.puntos_fidelidad ?? 0) - this.puntosComprometidos());

  // Las recompensas de "entrada" no son de ningún producto puntual, así que
  // se listan aparte, en el resumen. Las de candy sí son de un producto
  // real (producto_id) — se muestran directo en su tarjeta.
  //
  // Solo se puede canjear una entrada si hay una butaca seleccionada para
  // "cubrir" — sin esto se podía canjear puntos sin haber elegido ningún
  // asiento todavía, sin relación con nada concreto. Y no se puede canjear
  // más entradas de las butacas elegidas: cada canje cubre UNA butaca, no
  // más (si no, se gastarían puntos de más sin ningún descuento extra real).
  readonly entradasCanjeadasPendientes = computed(() => this.canjesPendientes().filter((c) => c.producto === null).length);

  readonly recompensasEntradaCanjeables = computed(() => {
    if (this.entradasCanjeadasPendientes() >= this.seleccionadas().size) return [];
    return this.recompensasActivas().filter((r) => r.tipo === 'entrada' && r.puntos_requeridos <= this.puntosRestantes());
  });

  // Mismo criterio que con la entrada: solo se puede canjear un producto de
  // candy si ya tenés al menos 1 unidad puesta en el carrito con el +/- de
  // ese producto — canjear CONVIERTE una unidad paga en gratis (ver
  // canjearProductoCandy), no agrega una unidad extra de la nada.
  readonly recompensaCandyPorProducto = computed(() => {
    const mapa = new Map<string, Recompensa>();
    const cantidades = this.cantidadesCandy();
    for (const r of this.recompensasActivas()) {
      if (r.tipo === 'producto_candy' && r.producto_id && r.puntos_requeridos <= this.puntosRestantes() && (cantidades.get(r.producto_id) ?? 0) > 0) {
        mapa.set(r.producto_id, r);
      }
    }
    return mapa;
  });

  // Cada canje de candy pendiente entra gratis a esta lista aparte — nunca
  // se mezcla con carritoCandy (que es lo que se paga con plata de verdad),
  // para no tener que representar "3 pagas + 1 gratis del mismo producto"
  // dentro de un solo contador.
  readonly candyCanjeado = computed(() => this.canjesPendientes().filter((c) => c.producto !== null));

  // Una recompensa de "entrada" no tiene un precio propio fijado por el
  // admin — vale lo mismo que UNA butaca común de esta función, así nunca
  // queda desactualizada respecto al precio real que se está cobrando.
  readonly descuentoEntradaPorPuntos = computed(() => {
    const funcion = this.funcion();
    if (!funcion) return 0;
    const cantidad = this.canjesPendientes().filter((c) => c.producto === null).length;
    return Math.min(cantidad * funcion.precio_base, this.totalConDescuento());
  });

  readonly totalGeneral = computed(
    () => Math.max(0, this.totalConDescuento() - this.descuentoEntradaPorPuntos()) + this.totalCandy() + this.totalCombos()
  );

  // Crédito disponible (mail 10/03): sale ÚNICAMENTE de cancelar una compra
  // (docs/migraciones/014) — nunca del canje de puntos. Por eso mismo solo
  // se aplica sobre las entradas, no sobre el candy: es plata que ya
  // pagaste por una entrada antes, tiene sentido que vuelva a pagar
  // entradas, no que se cuele a pagar pochoclos.
  readonly creditoDisponible = computed(() => this.authService.perfil()?.credito_disponible ?? 0);

  readonly creditoAplicado = computed(() =>
    this.usarCredito() ? Math.min(this.creditoDisponible(), Math.max(0, this.totalConDescuento() - this.descuentoEntradaPorPuntos())) : 0
  );

  readonly totalAPagar = computed(() => this.totalGeneral() - this.creditoAplicado());

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
    this.recortarCanjesDeEntradaA(actuales.size);
  }

  // Si se destilda una butaca y ya no hay suficientes para "cubrir" todos
  // los canjes de entrada pendientes, se sacan los que sobran — nunca se
  // deja un canje de puntos sin ninguna butaca real detrás.
  private recortarCanjesDeEntradaA(cantidadButacas: number): void {
    let entradasVistas = 0;
    this.canjesPendientes.update((actuales) =>
      actuales.filter((c) => {
        if (c.producto !== null) return true;
        entradasVistas++;
        return entradasVistas <= cantidadButacas;
      })
    );
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

  productosPorCategoria(categoriaId: string): ProductoCandy[] {
    return this.productosCandy().filter((producto) => producto.categoria_id === categoriaId);
  }

  cambiarCantidadCandy(producto: ProductoCandy, delta: number): void {
    const actuales = new Map(this.cantidadesCandy());
    const nueva = Math.max(0, (actuales.get(producto.id) ?? 0) + delta);
    if (nueva === 0) {
      actuales.delete(producto.id);
    } else {
      actuales.set(producto.id, nueva);
    }
    this.cantidadesCandy.set(actuales);
  }

  cambiarCantidadCombo(combo: ComboConItems, delta: number): void {
    const actuales = new Map(this.cantidadesCombo());
    const nueva = Math.max(0, (actuales.get(combo.id) ?? 0) + delta);
    if (nueva === 0) {
      actuales.delete(combo.id);
    } else {
      actuales.set(combo.id, nueva);
    }
    this.cantidadesCombo.set(actuales);
  }

  quitarCupon(): void {
    this.cuponAplicado.set(null);
    this.errorCupon.set(null);
  }

  // Canjear no toca la base todavía — solo agrega el canje a la lista de
  // "pendientes" de esta compra. Los puntos recién se restan de verdad (vía
  // canjear_puntos_en_compra, docs/migraciones/027) cuando se confirma la
  // compra, todo en la misma operación atómica que crea la entrada. Así, si
  // la persona se arrepiente o nunca confirma, no perdió puntos por nada.
  canjearEntrada(recompensa: Recompensa): void {
    this.canjesPendientes.update((actuales) => [...actuales, { recompensa, producto: null }]);
  }

  // Convierte una unidad que ya estaba en el carrito (pagada) en una unidad
  // gratis por puntos — por eso resta 1 del contador +/- del producto antes
  // de sumarlo a los canjes pendientes: si no, quedaría duplicado (una vez
  // cobrada, otra vez gratis).
  canjearProductoCandy(producto: ProductoCandy, recompensa: Recompensa): void {
    this.cambiarCantidadCandy(producto, -1);
    this.canjesPendientes.update((actuales) => [...actuales, { recompensa, producto }]);
  }

  quitarCanje(index: number): void {
    const canje = this.canjesPendientes()[index];
    this.canjesPendientes.update((actuales) => actuales.filter((_, i) => i !== index));
    if (canje?.producto) {
      // Al sacar el canje, la unidad vuelve a estar disponible como paga —
      // no desaparece del carrito, solo deja de ser gratis.
      this.cambiarCantidadCandy(canje.producto, 1);
    }
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

      const carritoCandy = this.carritoCandy();
      const carritoCombos = this.carritoCombos();
      const subtotal = this.totalSeleccion();
      const total = this.totalGeneral();
      const creditoUsado = this.creditoAplicado();
      const cupon = this.cuponAplicado();

      // El candy canjeado con puntos se agrupa por producto (si se canjeó
      // el mismo 2 veces, una sola fila con cantidad 2) y va a precio $0 —
      // ya "pagó" con puntos, no con plata.
      const candyCanjeadoPorProducto = new Map<string, { producto: ProductoCandy; cantidad: number }>();
      for (const canje of this.candyCanjeado()) {
        const producto = canje.producto!;
        const actual = candyCanjeadoPorProducto.get(producto.id);
        candyCanjeadoPorProducto.set(producto.id, { producto, cantidad: (actual?.cantidad ?? 0) + 1 });
      }
      const candyGratis = [...candyCanjeadoPorProducto.values()];

      const resultado = await this.butacasService.confirmarCompra({
        funcionId: funcion.id,
        butacas,
        usuarioId: this.authService.session()?.user.id ?? null,
        cuponId: cupon?.id ?? null,
        subtotal,
        total,
        creditoUsado,
        candyItems: [
          ...carritoCandy.map((item) => ({
            productoId: item.producto.id,
            comboId: null,
            cantidad: item.cantidad,
            precioUnitario: item.producto.precio
          })),
          ...candyGratis.map((item) => ({ productoId: item.producto.id, comboId: null, cantidad: item.cantidad, precioUnitario: 0 })),
          ...carritoCombos.map((item) => ({
            productoId: null,
            comboId: item.combo.id,
            cantidad: item.cantidad,
            precioUnitario: item.combo.precio_fijo
          }))
        ],
        canjes: this.canjesPendientes().map((c) => c.recompensa.id)
      });

      this.compraConfirmada.set({
        compraId: resultado.compraId,
        qrCode: resultado.qrCode,
        butacas: butacas.map((b) => ({ ...b, esVip: esVip(b.fila) })).sort((a, b) => a.fila.localeCompare(b.fila) || a.columna - b.columna),
        candy: [
          ...carritoCandy.map((item) => ({ nombre: item.producto.nombre, cantidad: item.cantidad, precioUnitario: item.producto.precio })),
          ...candyGratis.map((item) => ({ nombre: item.producto.nombre + ' (canjeado con puntos)', cantidad: item.cantidad, precioUnitario: 0 })),
          ...carritoCombos.map((item) => ({ nombre: item.combo.nombre, cantidad: item.cantidad, precioUnitario: item.combo.precio_fijo }))
        ],
        total: total - creditoUsado,
        creditoUsado
      });
      this.seleccionadas.set(new Set());
      this.cantidadesCandy.set(new Map());
      this.cantidadesCombo.set(new Map());
      this.canjesPendientes.set([]);
      this.usarCredito.set(false);

      // Refresca los puntos de fidelidad que acaba de acreditar el trigger
      // de la compra (y los que acaban de descontar los canjes), así el
      // header/perfil lo muestra al instante.
      await this.authService.recargarPerfil();
      await this.cargarRecompensasActivas();
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

      const [categorias, productos, combos] = await Promise.all([
        this.candyService.listarCategorias(),
        this.candyService.listarProductosActivos(),
        this.combosService.listarActivos()
      ]);
      this.categoriasCandy.set(categorias);
      this.productosCandy.set(productos);
      this.combos.set(combos);

      // Sin esto, entrar directo a esta URL (F5, o un link) podía leer
      // session()=null aunque la persona estuviera logueada — la sesión
      // todavía no se había terminado de resolver — y el cupón de
      // bienvenida se salteaba en silencio en el peor momento posible:
      // justo la primera compra de un usuario nuevo.
      await firstValueFrom(this.sesionResuelta$);
      const usuarioId = this.authService.session()?.user.id;
      if (usuarioId) {
        this.cuponAplicado.set(await this.cuponesService.buscarCuponBienvenida(usuarioId));
        await this.cargarRecompensasActivas();
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

  // Se guardan TODAS las recompensas activas, sin filtrar por puntos acá —
  // el filtro por "cuántos puntos me quedan" es reactivo (recompensasEntradaCanjeables
  // / recompensaCandyPorProducto), porque baja en vivo a medida que se
  // arman canjes pendientes, sin volver a pedirle nada a la base.
  private async cargarRecompensasActivas(): Promise<void> {
    this.recompensasActivas.set(await this.recompensasService.listarActivas());
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
      this.recortarCanjesDeEntradaA(seleccionActual.size);
      this.avisoSeleccion.set('Alguien tomó una de las butacas que habías elegido — la sacamos de tu selección.');
    }
  }
}
