import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import { ReservaButaca } from '../models/compra.model';

export interface ButacaSeleccionada {
  fila: string;
  columna: number;
}

export interface DatosCompra {
  funcionId: string;
  butacas: ButacaSeleccionada[];
  usuarioId: string | null;
  subtotal: number;
  total: number;
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

    const { data: compra, error: errorCompra } = await this.supabase.client
      .from('compras')
      .insert({
        usuario_id: datos.usuarioId,
        funcion_id: datos.funcionId,
        subtotal: datos.subtotal,
        total: datos.total,
        qr_code: qrCode
      })
      .select()
      .single();

    if (errorCompra) {
      // El detalle técnico queda en consola para nosotros; al cliente le
      // mostramos un mensaje que pueda entender, no el error crudo de Postgres.
      console.error('Error al insertar en compras:', errorCompra);
      throw new Error('No pudimos generar la compra. Volvé a intentar en un momento; si el problema sigue, contactanos.');
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

    return { compraId: compra.id, qrCode };
  }
}
