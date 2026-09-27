export type AccionLog = 'crear_funcion' | 'eliminar_funcion' | 'validar_qr';

export interface LogActividad {
  id: string;
  usuario_id: string | null;
  accion: AccionLog;
  detalle: Record<string, unknown> | null;
  creado_en: string;
  usuario: { nombre: string; apellido: string } | null;
}
