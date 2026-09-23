export type Formato = '2D' | '3D' | '4D' | '5D';
export type Idioma = 'castellano' | 'subtitulada';

export interface Sala {
  id: string;
  nombre: string;
}

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: string;
  fecha_hora: string;
  formato: Formato;
  idioma: Idioma;
  precio_base: number;
  precio_vip: number;
  es_preventa: boolean;
  precio_preventa: number | null;
  fecha_apertura_preventa: string | null;
  creada_en: string;
}

export interface FuncionConSala extends Funcion {
  sala: Sala;
}

export interface FuncionConDetalle extends FuncionConSala {
  pelicula: { titulo: string };
}
