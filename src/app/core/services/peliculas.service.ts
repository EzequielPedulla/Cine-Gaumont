import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Genero, PeliculaConGeneros } from '../models/pelicula.model';

// Fila cruda que devuelve Supabase al pedir la película con sus géneros
// anidados a través de la tabla intermedia pelicula_generos.
interface PeliculaRow {
  id: string;
  titulo: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string | null;
  clasificacion_edad: 13 | 18 | null;
  activa: boolean;
  fecha_estreno: string | null;
  creada_en: string;
  pelicula_generos: { generos: Genero }[];
}

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private readonly supabase = inject(SupabaseService);

  async listarActivas(): Promise<PeliculaConGeneros[]> {
    const { data, error } = await this.supabase.client
      .from('peliculas')
      .select('*, pelicula_generos(generos(id, nombre))')
      .eq('activa', true)
      .order('creada_en', { ascending: false })
      .returns<PeliculaRow[]>();

    if (error) throw error;

    return data.map(this.aplanarGeneros);
  }

  async obtenerPorId(id: string): Promise<PeliculaConGeneros | null> {
    const { data, error } = await this.supabase.client
      .from('peliculas')
      .select('*, pelicula_generos(generos(id, nombre))')
      .eq('id', id)
      .maybeSingle<PeliculaRow>();

    if (error) throw error;
    if (!data) return null;

    return this.aplanarGeneros(data);
  }

  private aplanarGeneros(fila: PeliculaRow): PeliculaConGeneros {
    const { pelicula_generos, ...pelicula } = fila;
    return { ...pelicula, generos: pelicula_generos.map((pg) => pg.generos) };
  }
}
