import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { CategoriaCandy, ProductoCandy, ProductoCandyConCategoria } from '../models/candy.model';

export interface ProductoCandyFormData {
  categoria_id: string | null;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CandyService {
  private readonly supabase = inject(SupabaseService);

  async listarCategorias(): Promise<CategoriaCandy[]> {
    const { data, error } = await this.supabase.client.from('categorias_candy').select('*').order('nombre').returns<CategoriaCandy[]>();
    if (error) throw error;
    return data;
  }

  async crearCategoria(nombre: string): Promise<void> {
    const { error } = await this.supabase.client.from('categorias_candy').insert({ nombre });
    if (error) throw new Error('No pudimos crear la categoría. ¿Ya existe una con ese nombre?');
  }

  async eliminarCategoria(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('categorias_candy').delete().eq('id', id);
    if (error) throw new Error('No pudimos eliminar la categoría.');
  }

  async listarProductosTodos(): Promise<ProductoCandyConCategoria[]> {
    const { data, error } = await this.supabase.client
      .from('productos_candy')
      .select('*, categoria:categorias_candy(id, nombre)')
      .order('nombre')
      .returns<ProductoCandyConCategoria[]>();
    if (error) throw error;
    return data;
  }

  async listarProductosActivos(): Promise<ProductoCandy[]> {
    const { data, error } = await this.supabase.client
      .from('productos_candy')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .returns<ProductoCandy[]>();
    if (error) throw error;
    return data;
  }

  async crear(datos: ProductoCandyFormData): Promise<void> {
    const { error } = await this.supabase.client.from('productos_candy').insert(datos);
    if (error) throw new Error('No pudimos crear el producto.');
  }

  async actualizar(id: string, datos: ProductoCandyFormData): Promise<void> {
    const { error } = await this.supabase.client.from('productos_candy').update(datos).eq('id', id);
    if (error) throw new Error('No pudimos actualizar el producto.');
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('productos_candy').delete().eq('id', id);
    if (error) throw new Error('No se pudo eliminar: probablemente ya se vendió en alguna compra.');
  }
}
