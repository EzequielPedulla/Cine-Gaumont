import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// Selects propios de día/mes/año (mail 28/02: la consigna pide evitar el
// input type="date" nativo). Recibe los FormControl ya creados por el
// formulario padre — así se enchufa directo con [formControl] sin
// necesitar un ControlValueAccessor propio, y un mismo componente sirve
// tanto para "fecha de nacimiento" (registro) como para "fecha de función"
// y "hasta" (admin-funciones).
@Component({
  selector: 'app-selector-fecha',
  imports: [ReactiveFormsModule],
  templateUrl: './selector-fecha.component.html',
  styleUrl: './selector-fecha.component.scss'
})
export class SelectorFechaComponent {
  readonly controlDia = input.required<FormControl<number | null>>();
  readonly controlMes = input.required<FormControl<number | null>>();
  readonly controlAnio = input.required<FormControl<number | null>>();
  readonly anios = input.required<number[]>();

  readonly dias = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];
}
