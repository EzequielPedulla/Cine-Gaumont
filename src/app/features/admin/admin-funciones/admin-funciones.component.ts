import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { FuncionesService } from '../../../core/services/funciones.service';
import { PeliculasService } from '../../../core/services/peliculas.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { FuncionConDetalle } from '../../../core/models/funcion.model';
import { PeliculaConGeneros } from '../../../core/models/pelicula.model';
import { SelectorFechaComponent } from '../../../shared/ui/selector-fecha/selector-fecha.component';
import { SelectorHoraComponent } from '../../../shared/ui/selector-hora/selector-hora.component';

@Component({
  selector: 'app-admin-funciones',
  imports: [ReactiveFormsModule, DatePipe, SelectorFechaComponent, SelectorHoraComponent],
  templateUrl: './admin-funciones.component.html',
  styleUrl: './admin-funciones.component.scss'
})
export class AdminFuncionesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly funcionesService = inject(FuncionesService);
  private readonly peliculasService = inject(PeliculasService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly funciones = signal<FuncionConDetalle[]>([]);
  readonly peliculas = signal<PeliculaConGeneros[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly guardando = signal(false);

  // Días de la semana para "repetir" (valor = Date.getDay(): 0 = domingo).
  readonly diasSemanaOpciones = [
    { valor: 1, nombre: 'Lun' },
    { valor: 2, nombre: 'Mar' },
    { valor: 3, nombre: 'Mié' },
    { valor: 4, nombre: 'Jue' },
    { valor: 5, nombre: 'Vie' },
    { valor: 6, nombre: 'Sáb' },
    { valor: 0, nombre: 'Dom' }
  ];
  readonly diasSemanaSeleccionados = signal<ReadonlySet<number>>(new Set());

  // Selectores propios de fecha/hora (mail 28/02: la consigna pide
  // explícitamente evitar el input nativo del navegador) — componentes
  // compartidos (shared/ui/selector-fecha, selector-hora), mismos que usa
  // registro.component.ts para la fecha de nacimiento.
  private readonly anioActual = new Date().getFullYear();
  readonly anios = [this.anioActual, this.anioActual + 1];

  readonly form = this.fb.nonNullable.group({
    peliculaId: ['', Validators.required],
    fechaDia: [null as number | null, Validators.required],
    fechaMes: [null as number | null, Validators.required],
    fechaAnio: [null as number | null, Validators.required],
    horaH: [null as number | null, Validators.required],
    horaM: [null as number | null, Validators.required],
    formato: ['2D', Validators.required],
    idioma: ['castellano', Validators.required],
    precioBase: [3000, [Validators.required, Validators.min(0)]],
    precioVip: [4500, [Validators.required, Validators.min(0)]],
    esPreventa: [false],
    precioPreventa: [null as number | null],
    repetir: [false],
    fechaHastaDia: [null as number | null],
    fechaHastaMes: [null as number | null],
    fechaHastaAnio: [null as number | null]
  });

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [funciones, peliculas] = await Promise.all([this.funcionesService.listarTodasConDetalle(), this.peliculasService.listarTodas()]);
      this.funciones.set(funciones);
      this.peliculas.set(peliculas);
    } catch {
      this.error.set('No pudimos cargar las funciones.');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleDia(dia: number): void {
    const actuales = new Set(this.diasSemanaSeleccionados());
    if (actuales.has(dia)) {
      actuales.delete(dia);
    } else {
      actuales.add(dia);
    }
    this.diasSemanaSeleccionados.set(actuales);
  }

  async crear(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const pelicula = this.peliculas().find((p) => p.id === valores.peliculaId);
    if (!pelicula) return;

    const fechaDesde = this.combinarFecha(valores.fechaAnio, valores.fechaMes, valores.fechaDia);
    const hora = this.combinarHora(valores.horaH, valores.horaM);
    if (!fechaDesde || !hora) {
      this.error.set('Completá la fecha y el horario de la función.');
      return;
    }

    let fechaAperturaPreventa: string | null = null;
    if (valores.esPreventa) {
      if (!pelicula.fecha_estreno) {
        this.error.set('Esta película no tiene fecha de estreno cargada — no se puede configurar la preventa.');
        return;
      }
      if (!valores.precioPreventa || valores.precioPreventa <= 0) {
        this.error.set('Ingresá un precio de preventa válido.');
        return;
      }
      // "abrir la venta 7 días antes del estreno" (mail 08/03): la fecha de
      // apertura es siempre estreno - 7 días, no algo que el admin elija a
      // mano función por función.
      const apertura = new Date(`${pelicula.fecha_estreno}T00:00:00`);
      apertura.setDate(apertura.getDate() - 7);
      fechaAperturaPreventa = apertura.toISOString();
    }

    let fechas: string[];
    if (valores.repetir) {
      const fechaHasta = this.combinarFecha(valores.fechaHastaAnio, valores.fechaHastaMes, valores.fechaHastaDia);
      if (!fechaHasta || this.diasSemanaSeleccionados().size === 0) {
        this.error.set('Para repetir, elegí al menos un día de la semana y una fecha "hasta".');
        return;
      }
      fechas = this.generarFechas(fechaDesde, fechaHasta, this.diasSemanaSeleccionados());
      if (fechas.length === 0) {
        this.error.set('Ninguna fecha del rango elegido cae en los días seleccionados.');
        return;
      }
    } else {
      fechas = [fechaDesde];
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const creadas: string[] = [];
    const fallidas: string[] = [];

    for (const fecha of fechas) {
      try {
        const sala = await this.funcionesService.crear({
          peliculaId: pelicula.id,
          fecha,
          hora,
          duracionMin: pelicula.duracion_min,
          formato: valores.formato as '2D' | '3D' | '4D' | '5D',
          idioma: valores.idioma as 'castellano' | 'subtitulada',
          precioBase: valores.precioBase,
          precioVip: valores.precioVip,
          esPreventa: valores.esPreventa,
          precioPreventa: valores.esPreventa ? valores.precioPreventa : null,
          fechaAperturaPreventa
        });
        creadas.push(`${fecha} → ${sala.nombre}`);
      } catch (error) {
        fallidas.push(`${fecha}: ${error instanceof Error ? error.message : 'error desconocido'}`);
      }
    }

    if (creadas.length > 0) {
      this.mensajeExito.set(
        fechas.length === 1
          ? `Función creada — se asignó automáticamente a "${creadas[0].split('→')[1].trim()}".`
          : `Se crearon ${creadas.length} de ${fechas.length} funciones: ${creadas.join(' · ')}.`
      );
    }
    if (fallidas.length > 0) {
      this.error.set(
        fechas.length === 1
          ? fallidas[0].replace(/^[^:]+:\s*/, '') // en el caso simple, mostramos directo el motivo (ej. "no hay ninguna sala libre...")
          : `${fallidas.length} de ${fechas.length} funciones no se pudieron crear — ${fallidas.join(' · ')}`
      );
    }

    // Si algo falló, dejamos el formulario como estaba para que sea fácil
    // ajustar y reintentar, en vez de obligar a cargar todo de nuevo.
    if (fallidas.length === 0) {
      this.form.patchValue({
        fechaDia: null,
        fechaMes: null,
        fechaAnio: null,
        horaH: null,
        horaM: null,
        fechaHastaDia: null,
        fechaHastaMes: null,
        fechaHastaAnio: null,
        repetir: false,
        esPreventa: false,
        precioPreventa: null
      });
      this.diasSemanaSeleccionados.set(new Set());
    }

    await this.cargar();
    this.guardando.set(false);
  }

  async eliminar(funcion: FuncionConDetalle): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(`¿Eliminar la función de "${funcion.pelicula.titulo}"?`);
    if (!confirmado) return;

    this.error.set(null);
    try {
      await this.funcionesService.eliminar(funcion.id);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos eliminar la función.');
    }
  }

  private combinarFecha(anio: number | null, mes: number | null, dia: number | null): string | null {
    if (!anio || !mes || !dia) return null;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  private combinarHora(hora: number | null, minuto: number | null): string | null {
    if (hora === null || minuto === null) return null;
    return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
  }

  private generarFechas(desdeIso: string, hastaIso: string, dias: ReadonlySet<number>): string[] {
    const fechas: string[] = [];
    const actual = new Date(`${desdeIso}T00:00:00`);
    const limite = new Date(`${hastaIso}T00:00:00`);

    while (actual <= limite) {
      if (dias.has(actual.getDay())) {
        fechas.push(actual.toISOString().slice(0, 10));
      }
      actual.setDate(actual.getDate() + 1);
    }

    return fechas;
  }
}
