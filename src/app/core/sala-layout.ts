// Todas las salas del cine tienen el mismo layout fijo (según la consigna),
// así que se genera acá en vez de guardarlo en la base: 20 filas (A-T),
// 3 columnas por fila (4/20/4 butacas), las filas J y K son accesibles
// (2/10/2) y las últimas 3 filas (R, S, T) son VIP.

export type TipoButaca = 'normal' | 'vip' | 'accesible';

export interface Butaca {
  fila: string;
  columna: number;
  tipo: TipoButaca;
}

export interface FilaSala {
  fila: string;
  tipo: TipoButaca;
  butacas: Butaca[];
  // Las butacas agrupadas en sus 3 bloques (izquierda/centro/derecha), para
  // poder dibujar el pasillo entre bloques en el template sin lógica extra.
  bloques: Butaca[][];
}

const FILAS_ACCESIBLES = new Set(['J', 'K']);
const FILAS_VIP = new Set(['R', 'S', 'T']);
const LETRAS_FILAS = 'ABCDEFGHIJKLMNOPQRST'.split('');

export function generarLayoutSala(): FilaSala[] {
  return LETRAS_FILAS.map((fila) => {
    const tipo: TipoButaca = FILAS_VIP.has(fila) ? 'vip' : FILAS_ACCESIBLES.has(fila) ? 'accesible' : 'normal';
    const [bloqueIzq, bloqueCentro, bloqueDer] = tipo === 'accesible' ? [2, 10, 2] : [4, 20, 4];
    const totalColumnas = bloqueIzq + bloqueCentro + bloqueDer;

    const butacas: Butaca[] = Array.from({ length: totalColumnas }, (_, i) => ({
      fila,
      columna: i + 1,
      tipo
    }));

    const bloques = [butacas.slice(0, bloqueIzq), butacas.slice(bloqueIzq, bloqueIzq + bloqueCentro), butacas.slice(bloqueIzq + bloqueCentro)];

    return { fila, tipo, butacas, bloques };
  });
}
