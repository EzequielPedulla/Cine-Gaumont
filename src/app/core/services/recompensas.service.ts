import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Canje, Recompensa, TipoRecompensa } from '../models/recompensa.model';

export interface RecompensaFormData {
  nombre: string;
  tipo: TipoRecompensa;
  puntos_requeridos: number;
  valor: number;
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

  // Resta puntos, suma crédito y registra el canje en una sola transacción
  // — ver el RPC canjear_puntos (docs/migraciones/020) para el detalle.
  async canjear(recompensaId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('canjear_puntos', { p_recompensa_id: recompensaId });
    if (error) throw new Error(error.message || 'No pudimos canjear esta recompensa.');
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
