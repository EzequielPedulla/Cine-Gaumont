export type RolUsuario = 'cliente' | 'empleado' | 'admin';

export interface UsuarioPerfil {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  puntos_fidelidad: number;
  credito_disponible: number;
  rol: RolUsuario;
  creado_en: string;
}
