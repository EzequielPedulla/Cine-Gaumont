export type CondicionCupon = 'ninguna' | 'primera_compra' | 'mayor_50';

export interface Cupon {
  id: string;
  codigo: string;
  porcentaje: number;
  condicion: CondicionCupon;
  activo: boolean;
  creado_en: string;
}
