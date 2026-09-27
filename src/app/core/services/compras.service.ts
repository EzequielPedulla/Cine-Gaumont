import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CompraConDetalle } from '../models/compra.model';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly supabase = inject(SupabaseService);

  async listarPorUsuario(usuarioId: string): Promise<CompraConDetalle[]> {
    const { data, error } = await this.supabase.client
      .from('compras')
      .select(
        '*, funcion:funciones(fecha_hora, formato, idioma, sala:salas(nombre), pelicula:peliculas(titulo, imagen_url)), reservas_butacas(fila, columna)'
      )
      .eq('usuario_id', usuarioId)
      .order('creada_en', { ascending: false })
      .returns<CompraConDetalle[]>();

    if (error) throw error;
    return data;
  }

  // La validación real (dueño, estado activo, margen de 2hs) vive en el RPC
  // `cancelar_compra` (docs/migraciones/014) — acá solo se invoca.
  async cancelar(compraId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('cancelar_compra', { p_compra_id: compraId });
    if (error) throw new Error(error.message || 'No pudimos cancelar la compra.');
  }
}
