import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { LogActividad } from '../models/log-actividad.model';

@Injectable({ providedIn: 'root' })
export class LogActividadService {
  private readonly supabase = inject(SupabaseService);

  async listarRecientes(limite = 100): Promise<LogActividad[]> {
    const { data, error } = await this.supabase.client
      .from('log_actividad')
      .select('*, usuario:usuarios_perfil(nombre, apellido)')
      .order('creado_en', { ascending: false })
      .limit(limite)
      .returns<LogActividad[]>();

    if (error) throw error;
    return data;
  }
}
