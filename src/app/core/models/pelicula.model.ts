export interface Genero {
  id: string;
  nombre: string;
}

export interface Pelicula {
  id: string;
  titulo: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string | null;
  clasificacion_edad: 13 | 18 | null;
  activa: boolean;
  fecha_estreno: string | null;
  creada_en: string;
}

export interface PeliculaConGeneros extends Pelicula {
  generos: Genero[];
}
