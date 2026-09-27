export type TipoRecompensa = 'entrada' | 'producto_candy';

export interface Recompensa {
  id: string;
  nombre: string;
  tipo: TipoRecompensa;
  producto_id: string | null;
  puntos_requeridos: number;
  valor: number;
  activo: boolean;
}

export interface Canje {
  id: string;
  usuario_id: string;
  recompensa_id: string;
  puntos_gastados: number;
  creado_en: string;
  recompensa: { nombre: string };
}
