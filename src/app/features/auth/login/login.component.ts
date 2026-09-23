import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly errorMsg = signal<string | null>(null);

  // Atajo solo para desarrollo local: nunca se muestra en el sitio
  // desplegado, sin importar el build, porque se fija en el hostname real
  // del navegador (no en una bandera que podría quedar mal configurada).
  readonly esHostLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.enviando.set(true);
    this.errorMsg.set(null);
    try {
      await this.authService.iniciarSesion(email, password);
      this.router.navigateByUrl('/');
    } catch (error) {
      this.errorMsg.set(error instanceof Error ? error.message : 'No pudimos iniciar sesión. Intentá de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }

  async entrarComoAdminDev(): Promise<void> {
    this.enviando.set(true);
    this.errorMsg.set(null);
    try {
      await this.authService.iniciarSesion('admin@gmail.com', 'admin123');
      this.router.navigateByUrl('/admin');
    } catch (error) {
      this.errorMsg.set(error instanceof Error ? error.message : 'No pudimos iniciar sesión.');
    } finally {
      this.enviando.set(false);
    }
  }
}
