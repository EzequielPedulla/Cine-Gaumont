export interface Combo {
  id: string;
  nombre: string;
  precio_fijo: number;
  activo: boolean;
}

export interface ComboItemDetalle {
  producto_id: string;
  cantidad: number;
  producto: { nombre: string } | null;
}

export interface ComboConItems extends Combo {
  items: ComboItemDetalle[];
}
