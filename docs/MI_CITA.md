# Mi Cita

Microapp de reservas integrada en cuentas y espacios de mi0.app. El paciente solicita una cita desde `/cita/:code`; el personal confirma o cancela desde `/mi-cita/:workspaceId`.

## Configuración y operación

1. Abrir **Mi Cita** desde Mi0 con un workspace activo.
2. El personal de gestión configura nombre, zona horaria (America/Lima por defecto), confirmación manual o vencimiento de 2/6/12/24 horas.
3. **Solicitar DNI al reservar** está desactivado por defecto. Si se activa, el paciente debe ingresar ocho dígitos. Sin la opción, no se muestra ni se almacena un DNI enviado por el cliente. Cambiarla no modifica citas existentes.
4. Crear profesionales con especialidad, duración de 10 a 240 minutos y bloques semanales, incluyendo mañana/tarde si se necesita. Desactivar o modificar horarios conserva las citas existentes; revisar la agenda y contactar pacientes afectados.
5. Descargar el QR PNG o copiar el enlace desde **QR y enlace**. Usar la dirección pública de la web para compartirlo con pacientes.
6. Administrador y asistente tienen acceso completo a Mi Cita y abren Agenda por defecto. Un MEMBER vinculado como profesional solo accede a sus citas y su QR. Los roles e invitaciones de otras microapps no se modifican.

La solicitud pública requiere nombre y teléfono con código de país; un celular peruano de nueve dígitos se normaliza con +51. El formulario nunca informa que una solicitud pendiente esté confirmada. La página de recepción actualiza el estado mientras permanece abierta. No se almacena información personal en URLs ni almacenamiento del navegador; al cerrar/recargar la página el consultorio sigue gestionando la solicitud por teléfono.

## Reglas de disponibilidad

- Horarios calculados en servidor con `Intl` en la zona del consultorio. Solo fechas desde hoy hasta 180 días adelante; turnos ajustados a duración del profesional.
- PENDING bloquea provisionalmente; CONFIRMED ocupa; CANCELLED/EXPIRED libera.
- Cada solicitud guarda `expiresAt = min(inicio de cita, creación + plazo)`; en modo manual vence al inicio. Cambiar el plazo afecta nuevas solicitudes.
- Consultar disponibilidad, agenda, recepción o gestionar citas vence solicitudes pasadas. El servidor ejecuta además una limpieza cada 60 segundos, incluso sin navegador abierto. Al consultar se aplica el reloj actual, sin esperar al proceso periódico.
- Configuración, profesionales, reservas y transiciones se serializan mediante advisory lock transaccional por workspace. Se vuelve a calcular disponibilidad dentro de la transacción.
- PostgreSQL rechaza cualquier solapamiento activo mediante una restricción de exclusión GiST. Profesionales distintos pueden atender en simultáneo.
- `requestKey` UUID v4 permite reintentar un envío sin crear dos citas. El endpoint de recepción usa ese identificador en POST y devuelve únicamente estado y horario.
- Agenda diaria y pendientes tienen páginas de hasta 100 registros, ordenadas por inicio e id.

## Arquitectura

Backend: `api/routes/citas.js` adapta HTTP; `api/citas/service.js` administra permisos, casos de uso y transacciones; `validation.js` valida entradas; `availability.js` convierte horarios y calcula espacios; `maintenance.js` limita solicitudes y ejecuta vencimientos. Usa el cliente Prisma y la autenticación existentes.

Frontend: `web/src/microapps/mi-cita/` contiene composición, navegación y pantallas separadas por responsabilidad. `useCitaData.js` conserva estado del servidor y mutaciones; `web/src/services/citas.js` encapsula escrituras HTTP. Los estilos `.cita-*` usan variables globales, sin importar CSS ni lógica de colas de Mi Turno. Sidebar desktop colapsable persistente; drawer de administrador y barra inferior de asistente hasta 760px.

## Persistencia y despliegue

Modelos independientes: CitaClinic, CitaProfessional, CitaSchedule y CitaAppointment; estados PENDING/CONFIRMED/CANCELLED/EXPIRED y fechas de cada transición. Claves compuestas impiden asociar una cita a un profesional de otro consultorio.

