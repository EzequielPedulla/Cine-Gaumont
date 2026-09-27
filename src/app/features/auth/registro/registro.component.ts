import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SelectorFechaComponent } from '../../../shared/ui/selector-fecha/selector-fecha.component';

function passwordsIgualesValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmar = control.get('confirmarPassword')?.value;
  return password && confirmar && password !== confirmar ? { passwordsDistintas: true } : null;
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, SelectorFechaComponent],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly errorMsg = signal<string | null>(null);

  private readonly anioActual = new Date().getFullYear();
  readonly anios = Array.from({ length: 100 }, (_, i) => this.anioActual - i);

  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      dia: [null as number | null, Validators.required],
      mes: [null as number | null, Validators.required],
      anio: [null as number | null, Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', Validators.required]
    },
    { validators: passwordsIgualesValidator }
  );

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, apellido, dia, mes, anio, email, password } = this.form.getRawValue();
    const fechaNacimiento = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    this.enviando.set(true);
    this.errorMsg.set(null);
    try {
      await this.authService.registrarse({ nombre, apellido, fechaNacimiento, email, password });
      this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMsg.set(error instanceof Error ? error.message : 'No pudimos completar el registro. Intentá de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }
}
