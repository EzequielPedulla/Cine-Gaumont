import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Combo, ComboConItems } from '../models/combo.model';

export interface ComboFormData {
  nombre: string;
  precio_fijo: number;
  activo: boolean;
}

export interface ComboItemFormData {
  producto_id: string;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class CombosService {
  private readonly supabase = inject(SupabaseService);

  async listarTodos(): Promise<ComboConItems[]> {
    const { data, error } = await this.supabase.client
      .from('combos')
      .select('*, items:combo_items(producto_id, cantidad, producto:productos_candy(nombre))')
      .order('nombre')
      .returns<ComboConItems[]>();
    if (error) throw error;
    return data;
  }

  async listarActivos(): Promise<ComboConItems[]> {
    const { data, error } = await this.supabase.client
      .from('combos')
      .select('*, items:combo_items(producto_id, cantidad, producto:productos_candy(nombre))')
      .eq('activo', true)
      .order('precio_fijo')
      .returns<ComboConItems[]>();
    if (error) throw error;
    return data;
  }

  async crear(datos: ComboFormData): Promise<Combo> {
    const { data, error } = await this.supabase.client.from('combos').insert(datos).select().single<Combo>();
    if (error) throw new Error('No pudimos crear el combo.');
    return data;
  }

  async actualizar(id: string, datos: ComboFormData): Promise<void> {
    const { error } = await this.supabase.client.from('combos').update(datos).eq('id', id);
    if (error) throw new Error('No pudimos actualizar el combo.');
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('combos').delete().eq('id', id);
    if (error) throw new Error('No se pudo eliminar: probablemente ya se vendió en alguna compra.');
  }

  // Se borran todos los productos del combo y se cargan de nuevo — más
  // simple y menos propenso a bugs que comparar item por item qué cambió.
  async reemplazarItems(comboId: string, items: ComboItemFormData[]): Promise<void> {
    const { error: errorBorrar } = await this.supabase.client.from('combo_items').delete().eq('combo_id', comboId);
    if (errorBorrar) throw new Error('No pudimos actualizar los productos del combo.');

    if (items.length === 0) return;

    const { error: errorCrear } = await this.supabase.client
      .from('combo_items')
      .insert(items.map((item) => ({ combo_id: comboId, producto_id: item.producto_id, cantidad: item.cantidad })));
    if (errorCrear) throw new Error('No pudimos actualizar los productos del combo.');
  }
}
