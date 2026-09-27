import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ComprasService } from '../../core/services/compras.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { CompraConDetalle } from '../../core/models/compra.model';
import { ComprobanteEntradaComponent } from '../../shared/ui/comprobante-entrada/comprobante-entrada.component';

function esVip(fila: string): boolean {
  return fila >= 'R';
}

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

@Component({
  selector: 'app-mis-compras',
  imports: [DatePipe, CurrencyPipe, ComprobanteEntradaComponent],
  templateUrl: './mis-compras.component.html',
  styleUrl: './mis-compras.component.scss'
})
export class MisComprasComponent {
  private readonly comprasService = inject(ComprasService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly compras = signal<CompraConDetalle[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly cancelandoId = signal<string | null>(null);
  readonly compraAbiertaId = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    const usuarioId = this.authService.session()?.user.id;
    if (!usuarioId) return;

    this.cargando.set(true);
    this.error.set(null);
    try {
      this.compras.set(await this.comprasService.listarPorUsuario(usuarioId));
    } catch {
      this.error.set('No pudimos cargar tus compras.');
    } finally {
      this.cargando.set(false);
    }
  }

  toggleEntrada(compraId: string): void {
    this.compraAbiertaId.set(this.compraAbiertaId() === compraId ? null : compraId);
  }

  butacasParaTicket(compra: CompraConDetalle) {
    return compra.reservas_butacas.map((b) => ({ ...b, esVip: esVip(b.fila) }));
  }

  // Mismo margen de 2hs que valida el RPC del lado del servidor — acá es
  // solo para no mostrar un botón "Cancelar" que va a fallar seguro.
  puedeCancelar(compra: CompraConDetalle): boolean {
    if (compra.estado !== 'activa') return false;
    const inicio = new Date(compra.funcion.fecha_hora).getTime();
    return inicio - Date.now() > DOS_HORAS_MS;
  }

  async cancelar(compra: CompraConDetalle): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar(
      `¿Cancelar la compra de "${compra.funcion.pelicula.titulo}"? No se devuelve el dinero, pero te queda como crédito para tu próxima compra.`
    );
    if (!confirmado) return;

    this.cancelandoId.set(compra.id);
    this.error.set(null);
    try {
      await this.comprasService.cancelar(compra.id);
      await this.cargar();
      await this.authService.recargarPerfil();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cancelar la compra.');
    } finally {
      this.cancelandoId.set(null);
    }
  }
}
