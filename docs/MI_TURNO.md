# Mi Turno

## Pantallas y enlaces

- Configuración: /mi-turno/{workspaceId}/configuracion. Requiere OWNER o ADMIN.
- Operación: /mi-turno/{workspaceId}/operacion. Disponible al personal del espacio activo.
- Monitor público: /turno/{code}/pantalla. Sin sesión; muestra tickets y ventanillas.
- Cliente: /turno/{code}. Conserva el enlace del QR ya impreso.

Mi Turno aparece en el panel Mi0 del espacio seleccionado. Desde operación
se puede abrir configuración o el monitor en otra pestaña.

## Configuración

El nombre del cliente es siempre obligatorio. El negocio elige si el documento
no se solicita (NONE) o es obligatorio (REQUIRED), mediante el check «Solicitar documento de identidad».
Se admite DNI o carnet de extranjería; la API valida el formato y la política.
No se consulta un registro oficial de identidad.

Se configura entre 1 y 99 ventanillas, cada una con un nombre distinto de
hasta 60 caracteres. No se puede quitar una ventanilla que tiene un turno
llamado sin finalizar antes su atención.

El documento se guarda en el turno y se muestra al administrador o al operador de la ventanilla que atiende al cliente. Las respuestas públicas, incluido el ticket del
cliente, no contienen nombres de otros clientes, documentos ni claves.
Desactivar la solicitud de documentos evita capturarlos en nuevos turnos;
no elimina los documentos de los turnos previos.

## Operación

El administrador puede elegir cualquier ventanilla. El operador (MEMBER) atiende únicamente la que tiene asignada; sin asignación no puede operar. La API valida esta regla al llamar, finalizar y marcar ausente.
El personal llama al siguiente turno y debe finalizar la atención o marcar
al cliente como ausente antes de llamar otro. Se puede finalizar el último
turno aunque la cola esté vacía. Los turnos no se reparten dos veces ante
llamadas simultáneas: las acciones comparten el bloqueo transaccional de la cola.

## QR e impresión

Configuración permite descargar un cartel PNG de 1600 × 2000 píxeles, con el nombre del negocio, la indicación para escanear, el QR y powered by mi0.app. Incluye fondo blanco
y margen para escaneo. No requiere S3 ni un servicio externo.
Para imprimir el cartel definitivo, abrir configuración desde la dirección
pública que usarán los clientes. Un QR con localhost no funciona desde sus teléfonos.

## Cierre manual

OWNER y ADMIN pueden cerrar la jornada después de confirmar. Vencen todos
los turnos pendientes y llamados del espacio; los atendidos se conservan.
El cliente ve el vencimiento y puede tomar un nuevo turno desde el mismo navegador.

El cierre no cambia el QR ni reinicia la numeración. No bloquea nuevas
inscripciones: un turno posterior al cierre inicia la siguiente jornada.
No hay vencimiento automático por fecha; se debe cerrar cada jornada.

## Migración y desarrollo

La migración 20261008090000_turno_screens añade configuración de documentos,
nombres de ventanillas y campos de documento opcionales en los turnos.
Mantiene válidas las referencias de los turnos existentes a sus ventanillas.

Desde la raíz, para otros entornos:

    npm run db:migrate:deploy --prefix api
    npm run db:generate --prefix api

Detener la API antes de regenerar Prisma si Windows tiene bloqueada su DLL.
Después volver a iniciar la API.

## Comprobaciones

    npm run lint --prefix web
    npm run build --prefix web

La prueba HTTP de la API usa un esquema temporal independiente en localhost/mi0;
aplica migraciones en ese esquema y lo elimina al finalizar, sin alterar los datos
del negocio. Incluye política de documentos, privacidad, permisos, concurrencia,
finalización y cierre manual:

    node --test api/routes/turnos.test.js

Las pruebas de navegador usan respuestas simuladas. Requieren Chrome instalado
y la web corriendo en localhost:5173; verifican escritorio y móvil:

    npm run test:turnos:ui --prefix web

Para una revisión manual mínima: configurar ventanillas y documento, tomar
un turno desde el enlace cliente, llamar y finalizarlo desde operación,
y abrir el enlace del monitor público.

## Navegación de mi0

El panel usa un sidebar colapsable en escritorio y desplegable en móvil.
Operación es la vista inicial. Configuración y QR y cartel son secciones separadas;
el cartel vive en /mi-turno/{workspaceId}/qr. El monitor se abre en otra pestaña.
El cierre de jornada está al pie del sidebar. Reportes figura como próximamente;
aún no existe un servicio de reportes de pago.

## Operadores e invitaciones por correo

En Operadores, OWNER y ADMIN ingresan el correo y la ventanilla:

- Si la cuenta ya pertenece al espacio, la asignación es inmediata.
- Si la cuenta no pertenece al espacio (exista o no en mi0), se genera un enlace.
- El operador abre el enlace, inicia sesión o crea su cuenta con el correo invitado
  y confirma la aceptación. Se añade una membresía MEMBER y su ventanilla.
