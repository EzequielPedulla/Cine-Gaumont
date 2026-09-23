import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Sala } from '../models/funcion.model';

@Injectable({ providedIn: 'root' })
export class SalasService {
  private readonly supabase = inject(SupabaseService);

  async listarTodas(): Promise<Sala[]> {
    const { data, error } = await this.supabase.client.from('salas').select('*').order('nombre').returns<Sala[]>();

    if (error) throw error;
    return data;
  }

  async crear(nombre: string): Promise<void> {
    const { error } = await this.supabase.client.from('salas').insert({ nombre });
    if (error) throw new Error('No pudimos crear la sala (¿ya existe una con ese nombre?).');
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('salas').delete().eq('id', id);
    if (error) throw new Error('No se pudo eliminar: probablemente tenga funciones asociadas.');
  }
}
