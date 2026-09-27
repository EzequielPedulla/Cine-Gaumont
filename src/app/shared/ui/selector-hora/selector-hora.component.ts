import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// Selects propios de hora/minuto (mismo criterio que selector-fecha: evitar
// el input type="time" nativo). Minutos de a 15 — no hace falta más
// precisión para programar una función de cine.
@Component({
  selector: 'app-selector-hora',
  imports: [ReactiveFormsModule],
  templateUrl: './selector-hora.component.html',
  styleUrl: './selector-hora.component.scss'
})
export class SelectorHoraComponent {
  readonly controlHora = input.required<FormControl<number | null>>();
  readonly controlMinuto = input.required<FormControl<number | null>>();

  readonly horas = Array.from({ length: 24 }, (_, i) => i);
  readonly minutos = [0, 15, 30, 45];
}
