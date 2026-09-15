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
    this.supabase.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      if (data.session) this.cargarPerfil(data.session.user.id);
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
    const { data, error } = await this.supabase.client.auth.signUp({
      email: datos.email,
      password: datos.password
    });
    if (error) {
      throw new Error(mensajeAmigable(error, 'No pudimos completar el registro. Intentá de nuevo.'));
    }
    if (!data.user) {
      throw new Error('No pudimos completar el registro. Intentá de nuevo.');
    }

    const { error: errorPerfil } = await this.supabase.client.from('usuarios_perfil').insert({
      id: data.user.id,
      nombre: datos.nombre,
      apellido: datos.apellido,
      fecha_nacimiento: datos.fechaNacimiento
    });
    if (errorPerfil) {
      throw new Error('Creamos tu cuenta pero no pudimos guardar tu perfil. Escribinos si el problema persiste.');
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

  private async cargarPerfil(usuarioId: string): Promise<void> {
    const { data } = await this.supabase.client.from('usuarios_perfil').select('*').eq('id', usuarioId).maybeSingle<UsuarioPerfil>();
    this.perfil.set(data ?? null);
  }
}
