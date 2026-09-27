import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CandyVenta, ReporteDiario, VentaPeliculaPorFecha } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly supabase = inject(SupabaseService);

  // La agregación (sumar facturación, contar entradas) vive en la vista
  // `reporte_diario` de Postgres (docs/migraciones/010) — acá solo se lee.
  async listarReporteDiario(): Promise<ReporteDiario[]> {
    const { data, error } = await this.supabase.client.from('reporte_diario').select('*').returns<ReporteDiario[]>();

    if (error) throw error;
    return data;
  }

  // Fila por película y día (docs/migraciones/030) — el componente agrupa
  // por semana/mes según lo que elija el admin, sin volver a pedirle nada
  // a la base por cada cambio de rango.
  async listarVentasPeliculaPorFecha(): Promise<VentaPeliculaPorFecha[]> {
    const { data, error } = await this.supabase.client.from('pelicula_ventas_por_fecha').select('*').returns<VentaPeliculaPorFecha[]>();

    if (error) throw error;
    return data;
  }

  async listarCandyMasVendido(): Promise<CandyVenta[]> {
    const { data, error } = await this.supabase.client.from('candy_ventas').select('*').returns<CandyVenta[]>();

    if (error) throw error;
    return data;
  }
}
