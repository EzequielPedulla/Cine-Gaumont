import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Genero } from '../models/pelicula.model';

@Injectable({ providedIn: 'root' })
export class GenerosService {
  private readonly supabase = inject(SupabaseService);

  async listarTodos(): Promise<Genero[]> {
    const { data, error } = await this.supabase.client.from('generos').select('*').order('nombre').returns<Genero[]>();

    if (error) throw error;
    return data;
  }
}
