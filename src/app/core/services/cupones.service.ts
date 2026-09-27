import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CondicionCupon, Cupon } from '../models/cupon.model';

export interface CuponFormData {
  codigo: string;
  porcentaje: number;
  condicion: CondicionCupon;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private readonly supabase = inject(SupabaseService);

  async listarTodos(): Promise<Cupon[]> {
    const { data, error } = await this.supabase.client
      .from('cupones')
      .select('*')
      .order('creado_en', { ascending: false })
      .returns<Cupon[]>();

    if (error) throw error;
    return data;
  }

  async crear(datos: CuponFormData): Promise<void> {
    const { error } = await this.supabase.client.from('cupones').insert(datos);
    if (error) throw new Error('No pudimos crear el cupón. ¿El código ya existe?');
  }

  async actualizar(id: string, datos: CuponFormData): Promise<void> {
    const { error } = await this.supabase.client.from('cupones').update(datos).eq('id', id);
    if (error) throw new Error('No pudimos actualizar el cupón.');
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('cupones').delete().eq('id', id);
    if (error) throw new Error('No pudimos eliminar el cupón.');
  }

  // true si el usuario ya tiene alguna compra activa registrada — la
  // condición "primera_compra" se apoya en esto, se haya detectado el
  // cupón solo o lo haya tipeado la persona a mano.
  async tieneComprasPrevias(usuarioId: string): Promise<boolean> {
    const { count, error } = await this.supabase.client
      .from('compras')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('estado', 'activa');

    if (error) {
      console.error('Error al chequear compras previas:', error);
      return true; // ante la duda, no regalamos el beneficio de "primera compra"
    }
    return (count ?? 0) > 0;
  }

  async buscarCuponBienvenida(usuarioId: string): Promise<Cupon | null> {
    if (await this.tieneComprasPrevias(usuarioId)) return null;
    return this.buscarPorCondicion('primera_compra');
  }

  async buscarPorCondicion(condicion: CondicionCupon): Promise<Cupon | null> {
    const { data, error } = await this.supabase.client
      .from('cupones')
      .select('*')
      .eq('condicion', condicion)
      .eq('activo', true)
      .limit(1)
      .maybeSingle<Cupon>();

    if (error) {
      console.error('Error al buscar cupón por condición:', error);
      return null;
    }
    return data ?? null;
  }

  // Para cuando el cliente escribe un código a mano en el checkout.
  // ilike (sin %) hace la comparación case-insensitive, para no exigirle
  // al usuario que respete mayúsculas/minúsculas exactas.
  async buscarPorCodigo(codigo: string): Promise<Cupon | null> {
    const { data, error } = await this.supabase.client.from('cupones').select('*').ilike('codigo', codigo.trim()).maybeSingle<Cupon>();

    if (error) {
      console.error('Error al buscar cupón por código:', error);
      return null;
    }
    return data ?? null;
  }
}
