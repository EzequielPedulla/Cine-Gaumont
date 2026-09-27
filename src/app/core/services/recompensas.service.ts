import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Canje, Recompensa, TipoRecompensa } from '../models/recompensa.model';

export interface RecompensaFormData {
  nombre: string;
  tipo: TipoRecompensa;
  producto_id?: string | null;
  puntos_requeridos: number;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class RecompensasService {
  private readonly supabase = inject(SupabaseService);

  async listarTodas(): Promise<Recompensa[]> {
    const { data, error } = await this.supabase.client.from('recompensas_puntos').select('*').returns<Recompensa[]>();
    if (error) throw error;
    return data;
  }

  async listarActivas(): Promise<Recompensa[]> {
    const { data, error } = await this.supabase.client
      .from('recompensas_puntos')
      .select('*')
      .eq('activo', true)
      .order('puntos_requeridos', { ascending: true })
      .returns<Recompensa[]>();
    if (error) throw error;
    return data;
  }

  // Cada producto de candy con "puntos para canjear" tiene como mucho una
  // recompensa propia (Admin > Candy la crea/edita/borra sola) — así el
  // admin nunca gestiona a mano una recompensa de candy desconectada del
  // producto real ni de su precio.
  async buscarPorProducto(productoId: string): Promise<Recompensa | null> {
    // .limit(1) es a propósito: si por algún motivo quedó más de una fila
    // para el mismo producto (no debería, pero pasó durante las pruebas),
    // .maybeSingle() sin límite tira error "multiple rows" y lo esconde en
    // el catch de abajo devolviendo null — y ESE null es justo lo que hacía
    // que guardarProducto() creara una recompensa NUEVA cada vez en lugar
    // de actualizar la que ya existía, duplicando filas sin parar.
    const { data, error } = await this.supabase.client
      .from('recompensas_puntos')
      .select('*')
      .eq('producto_id', productoId)
      .limit(1)
      .maybeSingle<Recompensa>();

    if (error) {
      console.error('Error al buscar recompensa por producto:', error);
      return null;
    }
    return data ?? null;
  }

  async crear(datos: RecompensaFormData): Promise<void> {
    const { error } = await this.supabase.client.from('recompensas_puntos').insert(datos);
    if (error) throw new Error('No pudimos crear la recompensa.');
  }

  async actualizar(id: string, datos: RecompensaFormData): Promise<void> {
    const { error } = await this.supabase.client.from('recompensas_puntos').update(datos).eq('id', id);
    if (error) throw new Error('No pudimos actualizar la recompensa.');
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('recompensas_puntos').delete().eq('id', id);
    if (error) throw new Error('No pudimos eliminar la recompensa.');
  }

  async listarHistorialPropio(usuarioId: string): Promise<Canje[]> {
    const { data, error } = await this.supabase.client
      .from('canjes_puntos')
      .select('*, recompensa:recompensas_puntos(nombre)')
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false })
      .returns<Canje[]>();

    if (error) {
      console.error('Error al listar historial de canjes:', error);
      return [];
    }
    return data;
  }
}
