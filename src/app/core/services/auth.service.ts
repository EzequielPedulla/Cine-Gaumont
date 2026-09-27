import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthError, Session } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';
import { UsuarioPerfil } from '../models/usuario.model';

export interface DatosRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string; // formato ISO: YYYY-MM-DD
}

// Supabase devuelve los mensajes de error en inglés y bastante técnicos.
// Los traducimos a algo que un usuario final pueda entender.
const MENSAJES_AUTH: Record<string, string> = {
  'User already registered': 'Ese email ya está registrado. Iniciá sesión en cambio.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'El formato del email no es válido.',
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'Email not confirmed': 'Tenés que confirmar tu email antes de ingresar.'
};

function mensajeAmigable(error: unknown, fallback: string): string {
  if (error instanceof AuthError && MENSAJES_AUTH[error.message]) {
    return MENSAJES_AUTH[error.message];
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly perfil = signal<UsuarioPerfil | null>(null);
  readonly cargandoSesion = signal(true);

  readonly estaLogueado = computed(() => this.session() !== null);
  readonly esAdmin = computed(() => this.perfil()?.rol === 'admin');
  readonly esEmpleado = computed(() => this.perfil()?.rol === 'empleado' || this.esAdmin());

  constructor() {
    this.supabase.client.auth.getSession().then(async ({ data }) => {
      this.session.set(data.session);
      // Esperamos a que el perfil (de donde sale esAdmin) esté cargado
      // ANTES de marcar la sesión como resuelta — si no, un guard que
      // espera cargandoSesion=false puede leer esAdmin() todavía en false.
      if (data.session) await this.cargarPerfil(data.session.user.id);
      this.cargandoSesion.set(false);
    });

    this.supabase.client.auth.onAuthStateChange((_evento, session) => {
      this.session.set(session);
      if (session) {
        this.cargarPerfil(session.user.id);
      } else {
        this.perfil.set(null);
      }
    });
  }

  async registrarse(datos: DatosRegistro): Promise<void> {
    // nombre/apellido/fecha_nacimiento viajan como metadata del signUp: un
    // trigger en la base (docs/migraciones/008) los lee y crea la fila de
    // usuarios_perfil en la misma transacción en la que se crea el usuario
    // — así no puede quedar un usuario de Auth sin perfil asociado.
    const { data, error } = await this.supabase.client.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          fecha_nacimiento: datos.fechaNacimiento
        }
      }
    });
    if (error) {
      throw new Error(mensajeAmigable(error, 'No pudimos completar el registro. Intentá de nuevo.'));
    }
    if (!data.user) {
      throw new Error('No pudimos completar el registro. Intentá de nuevo.');
    }

    await this.cargarPerfil(data.user.id);
  }

  async iniciarSesion(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(mensajeAmigable(error, 'No pudimos iniciar sesión. Intentá de nuevo.'));
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.supabase.client.auth.signOut();
  }

  // Para cuando algo cambia el perfil por fuera de un evento de auth (ej.
  // los puntos de fidelidad que acredita el trigger de una compra): sin
  // esto, el signal `perfil` quedaría desactualizado hasta el próximo
  // login o F5.
  async recargarPerfil(): Promise<void> {
    const usuarioId = this.session()?.user.id;
    if (usuarioId) await this.cargarPerfil(usuarioId);
  }

  private async cargarPerfil(usuarioId: string): Promise<void> {
    const { data } = await this.supabase.client.from('usuarios_perfil').select('*').eq('id', usuarioId).maybeSingle<UsuarioPerfil>();
    this.perfil.set(data ?? null);
  }
}
