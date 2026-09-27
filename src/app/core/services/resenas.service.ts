import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Resena } from '../models/resena.model';

@Injectable({ providedIn: 'root' })
export class ResenasService {
  private readonly supabase = inject(SupabaseService);

  async listarPorPelicula(peliculaId: string): Promise<Resena[]> {
    const { data, error } = await this.supabase.client
      .from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('creada_en', { ascending: false })
      .returns<Resena[]>();

    if (error) throw error;
    return data;
  }

  // upsert por (pelicula_id, usuario_id): si el usuario ya había reseñado
  // esta película, la segunda vez actualiza en vez de chocar con el
  // unique() de la tabla.
  async guardar(peliculaId: string, usuarioId: string, autorNombre: string, estrellas: number, comentario: string): Promise<void> {
    const { error } = await this.supabase.client.from('resenas').upsert(
      {
        pelicula_id: peliculaId,
        usuario_id: usuarioId,
        autor_nombre: autorNombre,
        estrellas,
        comentario: comentario.trim() || null
      },
      { onConflict: 'pelicula_id,usuario_id' }
    );

    if (error) {
      console.error('Error al guardar reseña:', error);
      throw new Error('No pudimos guardar tu reseña. Probá de nuevo.');
    }
  }
}
