import { Component, effect, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import * as QRCode from 'qrcode';

export interface ButacaComprobante {
  fila: string;
  columna: number;
  esVip?: boolean;
}

// Ticket de entrada reutilizable: lo usa tanto la confirmación de compra
// (butacas.component) como "Mis películas" (para volver a ver una entrada
// ya comprada) — mismo aspecto en los dos lugares, un solo lugar para
// mantenerlo.
@Component({
  selector: 'app-comprobante-entrada',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './comprobante-entrada.component.html',
  styleUrl: './comprobante-entrada.component.scss'
})
export class ComprobanteEntradaComponent {
  readonly peliculaTitulo = input.required<string>();
  readonly fechaHora = input.required<string>();
  readonly sala = input.required<string>();
  readonly formato = input.required<string>();
  readonly idioma = input.required<string>();
  readonly butacas = input.required<ButacaComprobante[]>();
  readonly total = input.required<number>();
  readonly qrCode = input.required<string>();
  readonly estado = input<string>('Entrada válida');

  readonly qrImagenUrl = signal<string | null>(null);

  constructor() {
    // El QR se regenera cada vez que cambia el código (ej. al elegir otra
    // compra en "Mis películas") — es una imagen de verdad, no solo texto,
    // para que cualquier lector la pueda escanear.
    effect(() => {
      const codigo = this.qrCode();
      QRCode.toDataURL(codigo, { width: 220, margin: 1 }).then((url) => this.qrImagenUrl.set(url));
    });
  }
}