Migración: `20261008170000_mi_cita`. Agrega tablas, restricciones y el módulo `mi-cita`; no altera datos de Mi Turno/Sorteos. Requiere la extensión PostgreSQL **btree_gist**, instalada por la migración con `CREATE EXTENSION IF NOT EXISTS ... WITH SCHEMA public`; el usuario de migraciones debe poder instalarla o un administrador debe habilitarla previamente. No hay Redis ni servicios nuevos.

Antes de arrancar la API con esta versión:

```sh
npm run db:migrate:deploy --prefix api
npm run db:generate --prefix api
npm run build --prefix web
```

La API conserva DATABASE_URL, CORS_ORIGIN y la configuración existente. No necesita credenciales WhatsApp: usa enlaces `wa.me`. No se cambian bases remotas como parte del desarrollo/pruebas.

## Privacidad y protección

Solo miembros del workspace activo acceden a datos personales. OWNER/ADMIN y MEMBER sin vinculación profesional tienen acceso de gestión; los profesionales vinculados solo acceden a sus propias citas y no pueden cambiar configuración, profesionales ni invitaciones. Los endpoints públicos tienen respuestas explícitas sin datos de otros pacientes y `Cache-Control: no-store`. El DNI no aparece en el mensaje WhatsApp.

Límites públicos por IP: 180 peticiones/minuto; reservas 10 intentos/10 minutos por consultorio/IP. Los contadores tienen memoria acotada por proceso y no confían en `X-Forwarded-For`. Con varios procesos o un proxy, configurar límites en el ingress conservando la política de confianza del proxy; no se habilita `trust proxy` globalmente. El límite persistente por teléfono impide más de tres solicitudes pendientes o veinte solicitudes en 24 horas dentro del consultorio. Incluye un campo señuelo de formulario. No se registran nombre, DNI o teléfono en logs.

## Verificación reproducible

```sh
npm run test:citas --prefix api
npm run test:citas:ui --prefix web
npm run lint --prefix web
npm run build --prefix web
node --test api/routes/turnos.test.js
npm run test:raffles --prefix api
```

Las pruebas de citas solo aceptan PostgreSQL local `/mi0`; crean un esquema temporal aleatorio, aplican todas las migraciones y lo eliminan al terminar. No escriben citas/cuentas en el esquema de uso habitual. La extensión btree_gist puede permanecer instalada en public, sin datos de prueba.

La suite de navegador usa API real en 3002 y Vite en 5175, Chrome instalado y Playwright. `ui-server.cjs` crea su esquema y el teardown de Playwright detiene el proceso periódico y elimina esquema/fixture también en Windows; `.cita-fixture.json` contiene sesiones temporales y está ignorado por Git. El runner existente de Mi Turno excluye esta suite, que tiene su propia configuración. Si un cierre forzado interrumpe la limpieza, verificar y eliminar exclusivamente esquemas `mi0_citas_ui_*` generados para la ejecución, nunca el esquema public.

Fuera del alcance: pagos, historias clínicas, recordatorios, calendarios externos, reportes y monetización.

## Vista de próximos días

La Agenda incluye únicamente Próximos 7 días y Próximos 30 días, desde hoy según la zona horaria del consultorio. El rango inicial es 7 y la preferencia se guarda en el navegador. El filtro de profesional se aplica al resumen y a la agenda diaria. Pulsar una casilla selecciona su fecha y muestra las citas de ese día.

Las casillas verdes tienen citas confirmadas; las ámbar solo pendientes activas; las vacías no tienen citas activas. Un punto ámbar indica pendientes junto a confirmadas. El contador incluye ambas; canceladas y vencidas quedan fuera. Una casilla vacía no implica que el profesional atienda o tenga disponibilidad ese día.

GET /api/citas/workspace/:workspaceId/day-summary acepta days=7|30 y professionalId opcional. Verifica la pertenencia al workspace y agrega en PostgreSQL sin devolver datos personales ni aplicar el límite de paginación diaria. No requiere migración adicional. El resumen se actualiza cada 15 segundos y al confirmar/cancelar o pulsar Actualizar.

El selector manual de fecha se despliega desde «Ir a una fecha», para consultar fechas pasadas o fuera del resumen. El filtro de profesional permanece visible.

