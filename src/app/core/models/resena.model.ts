export interface Resena {
  id: string;
  pelicula_id: string;
  usuario_id: string;
  autor_nombre: string;
  estrellas: number;
  comentario: string | null;
  creada_en: string;
}
