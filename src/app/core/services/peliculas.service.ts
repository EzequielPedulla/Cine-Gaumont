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

export interface PeliculaFormData {
  titulo: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string | null;
  clasificacion_edad: 13 | 18 | null;
  activa: boolean;
  fecha_estreno: string | null;
  generoIds: string[];
}

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private readonly supabase = inject(SupabaseService);

  // Ordenada por entradas vendidas (mail 16/01: "que se muestren primero
  // las 3 películas más vendidas") — dentro de la cartelera, no altera el
  // filtro por fecha_estreno que ya separa "en cartelera" de "próximamente"
  // en el componente.
  async listarActivas(): Promise<PeliculaConGeneros[]> {
    const [{ data, error }, ventas] = await Promise.all([
      this.supabase.client
        .from('peliculas')
        .select('*, pelicula_generos(generos(id, nombre))')
        .eq('activa', true)
        .returns<PeliculaRow[]>(),
      this.obtenerVentasPorPelicula()
    ]);

    if (error) throw error;

    return data
      .map(this.aplanarGeneros)
      .sort((a, b) => (ventas.get(b.id) ?? 0) - (ventas.get(a.id) ?? 0) || b.creada_en.localeCompare(a.creada_en));
  }

  private async obtenerVentasPorPelicula(): Promise<Map<string, number>> {
    const { data, error } = await this.supabase.client
      .from('pelicula_ventas')
      .select('pelicula_id, entradas_vendidas')
      .returns<{ pelicula_id: string; entradas_vendidas: number }[]>();

    if (error) {
      console.error('Error al leer pelicula_ventas:', error);
      return new Map();
    }
    return new Map(data.map((fila) => [fila.pelicula_id, fila.entradas_vendidas]));
  }

  // Para el admin: trae todas, incluidas las inactivas.
  async listarTodas(): Promise<PeliculaConGeneros[]> {
    const { data, error } = await this.supabase.client
      .from('peliculas')
      .select('*, pelicula_generos(generos(id, nombre))')
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

  async crear(datos: PeliculaFormData): Promise<void> {
    const { data: pelicula, error } = await this.supabase.client
      .from('peliculas')
      .insert(this.aFilaPelicula(datos))
      .select('id')
      .single();

    if (error) throw new Error('No pudimos crear la película.');

    await this.sincronizarGeneros(pelicula.id, datos.generoIds);
  }

  async actualizar(id: string, datos: PeliculaFormData): Promise<void> {
    const { error } = await this.supabase.client.from('peliculas').update(this.aFilaPelicula(datos)).eq('id', id);

    if (error) throw new Error('No pudimos actualizar la película.');

    await this.sincronizarGeneros(id, datos.generoIds);
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('peliculas').delete().eq('id', id);

    if (error) {
      throw new Error('No se pudo eliminar: probablemente tenga funciones (o entradas vendidas) asociadas. Probá desactivarla en cambio.');
    }
  }

  private aFilaPelicula(datos: PeliculaFormData) {
    return {
      titulo: datos.titulo,
      sinopsis: datos.sinopsis,
      duracion_min: datos.duracion_min,
      imagen_url: datos.imagen_url || null,
      clasificacion_edad: datos.clasificacion_edad,
      activa: datos.activa,
      fecha_estreno: datos.fecha_estreno || null
    };
  }

  // Delete + insert viven en la función de Postgres `sincronizar_generos_pelicula`
  // (docs/migraciones/007_rpc_admin.sql) como una única transacción — si el
  // insert fallara, el delete se deshace solo en vez de dejar la película
  // sin géneros.
  private async sincronizarGeneros(peliculaId: string, generoIds: string[]): Promise<void> {
    const { error } = await this.supabase.client.rpc('sincronizar_generos_pelicula', {
      p_pelicula_id: peliculaId,
      p_genero_ids: generoIds
    });

    if (error) throw new Error('No pudimos actualizar los géneros de la película.');
  }

  private aplanarGeneros(fila: PeliculaRow): PeliculaConGeneros {
    const { pelicula_generos, ...pelicula } = fila;
    return { ...pelicula, generos: pelicula_generos.map((pg) => pg.generos) };
  }
}
