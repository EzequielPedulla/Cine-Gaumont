import { Injectable, signal } from '@angular/core';

export interface SolicitudConfirmacion {
  mensaje: string;
  resolver: (confirmado: boolean) => void;
}

// Reemplaza el confirm() nativo del navegador por un diálogo propio.
// El componente <app-confirm-dialog/> (montado una sola vez en AppComponent)
// se suscribe a `solicitud` y lo renderiza; cualquier servicio/componente
// puede pedir confirmación con `await confirmDialog.confirmar('¿Seguro?')`.
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly solicitud = signal<SolicitudConfirmacion | null>(null);

  confirmar(mensaje: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.solicitud.set({
        mensaje,
        resolver: (confirmado) => {
          this.solicitud.set(null);
          resolve(confirmado);
        }
      });
    });
  }
}