## Invitación de profesionales

En Profesionales, abrir «Invitar a ver su agenda», ingresar el correo y generar el enlace. Compartirlo manualmente; no se envía correo. El profesional abre /mi-cita/invitacion/:token, inicia sesión o se registra con ese correo y acepta. La aceptación crea la membresía MEMBER si falta y lo vincula al profesional ya configurado. Abre Mi agenda, puede confirmar/cancelar sus citas y descargar su QR/enlace con el profesional preseleccionado. No se agrega un sistema de cuentas ni roles globales nuevo.

El enlace vence en siete días, se almacena solo su hash y requiere aceptación explícita con el correo correcto. Generar otro enlace invalida el anterior. Solo hay una cuenta activa por profesional y una vinculación por cuenta en cada consultorio. Las cuentas OWNER/ADMIN del workspace mantienen la gestión y no pueden ser invitadas como profesionales.

Cancelar invitación invalida el enlace; Retirar acceso revoca la entrada a Mi Cita conservando citas y membresía del workspace. El registro de acceso revocado se mantiene para impedir que la cuenta obtenga permisos de gestión por omisión. Se puede invitar otra cuenta después. Desactivar la atención de un profesional conserva su acceso a las citas existentes; retirar acceso es una acción separada.

Migración adicional: 20261008180000_cita_professional_invitations. Agrega únicamente tablas de accesos/invitaciones, claves foráneas y unicidad de asignación activa. Ejecutar migrate deploy y db:generate también para esta ampliación. Aplicada únicamente a mi0 local/public; validada desde cero en esquemas aislados.

Verificación de la ampliación: 11 pruebas backend correctas (incluyen aislamiento, invitaciones concurrentes, registro, correo incorrecto, revocación, enlaces reemplazados/vencidos/cancelados). Un recorrido nuevo de navegador desktop con API/DB reales cubre generar invitación desde ficha, registro/aceptación, Mi agenda, confirmación propia, QR preseleccionado y revocación. Lint y build correctos. No se repitieron las suites visuales/mobile ni las regresiones de otras microapps; revisión visual a cargo del usuario.

Mi Cita muestra el nombre del consultorio en el selector de espacios, incluido el acceso por invitación, aunque el workspace compartido conserve otro nombre general. Al abrir /mi-cita se prioriza un consultorio configurado frente al espacio personal vacío. Aceptar comparte el workspace existente; no crea otra agenda ni copia profesionales.

En Mi0 principal, si el workspace conserva el nombre genérico «Mi espacio», el listado muestra el nombre del consultorio configurado. Se distingue así del espacio personal sin consultorio. Los nombres personalizados de workspace se conservan.

La migración 20261008190000_register_existing_turno_modules registra Mi Turno en el catálogo y asocia las colas ya configuradas a su workspace, preservando asociaciones explícitamente desactivadas y operadores. El setup de Mi Turno mantiene la asociación para nuevas configuraciones. Esto evita ocultar colas existentes tras filtrar Mis microapps por espacio. Aplicada a mi0 local; una prueba de configuración y la asignación real de Alan verificadas.

## Inicio y espacios propios

Inicio agrupa todos los espacios accesibles (propios e invitados) en tarjetas; Mis microapps solo incluye espacios cuyo rol de workspace es OWNER. Administradores invitados no se consideran propietarios. Cada acceso muestra icono y nombre y abre el workspace concreto. Los selectores internos de Mi Cita y Mi Turno se sustituyen por nombre/rol y Volver a Inicio.

En mi0 local se separó Cosa nostra del consultorio Podologo Jaiva conservando la cola, código QR público, registros e invitaciones, operadores y citas. El script explícito api/scripts/separate-turno-workspace.cjs recibe el UUID de origen y el nombre exacto de la cola; verifica localhost/mi0/public, bloquea y mueve la cola a un nuevo workspace copiando OWNER/ADMIN y operadores. No crea otra cola, no copia pacientes y no realiza separación automática de negocios. Los enlaces privados antiguos de Mi Turno usan el workspace anterior; entrar desde la tarjeta del nuevo espacio para obtener el acceso correcto. Los enlaces públicos de la cola conservan su código.