- Cada persona puede tener una ventanilla por negocio. Cada ventanilla admite un solo operador; una invitación vigente también la reserva. Los administradores conservan sus permisos existentes.
- Operadores pueden abrir Operación, QR y cartel y el monitor público.
  No pueden configurar, gestionar operadores ni cerrar la jornada.

Los enlaces vencen en 7 días y son de un solo uso. Regenerarlos invalida el
anterior. Pueden cancelarse. La base guarda únicamente el hash del enlace.
No se envían correos automáticamente: el administrador copia y comparte el enlace.

Para cambiar o quitar un operador hay que finalizar antes la atención de su
ventanilla. No se pueden eliminar ventanillas con operadores asignados o
invitaciones vigentes. Quitar la asignación bloquea atención; conserva la
membresía del negocio para el acceso a QR y cartel.

Las acciones de asignación y atención comparten el bloqueo de la cola para
evitar que una petición simultánea eluda la reasignación. Los documentos de
turnos de otras ventanillas no se entregan al operador.

La migración 20261008120000_turno_operators añade las tablas TurnOperator y
TurnInvitation y registra quién llamó cada turno mediante calledById.
No asigna automáticamente ventanillas a miembros existentes.

Comprobación mínima de ambos casos y los permisos:

    node --test --test-name-pattern "operator invitations" api/routes/turnos.test.js

### Tiempos para reportes

Cada turno conserva `createdAt` (registro), `calledAt` (llamado), `servedAt`
(atención completada) y `endedAt` (finalización, ausencia o vencimiento).
Espera hasta el llamado: `calledAt - createdAt`. Duración de una atención
completada: `servedAt - calledAt`; incluye el tiempo para acercarse a la
ventanilla. Ausentes y vencidos no se incluyen en el promedio de atención.
Un cierre asigna el mismo `endedAt` a todos los turnos pendientes de esa
jornada. Los registros históricos sin fecha conocida permanecen en null;
la migración recupera `endedAt` únicamente cuando existe `servedAt`.


### Dashboard contratado

Ruta `/mi-turno/:workspaceId/dashboard`, exclusiva para OWNER/ADMIN.
Todo el Dashboard requiere pago vigente por negocio: mensual S/10 (un mes
calendario) o anual S/79 (12 meses calendario). Ambos incluyen las mismas
funciones. No hay renovación automática; aprobar una renovación suma su
periodo desde el vencimiento actual o desde la aprobación si ya venció.
Los meses se calculan en hora de Lima, ajustando al último día disponible.

Reutiliza `YAPE_PHONE` y `YAPE_NAME` de la API. Si faltan, muestra los planes
pero no admite solicitudes de pago. El administrador del negocio registra
el número de operación; el superadmin verifica el depósito real en Yape y
aprueba o rechaza en «Pagos de Dashboard». Una solicitud pendiente no da
acceso. Precios y vigencia los decide el servidor. Solo una solicitud
pendiente por negocio; referencias únicas dentro de pagos de Dashboard.
Aprobaciones concurrentes no extienden dos veces el mismo pago.

API: `GET /api/turnos/workspace/:id/dashboard/subscription`,
`POST /api/turnos/workspace/:id/dashboard/payments` (`plan`: MONTHLY/ANNUAL,
`reference`), `GET /api/turnos/workspace/:id/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`.
Superadmin: `GET /api/turnos/dashboard/payments/pending` y
`POST /api/turnos/dashboard/payments/:id/review` (`action`: approve/reject,
`reason` obligatorio al rechazar). Estadísticas sin vigencia: HTTP 402.

Los filtros incluyen los turnos registrados en ambas fechas, hasta 366 días,
en America/Lima. Resultados por estado actual, incluyendo pendientes.
Espera promedio usa turnos llamados con tiempos válidos; atención promedio
solo SERVED con tiempos válidos. Se muestra el tamaño de las muestras y
se excluyen tiempos históricos incompletos. Demanda por hora usa la hora
de registro; las ventanillas usan los nombres de configuración actuales.
CSV exporta resumen, desglose por ventanilla y demanda por hora, sin nombres
ni documentos de clientes. El historial sigue guardándose sin suscripción;
al vencer se bloquean los datos del Dashboard, no la operación diaria.

Migración: `npm run db:migrate:deploy --prefix api` y
`npm run db:generate --prefix api`. Verificación focalizada:
`node --test --test-name-pattern "paid dashboard" api/routes/turnos.test.js`
y `npm run test:turnos:ui --prefix web -- dashboard.spec.js`.

Vista previa local: `TURN_DASHBOARD_PREVIEW=true` en `api/.env` permite
ver estadísticas sin pago, exclusivamente fuera de producción y con
PostgreSQL en localhost. Conserva permisos OWNER/ADMIN y no altera pagos
ni vigencias. Desactivar con `TURN_DASHBOARD_PREVIEW=false`.
