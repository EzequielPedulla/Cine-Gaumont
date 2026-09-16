import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { FuncionConSala } from '../models/funcion.model';

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  private readonly supabase = inject(SupabaseService);

  async listarPorPelicula(peliculaId: string): Promise<FuncionConSala[]> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: true })
      .returns<FuncionConSala[]>();

    if (error) throw error;
    return data;
  }

  async obtenerPorId(id: string): Promise<FuncionConSala | null> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('id', id)
      .maybeSingle<FuncionConSala>();

    if (error) throw error;
    return data ?? null;
  }
}
