export type EstadoButaca = 'reservada' | 'vendida';

export interface ReservaButaca {
  id: string;
  funcion_id: string;
  fila: string;
  columna: number;
  estado: EstadoButaca;
  compra_id: string | null;
  reservada_en: string;
}

export type EstadoCompra = 'activa' | 'cancelada' | 'validada';

export interface Compra {
  id: string;
  usuario_id: string | null;
  funcion_id: string;
  cupon_id: string | null;
  credito_usado: number;
  puntos_ganados: number;
  subtotal: number;
  total: number;
  qr_code: string;
  qr_valido: boolean;
  estado: EstadoCompra;
  creada_en: string;
}

export interface CompraConDetalle extends Compra {
  funcion: {
    fecha_hora: string;
    formato: string;
    idioma: string;
    sala: { nombre: string };
    pelicula: { titulo: string; imagen_url: string | null };
  };
  reservas_butacas: { fila: string; columna: number }[];
}
