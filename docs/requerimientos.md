# Requerimientos — Sistema de Cine (TP1 Programación IV)

Resumen de todo lo pedido en el intercambio de mails de la consigna (`docs/TP 1 - Programacion IV - 2026 C2.pdf`), agrupado por área. Sirve como checklist de alcance y como material de apoyo para la defensa oral.

## 1. Catálogo de películas

- El admin controla qué películas se muestran y cuándo (alta/baja/edición).
- Cada película tiene: nombre, imagen, sinopsis y duración.
- Formato configurable por función: 2D / 3D / 4D / 5D.
- Idioma configurable por función: castellano o subtitulada.
- Una película puede tener varios géneros.
- Buscador de películas con filtro por género (multi-selección).
- La página principal muestra primero las 3 películas más vendidas.
- Sistema de reseñas: cualquier usuario puede calificar con estrellas y dejar un comentario corto; se ve **antes** de sacar la entrada.
- Se muestra la puntuación promedio de cada película.
- Restricción de edad: algunas películas son +13, otras +18, otras sin restricción. No se puede comprar entrada si el usuario no cumple la edad; si la cumple, la entrada debe aclarar que debe ir acompañado de un adulto (cuando aplica la restricción).
- Sección "Próximamente": películas que se estrenan en las próximas semanas, con botón para activar alerta y notificar cuando se habilite la venta.
- Sección "Mis películas" (usuario logueado): historial visual de películas vistas, con póster, fecha y calificación propia.

## 2. Salas y funciones

- Es un único edificio con varias salas.
- Layout de sala original: 20 filas (A–T) x 3 columnas de 4, 20 y 4 butacas.
- Cambio posterior: se sacan las filas J y K (las dos del medio) y se reemplazan por una fila de butacas accesibles, quedando 2, 10 y 2 butacas por columna en esa fila.
- Butacas VIP: últimas 3 filas de cada sala (R, S, T), precio más alto, marcadas visualmente distinto; el usuario debe saber explícitamente que está comprando una butaca VIP antes de pagar.
- Butacas accesibles (filas J/K adaptadas) resaltadas visualmente distinto del resto.
- Mapa de butacas en tiempo real: si otro usuario está comprando al mismo tiempo, se tienen que ver sus butacas ocupadas al instante.
- El admin define horarios y días de cada función.
- Restricción de duración: no puede haber otra función en la misma sala hasta que pasen 30 minutos desde que terminó la función anterior (según la duración de la película).
- Asignación automática de sala: al definir una función recurrente (ej. "lunes, martes y viernes a las 18hs"), el sistema elige la sala automáticamente, garantizando que nunca haya dos funciones en la misma sala al mismo horario.

## 3. Compra de entradas

- Al comprar, se genera un PDF con los datos de la entrada y un código QR que se presenta para ingresar a la función.
- Se puede comprar sin estar registrado (compra anónima), siempre que se pague.
- Preventa configurable por película: se puede abrir la venta 7 días antes del estreno con un precio especial; una vez pasada esa fecha, el precio vuelve al normal.
- Cancelación de compra hasta 2 horas antes de la función: no se devuelve dinero, se otorga crédito en la cuenta del usuario, utilizable junto con otros métodos de pago en compras futuras.
- El QR deja de ser válido apenas se valida (uso único), tanto para la entrada del cine como para el retiro del candy bar.

## 4. Candy bar

- Productos (pochoclos, bebidas, etc.) organizados en categorías, gestionables desde el admin.
- Se pueden comprar junto con la entrada.
- El mismo QR de la entrada sirve para retirar los productos de candy.
- Combos especiales (ej. entrada + pochoclos + bebida) a precio fijo configurable desde el admin, destacados en la pantalla de compra.

## 5. Usuarios y registro

- Datos pedidos al registrarse: mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y cantidad de días de vacaciones por año.
- Beneficio por registrarse: cupón de 20% de descuento en la primera compra.
- No es obligatorio registrarse para comprar (se puede comprar como anónimo).

## 6. Cupones y programa de fidelización

- Cupón de bienvenida (primera compra): porcentaje configurable por el admin en cualquier momento.
- Cupones segmentados: por ejemplo, uno que aplique solo a usuarios mayores de 50 años.
- Puntos de fidelización: usuarios registrados ganan 1 punto por cada peso gastado en una compra.
- Los puntos se pueden canjear por entradas gratis o productos del candy bar; el admin configura cuántos puntos cuesta cada recompensa (ej. entrada = 500 pts, pochoclo grande = 150 pts).
- El usuario ve en su perfil cuántos puntos tiene y el historial de canjes.
- Los puntos no se pueden transferir entre usuarios.

## 7. Administración

- Usuario admin: control total sobre salas, funciones, distribución de butacas, productos del candy bar, cupones, puntos, etc.
- Usuarios empleados: pueden escanear el QR para validar entradas (cine) y retiro de candy; también pueden ingresar el código a mano si el lector falla.
- Reporte de facturación: cuánto se facturó por día y cuántas entradas se vendieron.
- Exportar reportes a PDF y a Excel.
- Gráfico de películas más vistas por semana y por mes.
- Reporte del producto de candy bar más vendido.
- Log de actividad: quién creó una función, quién modificó un precio, quién validó un QR — todo con fecha y hora.

## 8. No funcionales / UX

- Interfaces fáciles de navegar y entender, tanto para clientes como para empleados.
- Selectores de fecha/hora propios (evitar el date picker feo del navegador) y minimizar el scroll.
- Estilo visual único y producido (no genérico).
- Uso correcto de Angular (standalone, signals, reactive forms, control de flujo nativo) y buenas prácticas vistas en clase.
- Integración con Supabase (datos, auth, tiempo real).
- Integración PWA.
- Aplicación desplegada con URL funcional, código en GitHub, README con arquitectura y decisiones técnicas.
- Defensa oral de las decisiones tomadas — la aprobación/promoción depende de ella.
