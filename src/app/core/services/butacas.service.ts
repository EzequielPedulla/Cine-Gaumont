import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { ReservaButaca } from '../models/compra.model';

export interface ButacaSeleccionada {
  fila: string;
  columna: number;
}

export interface CandySeleccionado {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface DatosCompra {
  funcionId: string;
  butacas: ButacaSeleccionada[];
  usuarioId: string | null;
  cuponId: string | null;
  subtotal: number;
  total: number;
  creditoUsado: number;
  candyItems: CandySeleccionado[];
}

export interface CompraConfirmada {
  compraId: string;
  qrCode: string;
}

@Injectable({ providedIn: 'root' })
export class ButacasService {
  private readonly supabase = inject(SupabaseService);

  async listarOcupadas(funcionId: string): Promise<ReservaButaca[]> {
    const { data, error } = await this.supabase.client.from('reservas_butacas').select('*').eq('funcion_id', funcionId);

    if (error) throw error;
    return data;
  }

  // Devuelve una función para desuscribirse; el componente la llama en su
  // hook de destrucción para no dejar el canal de Realtime abierto.
  suscribirseACambios(funcionId: string, alCambiar: () => void): () => void {
    const canal = this.supabase.client
      .channel(`butacas-funcion-${funcionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas_butacas', filter: `funcion_id=eq.${funcionId}` }, alCambiar)
      .subscribe();

    return () => {
      this.supabase.client.removeChannel(canal);
    };
  }

  async confirmarCompra(datos: DatosCompra): Promise<CompraConfirmada> {
    const qrCode = crypto.randomUUID();

    // 1 punto de fidelidad por cada peso gastado, solo si hay usuario
    // registrado (no en compras anónimas). El trigger `acreditar_puntos_compra`
    // (docs/migraciones/012) es el que realmente suma esto a
    // usuarios_perfil.puntos_fidelidad al insertarse la compra.
    const puntosGanados = datos.usuarioId ? Math.floor(datos.total) : 0;

    const { data: compra, error: errorCompra } = await this.supabase.client
      .from('compras')
      .insert({
        usuario_id: datos.usuarioId,
        funcion_id: datos.funcionId,
        cupon_id: datos.cuponId,
        subtotal: datos.subtotal,
        total: datos.total,
        credito_usado: datos.creditoUsado,
        puntos_ganados: puntosGanados,
        qr_code: qrCode
      })
      .select()
      .single();

    if (errorCompra) {
      // El detalle técnico queda en consola para nosotros; al cliente le
      // mostramos un mensaje que pueda entender, no el error crudo de Postgres.
      // Si el trigger aplicar_credito_usado (022) rechaza la compra por no
      // alcanzar el crédito, el error llega acá con ese mensaje puntual.
      console.error('Error al insertar en compras:', errorCompra);
      throw new Error(errorCompra.message?.includes('crédito') ? errorCompra.message : 'No pudimos generar la compra. Volvé a intentar en un momento; si el problema sigue, contactanos.');
    }

    const { error: errorButacas } = await this.supabase.client.from('reservas_butacas').insert(
      datos.butacas.map((butaca) => ({
        funcion_id: datos.funcionId,
        fila: butaca.fila,
        columna: butaca.columna,
        estado: 'vendida' as const,
        compra_id: compra.id
      }))
    );

    if (errorButacas) {
      // Alguien compró alguna de estas butacas justo antes que nosotros:
      // revertimos la compra para no dejar un registro huérfano sin asientos.
      await this.supabase.client.from('compras').delete().eq('id', compra.id);
      throw new Error('Una o más butacas ya fueron compradas por otra persona. Elegí de nuevo.');
    }

    if (datos.candyItems.length > 0) {
      const { error: errorCandy } = await this.supabase.client.from('compra_candy_items').insert(
        datos.candyItems.map((item) => ({
          compra_id: compra.id,
          producto_id: item.productoId,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario
        }))
      );

      if (errorCandy) {
        // Mismo criterio que con las butacas: si el candy no se pudo
        // cargar, no dejamos una compra a medias — se revierte todo
        // (el delete en cascada de reservas_butacas/compra_candy_items
        // está definido en el schema con on delete cascade sobre compras).
        console.error('Error al insertar candy en la compra:', errorCandy);
        await this.supabase.client.from('compras').delete().eq('id', compra.id);
        throw new Error('No pudimos agregar el candy a tu compra. Probá de nuevo.');
      }
    }

    return { compraId: compra.id, qrCode };
  }
}
