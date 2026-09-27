import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { ReporteDiario } from '../models/reporte.model';

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
}
