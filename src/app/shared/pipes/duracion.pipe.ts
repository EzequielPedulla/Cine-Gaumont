import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duracion' })
export class DuracionPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    if (minutos == null) return '';

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (horas === 0) return `${resto}min`;
    return `${horas}h ${resto.toString().padStart(2, '0')}min`;
  }
}
