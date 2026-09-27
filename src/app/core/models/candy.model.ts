export interface CategoriaCandy {
  id: string;
  nombre: string;
}

export interface ProductoCandy {
  id: string;
  categoria_id: string | null;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
}

export interface ProductoCandyConCategoria extends ProductoCandy {
  categoria: CategoriaCandy | null;
}

export interface ItemCandySeleccionado {
  producto: ProductoCandy;
  cantidad: number;
}
