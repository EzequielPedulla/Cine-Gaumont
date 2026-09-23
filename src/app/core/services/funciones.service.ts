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
      p_precio_vip: datos.precioVip
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
}
