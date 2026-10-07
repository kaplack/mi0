# Sorteos Avanzado

Microapp gratuita con cuenta: guarda participantes, premios y resultados por espacio. Publicar un enlace de resultados cuesta **S/4.90**, pagados por Yape y verificados manualmente.

## Uso

1. Abrir Sorteos Avanzado desde el home e iniciar sesión o crear una cuenta.
2. Crear un sorteo en el espacio personal o abrirlo desde el espacio elegido en Mi0.
3. Agregar entre 2 y 1000 participantes y entre 1 y 50 premios; no más premios que participantes.
4. Guardar el borrador. Puede editarse antes de realizar el sorteo.
5. Realizar el sorteo. La API determina y guarda todos los ganadores antes de animarlos. Cada ganador permanece visible hasta pulsar «Continuar con el siguiente premio»; al terminar, pulsar «Ver todos los resultados».
6. Consultar los resultados guardados. No se permite volver a sortear ni editar datos de un sorteo realizado.
7. Opcionalmente, pulsar «Publicar y compartir». El modal muestra el precio S/4.90, los datos de Yape y el campo de operación. Solo se cierra automáticamente si el envío funciona; un error conserva la operación para reintentar.
8. El superadmin verifica el pago y aprueba o rechaza la solicitud.
9. Después de aprobar, copiar el enlace público /s/:code.

No se admiten nombres repetidos (ignorando mayúsculas y espacios exteriores). Si dos personas tienen el mismo nombre, deben distinguirse con un apellido o identificador. Cada entrada representa un participante y gana como máximo un premio. No se verifica la identidad real de las personas.

Desde los resultados, «Repetir sorteo» prepara un nuevo borrador con el nombre marcado como copia, los mismos participantes y premios. Puede editarse antes de guardar y realizarse; conserva los resultados del sorteo original.

## Estados y privacidad

El sorteo usa DRAFT o COMPLETED. La publicación tiene solicitudes independientes PENDING, APPROVED o REJECTED; un rechazo permite registrar una nueva operación. Cada referencia de pago es única, incluidas las referencias rechazadas.

El precio se fija en el servidor en 490 céntimos PEN. Aprobar la publicación no ejecuta un nuevo sorteo. El código público es aleatorio y único; solo funciona para sorteos publicados en espacios activos.

La página pública muestra nombre, fecha del sorteo, cantidad de participantes, premios y nombres de los ganadores. No muestra el creador, su correo, referencias de pago ni la lista completa de participantes.

Miembros del espacio pueden consultar. OWNER y ADMIN pueden crear, editar borradores, sortear y solicitar publicación. SUPERADMIN puede consultar solicitudes pendientes y aprobar/rechazar pagos. Los espacios inactivos no pueden usarse para estas operaciones.

## Configuración

En el entorno de la API:

~~~dotenv
YAPE_PHONE=
YAPE_NAME=
~~~

Definir el número receptor y el nombre que aparece en Yape. Si falta uno, se permite crear/sortear/guardar pero no solicitar publicación.

Los frontends usan la variable VITE_API_URL existente. En local, configurar http://localhost:3000. El CORS_ORIGIN de la API debe incluir los orígenes de web y superadmin (por ejemplo localhost:5173 y localhost:5174).

No se necesita S3, una pasarela de pagos ni imágenes de comprobantes.

## Migración y despliegue

La migración nueva es 202610070003_advanced_raffles. Crea cinco tablas, enums, claves foráneas, restricciones de ganadores únicos, referencia de pago única y una sola solicitud pendiente por sorteo. Añade Sorteos Avanzado al catálogo de módulos sin borrar datos existentes.

~~~powershell
npm run db:generate --prefix api
npm run db:migrate:deploy --prefix api
~~~

Los scripts llaman explícitamente a Node para evitar que Windows confunda la CLI con api/prisma.js.

**Producción requiere aplicar la migración en su entorno antes de usar la nueva API y configurar YAPE_PHONE/YAPE_NAME.** La implementación y las verificaciones solo migraron mi0 local; no se accedió a Neon. El push de Git no sustituye la migración.

web/vercel.json dirige /s/:code a index.html para permitir abrir enlaces públicos directamente. En otro hosting SPA se necesita una regla equivalente.

## Archivos y API

- api/raffles/: reglas, validación, precio/configuración y pruebas.
- api/routes/raffles.js: contratos HTTP reutilizando sesión y rol existentes.
- api/app.js: composición de Express y manejo JSON de errores.
- web/src/services/raffles.js: transporte mediante el cliente API existente.
- web/src/microapps/sorteos-avanzado/: hook, pantallas privada/pública y animación de resultados persistidos.
- superadmin/src/Publications.jsx: revisión de publicaciones.

| Método y ruta bajo /api/raffles | Acceso |
|---|---|
| GET /?workspaceId=:id | Miembro de espacio activo |
| POST / | OWNER/ADMIN |
| GET /:id | Miembro de espacio activo |
| PUT /:id | OWNER/ADMIN; solo borradores |
| POST /:id/draw | OWNER/ADMIN; repetición devuelve resultados existentes |
| GET /config | Autenticado |
| POST /:id/publication | OWNER/ADMIN; operación Yape y precio fijo |
| GET /publications/pending | SUPERADMIN |
| POST /publications/:id/review | SUPERADMIN; acción approve/reject y motivo si rechaza |
| GET /public/:code | Público; solo resultados publicados |

## Verificación

~~~powershell
npm run test:raffles --prefix api
npm run lint --prefix web
npm run build --prefix web
npm run lint --prefix superadmin
npm run build --prefix superadmin
~~~

Las pruebas de integración requieren DATABASE_URL apuntando a mi0 en localhost. Crean un esquema temporal exclusivo, aplican todas las migraciones y prueban HTTP real contra PostgreSQL; al terminar eliminan ese esquema. No borran tablas de public ni acceden a Neon.

Se verificaron seis casos: permisos/espacios inactivos, validación, concurrencia e inmutabilidad de resultados, rechazo/nueva solicitud/aprobación concurrente y privacidad pública, no reutilización de pagos y relaciones entre resultados/participantes del mismo sorteo.

Además se comprobó el recorrido de navegador completo en escritorio y móvil, incluido registro/login, borrador, animación, pago de prueba, aprobación y enlace anónimo. Se usaron y eliminaron cuentas y sorteos temporales; no se realizaron pagos reales.

## Pendientes operativos

- Configurar variables Yape y aplicar la migración en producción cuando se autorice el despliegue.
- Validar uso real y disposición a pagar S/4.90.
- La verificación de depósitos es manual; informar al usuario cuándo se revisarán.
