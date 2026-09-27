import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { Formato, FuncionConDetalle, FuncionConSala, Idioma, Sala } from '../models/funcion.model';

export interface DatosNuevaFuncion {
  peliculaId: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  duracionMin: number; // de la película, para calcular el buffer
  formato: Formato;
  idioma: Idioma;
  precioBase: number;
  precioVip: number;
  esPreventa?: boolean;
  precioPreventa?: number | null;
  fechaAperturaPreventa?: string | null; // ISO — se calcula como fecha_estreno - 7 días
}

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  private readonly supabase = inject(SupabaseService);

  async listarPorPelicula(peliculaId: string): Promise<FuncionConSala[]> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: true })
      .returns<FuncionConSala[]>();

    if (error) throw error;
    return data;
  }

  async listarTodasConDetalle(): Promise<FuncionConDetalle[]> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, sala:salas(id, nombre), pelicula:peliculas(titulo)')
      .order('fecha_hora', { ascending: true })
      .returns<FuncionConDetalle[]>();

    if (error) throw error;
    return data;
  }

  async obtenerPorId(id: string): Promise<FuncionConSala | null> {
    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('*, sala:salas(id, nombre)')
      .eq('id', id)
      .maybeSingle<FuncionConSala>();

    if (error) throw error;
    return data ?? null;
  }

  // El corazón de la regla de negocio (quién queda libre, con 30 min de
  // buffer según la duración de la película) vive en la función de
  // Postgres `crear_funcion_automatica` (docs/migraciones/007_rpc_admin.sql):
  // así el cálculo + el insert son una única transacción atómica en el
  // servidor, sin ventana para que dos funciones creadas casi al mismo
  // tiempo terminen asignadas a la misma sala.
  async crear(datos: DatosNuevaFuncion): Promise<Sala> {
    const fechaHoraIso = new Date(`${datos.fecha}T${datos.hora}`).toISOString();

    const { data: salaId, error } = await this.supabase.client.rpc('crear_funcion_automatica', {
      p_pelicula_id: datos.peliculaId,
      p_fecha_hora: fechaHoraIso,
      p_duracion_min: datos.duracionMin,
      p_formato: datos.formato,
      p_idioma: datos.idioma,
      p_precio_base: datos.precioBase,
      p_precio_vip: datos.precioVip,
      p_es_preventa: datos.esPreventa ?? false,
      p_precio_preventa: datos.precioPreventa ?? null,
      p_fecha_apertura_preventa: datos.fechaAperturaPreventa ?? null
    });

    if (error) throw new Error(error.message || 'No pudimos crear la función.');

    const { data: sala, error: errorSala } = await this.supabase.client
      .from('salas')
      .select('id, nombre')
      .eq('id', salaId as string)
      .single<Sala>();

    if (errorSala) throw new Error('La función se creó, pero no pudimos confirmar en qué sala quedó.');
    return sala;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('funciones').delete().eq('id', id);
    if (error) throw new Error('No se pudo eliminar: probablemente ya tenga entradas vendidas.');
  }

  // Para mostrar "Preventa desde $X" en la tarjeta de "Próximamente" — si
  // una película tiene más de una función en preventa con precios
  // distintos, se muestra el más bajo.
  async listarPreciosPreventaPorPelicula(peliculaIds: string[]): Promise<Map<string, number>> {
    if (peliculaIds.length === 0) return new Map();

    const { data, error } = await this.supabase.client
      .from('funciones')
      .select('pelicula_id, precio_preventa')
      .in('pelicula_id', peliculaIds)
      .eq('es_preventa', true)
      .not('precio_preventa', 'is', null)
      .returns<{ pelicula_id: string; precio_preventa: number }[]>();

    if (error) {
      console.error('Error al leer precios de preventa:', error);
      return new Map();
    }

    const mapa = new Map<string, number>();
    for (const fila of data) {
      const actual = mapa.get(fila.pelicula_id);
      if (actual === undefined || fila.precio_preventa < actual) {
        mapa.set(fila.pelicula_id, fila.precio_preventa);
      }
    }
    return mapa;
  }
}
