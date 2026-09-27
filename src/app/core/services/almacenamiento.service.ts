import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';

@Injectable({ providedIn: 'root' })
export class AlmacenamientoService {
  private readonly supabase = inject(SupabaseService);

  // "carpeta" separa pósters de películas y fotos de candy dentro del mismo
  // bucket público — más fácil de revisar a mano desde el dashboard de Supabase.
  async subirImagen(archivo: File, carpeta: 'peliculas' | 'candy'): Promise<string> {
    const extension = archivo.name.split('.').pop() ?? 'jpg';
    const nombreArchivo = `${carpeta}/${crypto.randomUUID()}.${extension}`;

    const { error } = await this.supabase.client.storage.from('imagenes').upload(nombreArchivo, archivo, {
      cacheControl: '3600',
      upsert: false
    });

    if (error) throw new Error('No pudimos subir la imagen. Probá de nuevo.');

    const { data } = this.supabase.client.storage.from('imagenes').getPublicUrl(nombreArchivo);
    return data.publicUrl;
  }
}
