export interface ReporteDiario {
  fecha: string;
  entradas_vendidas: number;
  total_facturado: number;
}

export interface VentaPeliculaPorFecha {
  pelicula_id: string;
  titulo: string;
  fecha: string;
  entradas_vendidas: number;
}

export interface VentaPelicula {
  pelicula_id: string;
  titulo: string;
  entradas_vendidas: number;
}

export interface CandyVenta {
  producto_id: string;
  nombre: string;
  unidades_vendidas: number;
}
