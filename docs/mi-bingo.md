# Mi Bingo v1.1 · implementación local

## Qué incluye

- Sin cuenta: crear una sala de 30 cartones, QR, pantalla pública, rondas ilimitadas y recuperación del organizador.
- Con cuenta: 50 cartones e historial en el espacio propio. Una sala activa por cuenta, incluso entre espacios.
- Una sala activa por identidad anónima. No se crean usuarios ni espacios al jugar sin registro.
- Vincular una sala anónima conserva su código, QR, jugadores, cartones, bolillas, premios, rondas, ganadores y estado. La operación es atómica e idempotente. Si la cuenta tiene otra sala activa, informa el conflicto y conserva ambas.
- La ampliación es inmediata; los jugadores nuevos siguen entrando solo antes de una ronda o entre rondas.
- Logo y reutilización de configuraciones quedan para otra entrega. El historial y las reglas de juego de v1 se conservan.

## Probar en local

API y web: `npm run dev:api` y `npm run dev:web`. En esta entrega: http://localhost:5174/mi-bingo y API http://localhost:3000.

1. Abre Mi Bingo sin sesión, escribe el evento y pulsa Crear bingo gratis. No se pide ningún dato personal.
2. Comparte el enlace del QR con otro perfil/navegador. Escribe el nombre del jugador para recibir su cartón.
3. Inicia ronda, sortea y marca/desmarca. Recargar conserva cartón y marcas; una nueva ronda limpia marcas y conserva los números.
4. Recarga el navegador del organizador o vuelve a /mi-bingo: recupera la sala con la credencial local. La partida no depende de mantener una pestaña abierta.
5. Abre Guardar acceso de recuperación, genera un enlace y cópialo a un lugar privado. Ábrelo en otro navegador/dispositivo. Recupera la misma sala y revoca el acceso administrativo del navegador anterior. El enlace se consume; genera otro para futuras recuperaciones.
6. Generar otro enlace invalida el anterior. Revocar enlace invalida solo la recuperación y conserva el administrador actual. No compartas ese enlace con jugadores.
7. Abre Amplía a 50 gratis y regístrate o inicia sesión. Se vuelve a la sala; selecciona el espacio propio y pulsa Vincular esta sala y ampliar a 50. Si no tienes espacios, utiliza Crear mi espacio; el registro existente normalmente ya crea el personal. No se crean duplicados automáticamente.
8. Verifica el contador /50, el mismo QR y la misma partida. El control pasa a tu cuenta; las credenciales anónimas anteriores dejan de autorizar.
9. Usa Pantalla pública y prueba ¡BINGO! desde jugadores. El primer bingo válido congela sorteos, admite empates hasta el cierre manual y nunca usa las marcas del cliente como prueba.

### Dos dispositivos físicos

localhost solo funciona en el equipo que sirve la aplicación. Para probar con celulares en la misma red, sirve Vite en la IP local (`node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5174`, desde web), configura VITE_API_URL con la dirección accesible de API y CORS_ORIGIN con el origen del frontend; reinicia ambos servicios. En HTTP de LAN el navegador puede restringir el portapapeles; si falla Copiar, selecciona y copia el enlace manualmente. Para publicación usa HTTPS. Las variables ya existen; esta versión no añade variables nuevas.

En un despliegue HTTPS, abre /mi-bingo en el primer dispositivo y comparte únicamente el QR público con los jugadores. El segundo dispositivo del organizador usa el enlace privado, no el QR de jugadores. Recuperar al organizador no recupera la identidad de un jugador que cambie de navegador: esa identidad continúa guardada en su dispositivo.

## Caducidad y retención

- Sala anónima esperando/entre rondas: 24 horas desde la última acción administrativa real.
- Ronda activa/resolviendo: hasta 7 días sin acciones administrativas. Una desconexión temporal no cierra la sala.
- Al vencer el plazo, el acceso se bloquea. El mantenimiento cancela la ronda abandonada y finaliza la sala antes de cualquier eliminación.
- Sala finalizada manualmente: 7 días de retención desde el cierre. La recuperación o regeneración de enlaces no prolonga esa retención.
- Sala caducada: eliminación tras 7 días adicionales desde su vencimiento. No se permite recuperarla durante esa retención.
- Consultas, polling, jugadores y reclamaciones no cuentan como actividad administrativa. Sorteos, inicio/cierre de ronda y gestión real de recuperación sí cuentan.
- El panel muestra la fecha aplicable. Los eventos vinculados a cuentas no caducan por esta política.
- El proceso de API ejecuta una limpieza al arrancar y cada hora, en lotes de hasta 100 salas. Revalida propiedad, estado y fechas bajo bloqueo transaccional. Es idempotente y funciona con varias instancias. Si Render está suspendido, la eliminación física se pospone al siguiente arranque; el acceso caducado sigue bloqueado por fecha.

