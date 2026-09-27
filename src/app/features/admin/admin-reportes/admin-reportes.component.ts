import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ReportesService } from '../../../core/services/reportes.service';
import { CandyVenta, ReporteDiario, VentaPeliculaPorFecha } from '../../../core/models/reporte.model';

export type RangoGrafico = 'semana' | 'mes';

export interface BarraPelicula {
  titulo: string;
  entradas: number;
  porcentaje: number;
}

@Component({
  selector: 'app-admin-reportes',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './admin-reportes.component.html',
  styleUrl: './admin-reportes.component.scss'
})
export class AdminReportesComponent {
  private readonly reportesService = inject(ReportesService);

  readonly reporte = signal<ReporteDiario[]>([]);
  readonly ventasPelicula = signal<VentaPeliculaPorFecha[]>([]);
  readonly candyVentas = signal<CandyVenta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly rango = signal<RangoGrafico>('semana');

  readonly totalFacturado = computed(() => this.reporte().reduce((acc, fila) => acc + fila.total_facturado, 0));
  readonly totalEntradas = computed(() => this.reporte().reduce((acc, fila) => acc + fila.entradas_vendidas, 0));

  // Gráfico de películas más vistas (mail 10/03: "por semana y por mes") —
  // se arma en el cliente a partir de la fila-por-día ya cargada, filtrando
  // por fecha y sumando por película. Barras en CSS puro (ancho
  // proporcional al máximo) en vez de sumar una librería de gráficos solo
  // para esto.
  readonly ventasPeliculaFiltradas = computed<BarraPelicula[]>(() => {
    const dias = this.rango() === 'semana' ? 7 : 30;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    const desdeTexto = desde.toISOString().slice(0, 10);

    const porPelicula = new Map<string, { titulo: string; entradas: number }>();
    for (const fila of this.ventasPelicula()) {
      if (fila.fecha < desdeTexto) continue;
      const actual = porPelicula.get(fila.pelicula_id);
      porPelicula.set(fila.pelicula_id, { titulo: fila.titulo, entradas: (actual?.entradas ?? 0) + fila.entradas_vendidas });
    }

    const filas = [...porPelicula.values()].sort((a, b) => b.entradas - a.entradas).slice(0, 8);
    const maximo = Math.max(...filas.map((f) => f.entradas), 1);
    return filas.map((f) => ({ titulo: f.titulo, entradas: f.entradas, porcentaje: Math.round((f.entradas / maximo) * 100) }));
  });

  readonly candyMasVendido = computed(() => [...this.candyVentas()].sort((a, b) => b.unidades_vendidas - a.unidades_vendidas).slice(0, 5));

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [reporte, ventasPelicula, candyVentas] = await Promise.all([
        this.reportesService.listarReporteDiario(),
        this.reportesService.listarVentasPeliculaPorFecha(),
        this.reportesService.listarCandyMasVendido()
      ]);
      this.reporte.set(reporte);
      this.ventasPelicula.set(ventasPelicula);
      this.candyVentas.set(candyVentas);
    } catch {
      this.error.set('No pudimos cargar el reporte.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarRango(rango: RangoGrafico): void {
    this.rango.set(rango);
  }

  // "Exportar a PDF" reusa el diálogo de impresión del navegador (mismo
  // truco que el comprobante de entrada) — el @media print de styles.scss
  // esconde el header/nav del admin y deja solo el contenido del reporte.
  exportarPDF(): void {
    window.print();
  }

  // "Exportar a Excel": un .csv se abre directo en Excel sin sumar una
  // librería (xlsx) solo para generar una planilla — más simple y sin
  // dependencias nuevas para instalar.
  exportarExcel(): void {
    const filas = [
      ['Día', 'Entradas vendidas', 'Facturado'],
      ...this.reporte().map((fila) => [fila.fecha, String(fila.entradas_vendidas), String(fila.total_facturado)])
    ];
    const csv = filas.map((fila) => fila.map((valor) => `"${valor.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-cine-gaumont-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
