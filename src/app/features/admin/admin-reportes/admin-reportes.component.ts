import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ReportesService } from '../../../core/services/reportes.service';
import { ReporteDiario } from '../../../core/models/reporte.model';

@Component({
  selector: 'app-admin-reportes',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './admin-reportes.component.html',
  styleUrl: './admin-reportes.component.scss'
})
export class AdminReportesComponent {
  private readonly reportesService = inject(ReportesService);

  readonly reporte = signal<ReporteDiario[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly totalFacturado = computed(() => this.reporte().reduce((acc, fila) => acc + fila.total_facturado, 0));
  readonly totalEntradas = computed(() => this.reporte().reduce((acc, fila) => acc + fila.entradas_vendidas, 0));

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.reporte.set(await this.reportesService.listarReporteDiario());
    } catch {
      this.error.set('No pudimos cargar el reporte.');
    } finally {
      this.cargando.set(false);
    }
  }
}
