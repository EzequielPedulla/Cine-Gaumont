
TP Programación IV
					Alumno: Pedulla Ezequiel
Título del Proyecto
Sistema Web de  Gestion de cine  Gaumont
 Objetivos del Proyecto
    1. Permitir a los clientes consultar la cartelera, elegir una función y comprar entradas de forma online, evitando la espera en boletería. 
    2. Brindar a la administración del cine una herramienta para gestionar películas, funciones, salas y butacas de manera centralizada. 
Actores del sistema
Cliente (compra entradas, consulta cartelera) y Administrador (carga películas, funciones, salas, ve reportes).

Requerimientos funcionales
    • RF-01: El sistema debe permitir al administrador dar de alta, modificar y eliminar películas. 
    • RF-02: El sistema debe mostrar a los clientes la cartelera vigente con sus funciones disponibles. 
    • RF-03: El sistema debe permitir al cliente seleccionar butacas libres para una función y confirmar la compra. 
    • RF-04: El sistema debe emitir un comprobante/entrada con los datos de la compra. 
    • RF-05: El sistema debe permitir al administrador generar reportes de ventas y ocupación.

Requerimientos no funcionales
    • RNF-01: El sistema debe evitar que dos clientes compren la misma butaca en simultáneo (concurrencia). 
    • RNF-02: El frontend debe desarrollarse en Angular. 
    • RNF-03: El sistema debe poder ejecutarse en un entorno local para las demostraciones de la cursada. 
    • RNF-04: La interfaz debe ser utilizable sin necesitar instrucciones previas (usabilidad básica). 



Fases Principales del Proyecto 
El alcance comprende:
    1. Gestión de Películas y Cartelera 
        ◦ Alta, baja y modificación de películas (título, género, duración, clasificación, sinopsis). 
        ◦ Visualización de la cartelera vigente para los clientes. 
    2. Gestión de Funciones y Salas 
        ◦ Alta de funciones (película, sala, horario, fecha). 
        ◦ Definición de salas y su mapa de butacas. 
    3. Compra de Entradas 
        ◦ Búsqueda de función, selección de butacas disponibles, confirmación y pago. 
        ◦ Emisión de la entrada con los datos de película, sala, horario y asiento. 
    4. Gestión de Usuarios 
        ◦ Registro y login de clientes. 
        ◦ Perfil de administrador/empleado con permisos distintos a los del cliente. 
    5. Reportes 
        ◦ Reporte de funciones más vendidas, ocupación por sala y recaudación por período. 