## Seguridad y persistencia

PostgreSQL es la fuente de verdad. Salas, cartones, rondas, bolillas ordenadas y ganadores son persistentes. Los límites se comprueban con la sala bloqueada dentro de la transacción; reconectar no asigna otro cartón ni depende de conexiones abiertas. Las salas antiguas con más de 50 conservan sus participantes, con capacidad heredada y sin incorporaciones adicionales.

El organizador anónimo y la recuperación usan secretos distintos de 256 bits generados con Web Crypto; el servidor almacena solo hashes. La credencial administrativa local se envía por POST, nunca en enlaces públicos. El enlace de recuperación lleva el secreto en el fragmento #; se retira antes de las peticiones y se consume mediante POST. Un reintento con la misma credencial nueva recupera una respuesta perdida sin reusar permisos antiguos. Empezar otro evento invalida el enlace de recuperación del evento previo.

El QR y los enlaces públicos no incluyen credenciales. El estado público muestra nombres de ganadores y datos de juego; inscritos y cartones completos se limitan a sus accesos respectivos. Las marcas se guardan en el navegador por participante/ronda y no intervienen en la validación del servidor.

Rate limiting básico por IP/proceso y límite por identidad son protecciones proporcionales, no una defensa distribuida ni garantía de rendimiento. Los límites de participación admiten Wi-Fi compartida. No se han probado 30/50 dispositivos físicos simultáneos.

## Migración y eventual despliegue

Nueva migración aditiva: `api/prisma/migrations/202610210001_bingo_guest/migration.sql`. Hace opcionales propietario/espacio, añade identidad anónima, capacidad y fechas; conserva tablas y datos. Mantiene el índice parcial por usuario y añade otro por identidad anónima.

Aplicada únicamente a PostgreSQL local y cliente Prisma regenerado. Para un despliegue posterior autorizado, desde api:

```text
npm run db:migrate:deploy
npm run db:generate
npm start
```

Conservar HTTPS, CORS_ORIGIN y DATABASE_URL existentes. En Windows, detener la API antes de regenerar Prisma si mantiene la DLL bloqueada. Los rewrites existentes /mi-bingo y /bingo cubren la recuperación por fragmento; no se necesita una ruta con secretos.

v1.1 publicada el 21/10/2026 con autorización del usuario. Commit f4c04ab en main; web pública verificada con Crear bingo gratis y API POST /api/bingo/guest/current verificada con HTTP 200 y room:null para una credencial inexistente. Sin crear usuarios ni salas de prueba en producción.

## Comprobaciones

```text
npm run test:bingo --prefix api
npm run test:bingo:ui --prefix api
npm run build --prefix web
```

Las pruebas crean un esquema PostgreSQL temporal solo en localhost/mi0 y lo eliminan al terminar. Incluyen las reglas de v1, creación sin cuenta, permisos, 30/50 exactos con concurrencia, reconexión estando lleno, 25 jugadores y 38 bolillas recuperados desde otro proceso, enlaces revocados/de un uso, transferencia concurrente/idempotente y sin pérdida, conflicto de salas y limpieza de vencidos sin afectar rondas vigentes ni registrados.

La prueba UI usa Chrome y el puerto temporal 5176: creación anónima, recarga, ingreso de jugador, sorteo, recuperación desde otro contexto, eliminación del fragmento, rechazo del acceso anterior y registro con vuelta a la misma sala /50. Capturas en web/test-results/bingo. Datos aislados, sin cuentas ni salas añadidas a la instalación habitual.

Lint focalizado: desde web, `node node_modules/eslint/bin/eslint.js src/microapps/mi-bingo src/services/bingo.js src/App.jsx`. La regresión completa de otras microapps y pruebas de carga quedan pendientes; se mantiene el alcance de pruebas mínimas solicitado.

## Archivos principales

- api/bingo/service.js, guest.js, retention.js y routes/bingo.js: permisos, transferencia, recuperación y caducidad sin reemplazar el motor de juego.
- api/prisma/schema.prisma y migración: identidad anónima y restricciones.
- web/src/microapps/mi-bingo/GuestManager.jsx: creación libre, recuperación y vinculación con UI existente.
- web/src/services/bingo.js y App.jsx: transporte, almacenamiento de credenciales y registro/retorno.
- api/bingo/guest.test-cases.js y ui-smoke.cjs: pruebas focalizadas.
