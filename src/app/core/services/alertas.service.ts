import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly supabase = inject(SupabaseService);

  async listarPeliculaIds(usuarioId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client.from('alertas_estreno').select('pelicula_id').eq('usuario_id', usuarioId);

    if (error) {
      console.error('Error al listar alertas de estreno:', error);
      return [];
    }
    return data.map((fila) => fila.pelicula_id);
  }

  async activar(peliculaId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase.client.from('alertas_estreno').insert({ pelicula_id: peliculaId, usuario_id: usuarioId });
    if (error) throw new Error('No pudimos activar el aviso.');
  }

  async desactivar(peliculaId: string, usuarioId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('alertas_estreno')
      .delete()
      .eq('pelicula_id', peliculaId)
      .eq('usuario_id', usuarioId);
    if (error) throw new Error('No pudimos desactivar el aviso.');
  }
}
