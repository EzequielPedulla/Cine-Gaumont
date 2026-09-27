import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { ResultadoValidacion } from '../models/validacion.model';

@Injectable({ providedIn: 'root' })
export class ValidacionService {
  private readonly supabase = inject(SupabaseService);

  // Toda la lógica (permiso, código único, entrada ya usada) vive en el RPC
  // `validar_entrada` (docs/migraciones/015) — acá solo se invoca.
  async validarEntrada(codigo: string): Promise<ResultadoValidacion> {
    const { data, error } = await this.supabase.client.rpc('validar_entrada', { p_codigo: codigo }).single<ResultadoValidacion>();

    if (error) throw new Error(error.message || 'No pudimos validar esa entrada.');
    return data;
  }
}
