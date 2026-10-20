# mi0.app · Backlog

**Actualizado:** 15 de octubre de 2026
**Fase actual:** Sorteos, Mi Turno y Mi Cita implementados; verificación local y preparación de producción.

## Objetivo actual

Validar **Sorteos como primera microapp de mi0**, gratuita y sin registro, con una experiencia sencilla desde móvil y escritorio. Consolidar la base existente de cuentas, espacios y administración sin ampliar prematuramente el catálogo.

La prioridad fue confirmada por el usuario el 7 de octubre de 2026. Matrículas pasa a ideas futuras y deja de ser el primer MVP.

## Estado comprobado en código

| Área | Estado | Evidencia y límites |
|---|---|---|
| Web React/Vite | Implementada | Catálogo, búsqueda y filtros |
| Sorteos | Implementado | Entradas por líneas/comas, mínimo dos, animación, ganador, repetición y limpieza |
| Datos de Sorteos | Solo navegador | No hay persistencia ni historial; nombres repetidos cuentan como entradas distintas |
| API Express/Prisma | Implementada | Rutas de autenticación, espacios y administración |
| PostgreSQL | Esquema y migraciones presentes | Conexión real y migraciones aplicadas no verificadas |
| Autenticación | Implementada | Contraseñas con scrypt, tokens de sesión almacenados como hash y revocación |
| Espacios y membresías | Implementados | PERSONAL/ORGANIZATION; OWNER/ADMIN/MEMBER; espacio personal automático al registrarse |
| Activación de módulos | API implementada | OWNER/ADMIN y espacio activo comprobados en servidor y pruebas |
| Panel del usuario | Parcial | Lista espacios y módulos; permite abrir Sorteos Avanzado |
| Superadmin | Parcial | Resumen/listados y revisión de pagos implementados; concurrencia/lint corregidos |
| S3 | Bucket y configuración existentes | Bucket `mi0-assets-prod` confirmado por el usuario; cliente y health check presentes. Sin flujo de subida integrado ni verificación remota en esta tarea |
| Archivos locales | Base implementada y verificada | Carpeta `api/uploads/` fuera de Git, operaciones de guardado/lectura/borrado y separación público/privado; sin endpoint ni interfaz de subida |
| PWA | Pendiente | Portada anuncia instalación; no se encontró manifest ni service worker |
| Otras microapps | Pendientes | Ocultas del home; conservadas como ideas futuras |
| Producción | No verificada | No se comprobó despliegue ni servicios externos |

## P0 · Corregir autorización de módulos

**Tarea completada:** endurecer `POST /api/workspaces/:workspaceId/modules/:moduleCode`.

- [x] Rechazar activaciones en espacios INACTIVE.
- [x] Restringir la activación a OWNER y ADMIN.
- [x] Mantener el rechazo de usuarios sin membresía y de módulos inactivos.
- [x] Verificar permisos con usuarios de dos espacios y con los roles permitidos/restringidos.

**Criterio de aceptación:** un usuario sin permiso o un espacio inactivo no produce cambios en los módulos del espacio.

## P0 · Estabilizar superadmin

- [x] Evitar que una respuesta anterior sobrescriba los datos de una sección elegida después.
- [x] Limpiar el estado del panel al cerrar sesión.
- [x] Corregir los dos errores de `react-hooks/set-state-in-effect`.
- [ ] Verificar cambios rápidos entre Usuarios, Negocios y Microapps, incluyendo errores de red.

**Criterio de aceptación:** cada sección muestra únicamente sus datos, el panel no conserva datos de una sesión anterior y lint/build pasan.

## P1 · Validar Sorteos de principio a fin

### Funcionalidad existente

- [x] Abrir la herramienta desde el catálogo sin registro.
- [x] Leer participantes separados por líneas o comas.
- [x] Ignorar entradas vacías y exigir al menos dos entradas.
- [x] Mostrar cuenta regresiva, animación y ganador.
- [x] Bloquear edición y nuevos sorteos durante la animación.
- [x] Repetir el sorteo y limpiar la lista.
- [x] Cancelar actualizaciones pendientes al desmontar el componente.

Estos puntos se confirmaron por lectura del código; la prueba interactiva sigue pendiente.

- [x] Mostrar únicamente herramientas implementadas en el home: Sorteos y Sorteos Avanzado; categorías derivadas del catálogo disponible.

### Validación pendiente

- [ ] Probar desde móvil y escritorio el flujo completo y el regreso al catálogo.
- [ ] Comprobar listas largas, espacios, comas, líneas vacías y nombres repetidos.
- [ ] Decidir cómo comunicar que los nombres repetidos cuentan como participaciones distintas.
- [ ] Verificar teclado, foco, lectura del resultado y preferencia de movimiento reducido.
- [ ] Confirmar con usuarios que el flujo se entiende sin explicación.
- [ ] Registrar problemas y necesidades observadas antes de elegir la siguiente herramienta.

**Criterio de aceptación:** una persona puede abrir Sorteos, cargar una lista válida, obtener un ganador y repetir o limpiar desde móvil y escritorio sin errores.

No añadir historial, cuentas obligatorias o persistencia de sorteos sin una necesidad validada.

## P1 · Completar la experiencia de plataforma

- [ ] Definir el flujo para agregar y abrir microapps desde el panel del usuario.
- [ ] Conectar las tarjetas de módulos disponibles con su pantalla correspondiente.
- [ ] Alinear disponibilidad del catálogo público y del catálogo de la API.
- [ ] Comprobar registro → espacio personal → listado de espacios → cierre de sesión con PostgreSQL de prueba.
- [ ] Revisar validación de entradas y respuestas JSON centralizadas de error en la API.
- [ ] Revisar protección contra intentos repetidos de login/registro.
- [ ] Resolver la promesa PWA: implementar instalación o ajustar los textos y el botón de la portada.
- [ ] Verificar variables, conectividad y recorridos reales en el entorno de despliegue.

**Criterio de aceptación:** las acciones visibles conducen a funciones disponibles y los estados de carga/error permiten entender lo ocurrido.

## P2 · Evolución según uso real

- [ ] Elegir la siguiente microapp según feedback y demanda.
- [ ] Evaluar recuperación de contraseña y funciones adicionales de cuentas.
- [ ] Evaluar PWA e internacionalización cuando aporten valor.
- [ ] Definir monetización para herramientas que lo justifiquen.
- [ ] Evaluar historial, archivos, notificaciones e integraciones por necesidad concreta.

## Almacenamiento de archivos · base completada, 15 de octubre de 2026

- [x] Preparar almacenamiento local en `api/uploads/`, excluido de Git y creado al guardar el primer archivo.
- [x] Exponer operaciones `save`, `read` y `remove` mediante `req.app.locals.storage`, con nombres UUID y validación de claves.
- [x] Separar archivos públicos y privados; servir solo los públicos en `/uploads/public/` durante desarrollo.
- [x] Seleccionar proveedor mediante `STORAGE_DRIVER`: local por defecto fuera de producción y S3 por defecto en producción. Rechazar almacenamiento local en producción; sin fallback automático ante fallos de AWS.
- [x] Conservar cliente, credenciales y health check existentes de S3 sin cambios. No se accedió al bucket ni se modificó AWS.
- [x] Documentar configuración y uso en `api/README.md` y `api/.env.example`.
- [x] Verificar guardado, lectura y borrado locales, separación por visibilidad, rechazo de rutas inválidas y selección del proveedor en producción; sintaxis y `git diff --check` correctos. Sin solicitudes a AWS.

**Pendiente solo cuando una funcionalidad lo requiera:**

- [ ] Implementar endpoint e interfaz para subir imágenes, con autenticación, permisos, límite de tamaño y validación del contenido real.
- [ ] Definir asociación de archivos con entidades y persistir sus claves en la base de datos.
- [ ] Incorporar acceso autorizado a archivos privados y definir entrega de archivos desde S3 según las políticas del bucket.
- [ ] Verificar el flujo completo de imágenes en local y, cuando corresponda, en producción.

**Límite actual:** la infraestructura está preparada; ninguna microapp sube imágenes todavía. El bucket de producción existe, pero el flujo de archivos aún no está integrado.

Sorteos continúa siendo la primera herramienta gratuita. Las hipótesis previas de S/19.90 mensuales, S/199 anuales y 14 días de prueba se conservan para futuras herramientas de pago, pendientes de validar.

## Catálogo futuro

| Herramienta | Situación |
|---|---|
| Sorteos | Primera herramienta implementada; gratis y sin cuenta |
| Sorteos Avanzado | Implementado; resultados guardados y publicación por S/4.90 |
| Generador QR | Idea futura; fuera del home |
| Conversor de unidades | Idea futura; fuera del home |
| Notas rápidas | Idea futura; fuera del home |
| Extractor de texto | Idea futura; fuera del home |
| Calculadora de fechas | Idea futura; fuera del home |
| Generador de contraseñas | Idea futura; fuera del home |
| Compresor de imágenes | Idea futura; fuera del home |
| Renombrador de archivos | Idea futura; fuera del home |
| Matrículas, Sellos, Huéspedes, Acuerdos, Calendario e Incidentes | Ideas futuras; sin orden de implementación confirmado |

### Referencia conservada: Matrículas

El plan anterior contemplaba adaptar la demo `kaplack/demo-nido` (Colores y Sonrisas) para negocios con slug y branding propios, configuración de campañas/niveles, recepción de solicitudes y dashboard de seguimiento.

Si se retoma, reutilizar la demo y diseñar el aislamiento por espacio. Las entidades propuestas eran EnrollmentConfig, EnrollmentLevel y EnrollmentRequest; los estados propuestos: Nuevo, Contactado, En revisión, Confirmado y Descartado. El piloto anterior de 10–20 nidos queda como referencia, sin ejecución priorizada actualmente.

## Límites de alcance

- No construir todas las microapps antes de validar Sorteos.
- No convertir las utilidades públicas en flujos que exijan cuenta innecesariamente.
- No automatizar pagos ni suscripciones antes de definir el modelo comercial.
- No reconstruir Vincu ni ampliar el Core sin una herramienta que lo necesite.

## Evidencia histórica de la revisión inicial · 7 de octubre de 2026

| Comprobación | Resultado |
|---|---|
| `npm run build --prefix web` | Correcto |
| `npm run lint --prefix web` | Correcto |
| `npm run build --prefix superadmin` | Correcto |
| `npm run lint --prefix superadmin` | Falla: dos errores en App.jsx, líneas 36 y 105 |
| Pruebas automatizadas del proyecto | No encontradas en la revisión |
| PostgreSQL/S3 y producción | No comprobados |
| Prueba visual/interactiva | Pendiente |

Esta tabla conserva la evidencia inicial; los resultados posteriores están registrados en el bloque de Sorteos Avanzado.

## Sorteos Avanzado · implementado y verificado, 7 de octubre de 2026

- API y modelos de sorteos persistentes, participantes, premios, resultados y solicitudes de publicación implementados.
- Resultado calculado en servidor con crypto.randomInt; bloqueo de fila y transacción evitan repetir sorteos y modificar ganadores.
- Permisos: miembros consultan; OWNER/ADMIN crean, editan borradores, sortean y solicitan publicación; SUPERADMIN aprueba/rechaza pagos.
- Publicación independiente del estado del sorteo: S/4.90 por Yape, referencia única y aprobación manual. Configuración en YAPE_PHONE/YAPE_NAME; sin comprobantes ni S3.
- Interfaz privada, animación por premio y página pública /s/:code implementadas. Sorteos Simple conserva su funcionamiento.
- Seis pruebas HTTP con PostgreSQL en esquema temporal aislado: correctas. Incluyen migraciones desde cero, concurrencia, permisos, pagos, privacidad y claves foráneas.
- Lint y compilación de web/superadmin: correctos. Recorrido completo en navegador, escritorio y móvil verificado sin errores ni desbordamientos; cuentas y sorteos temporales eliminados. Guía en docs/SORTEOS_AVANZADO.md.
- La migración 202610070003_advanced_raffles se aplica únicamente en mi0 local; Neon no se modifica.
### Próximos pasos

- [ ] Aplicar la migración en producción y configurar YAPE_PHONE/YAPE_NAME en el entorno de la API cuando se autorice; Neon no se modificó en esta tarea.
- [ ] Validar Sorteos Avanzado con usuarios reales y la publicación por S/4.90.
- [ ] Definir la frecuencia de verificación manual de pagos.

## Mejora de presentación de sorteos · 7 de octubre de 2026

- Cada ganador permanece visible hasta continuar manualmente con el siguiente premio; el último ofrece «Ver todos los resultados».
- «Repetir sorteo» abre un nuevo borrador con participantes/premios copiados; el sorteo original conserva resultados y publicación.
- «Publicar y compartir» abre un modal; S/4.90 aparece dentro. Incluye datos Yape, operación y envío, con Escape/cierre, control de foco y bloqueo durante el envío.
- No hay cambios de API, esquema ni migraciones. Sorteos Simple conserva su funcionamiento.
- Lint y compilación de la web correctos; recorrido de navegador aprobado en escritorio y móvil: pausa entre premios, copia del sorteo, modal, envío y publicación.

## Mi Turno · Dashboard de pago

- Implementado: acceso completo por negocio, S/10 mensual o S/79 anual,
  renovación manual mediante Yape y revisión en superadmin. Sin pago
  confirmado no se muestran métricas. OWNER/ADMIN; operadores excluidos.
- Tiempos de registro, llamado, finalización, ausencia y vencimiento guardados.
  Filtros por fechas de registro en Lima, métricas, demanda por hora,
  resumen por ventanilla y CSV sin datos identificatorios.
- Migraciones de tiempos y Dashboard aplicadas en PostgreSQL local.
- Verificado: build web y superadmin; prueba focalizada de permisos,
  pagos, aprobación concurrente, renovación y cálculos; recorrido UI con
  API simulada en escritorio y móvil, descarga CSV y sin desbordamiento.
- Pendiente: validación manual del depósito real y revisión por superadmin;
  configurar YAPE_PHONE/YAPE_NAME en el entorno donde se vayan a cobrar pagos.
  No hay pasarela automática ni débitos recurrentes.

- Vista previa del Dashboard habilitada temporalmente en api/.env para
  revisión visual local, sin alterar pagos/vigencias. Solo fuera de producción
  y con DB localhost; desactivar TURN_DASHBOARD_PREVIEW tras los ajustes.

- Navegación por rol: administrador con menú lateral modal desde ☰/✕
  a la altura de Mi Turno; operador con barra inferior fija (Operación, QR,
  pantalla pública). Build y recorrido focalizado desktop/móvil correctos.

- Ajuste confirmado: navegación por rol nueva solo en pantallas de hasta
  760px. Escritorio conserva sidebar colapsable para ambos roles. Prueba
  focalizada desktop/móvil correcta.

- Vista previa local desactivada tras validar la presentación del Dashboard.
  Se restaura explicación y contratación para negocios sin pago vigente.
## Mi Cita · MVP, 8 de octubre de 2026

- Implementado en feature/mi-cita-mvp: configuración, profesionales/horarios, agenda/pendientes, QR PNG y solicitud pública sin registro. OWNER/ADMIN configuran; MEMBER opera y consulta disponibilidad.
- DNI configurable, desactivado por defecto; no se almacena si no se solicita. Pendientes vencen al inicio o antes según plazo 2/6/12/24 horas; cambios de política afectan nuevas solicitudes.
- Disponibilidad en zona horaria (Lima por defecto), transacciones con advisory lock y restricción de exclusión GiST/btree_gist contra solapamientos. Limpieza periódica en servidor y al consultar/gestionar.
- Evidencia: ocho pruebas de backend con PostgreSQL aislado correctas (incluido vencimiento sin navegador/reintentos); lint y build web correctos. Mi Turno (7) y Sorteos Avanzado (6) pasan sus pruebas PostgreSQL.
- Navegador con API/DB reales: configuración, profesionales, descarga QR y navegación desktop/móvil correctas; solicitud con/sin DNI y confirmación/cancelación por MEMBER correctas. Capturas revisadas sin desbordamientos. Detalles ahora en diálogo accesible; recorrido focalizado confirmado.
- Migración aplicada a PostgreSQL local y validada desde cero en esquemas temporales; esquema local al día. Fixtures/esquemas temporales eliminados. No se modificó ninguna base remota.
- Ocho recorridos de navegador correctos entre escritorio y móvil (6 principales + 2 de recuperación tras respuesta perdida), copia de enlace, descarga QR y cierre con Escape. Navegación Mi Turno desktop/móvil verificada (2 pruebas).
- Entrega preparada en feature/mi-cita-mvp para revisión mediante PR hacia main; sin merge ni despliegue remoto.
- Guía operativa y despliegue: docs/MI_CITA.md. La migración requiere btree_gist disponible en PostgreSQL.
- Entorno: los procesos funcionan fuera del sandbox; dentro falla el arranque.

### Mi Cita · vista de próximos días completada

- Se añade resumen autenticado por profesional, agregado en PostgreSQL sin límite de la agenda paginada.
- Solo próximos 7 y 30 días desde hoy en la zona del consultorio; 7 por defecto y preferencia recordada.
- Verde: confirmadas; ámbar: solo pendientes; casillas vacías: sin citas activas. Pulsar un día abre su agenda.
- Verificado: 9 pruebas backend, lint/build y 10 recorridos de navegador correctos (incluidos los 2 nuevos de resumen desktop/móvil). Capturas revisadas; sin desbordamiento hasta 320 px. PR #2 actualizado sin merge.

- Agenda: selector de fecha oculto inicialmente en «Ir a una fecha»; conserva consulta de fechas pasadas/futuras y filtro profesional visible. Verificación mínima: lint del componente y build; revisión visual a cargo del usuario.

- Ajuste visual de Agenda: profesional y «Ir a una fecha» en columnas iguales; botón con icono calendario, altura de 44 px y controles apilados en móvil. Verificación mínima: lint del componente y build; revisión visual del usuario.

### Mi Cita · acceso profesional por invitación completado

- Cuentas e invitaciones del workspace reutilizadas: enlace ligado al correo/profesional, registro o login, aceptación explícita y entrada a Mi agenda. Enlace vence en 7 días, hash en BD y regeneración/cancelación invalidan el anterior.
- Gestión completa para administrador/asistente (OWNER/ADMIN y MEMBER sin vinculación); profesional MEMBER vinculado accede solo a sus citas, confirma/cancela propias y comparte QR/enlace preseleccionado. Aislamiento aplicado en API, incluidas agenda, pendientes, resumen y mutaciones.
- Cancelar invitación y retirar acceso desde ficha. Revocación conserva citas y un registro de denegación para evitar acceso de gestión por omisión. Una cuenta por profesional; una vinculación por cuenta/consultorio.
- Migración 20261008180000_cita_professional_invitations aditiva, aplicada a mi0 local/public, migrate status al día y Prisma generado. API local reiniciada y disponible en 3000. No se tocaron bases remotas.
- Verificado: 11 pruebas HTTP/PostgreSQL, un único recorrido nuevo desktop de invitación/registro/agenda/QR/revocación, lint y build. Sin suites visuales adicionales. Primera ejecución del recorrido corrigió únicamente un selector de etiqueta Correo; segunda correcta.
- Entrega en feature/mi-cita-mvp y PR #2, sin merge. Revisión visual del usuario.

- Mi Cita identifica cada espacio por el nombre del consultorio configurado. La invitación comparte el workspace existente; no duplica consultorio ni citas. Al abrir sin workspace se prioriza uno configurado frente al espacio personal vacío; accesos revocados se excluyen del selector. Verificación mínima: recorrido de invitación actualizado, lint y build.

- Mi0 principal: el listado global identifica un workspace de nombre genérico «Mi espacio» por su consultorio configurado. Espacio personal sin consultorio y nombres personalizados se conservan. Verificado con una prueba HTTP/PostgreSQL del registro/invitación/listado; sin revisión visual adicional.

- Mi0: Mis microapps renderiza únicamente modules activos del espacio seleccionado; se retiran tarjetas fijas de Mi Turno/Mi Cita/Sorteos Avanzado. Estado vacío y acceso a Explorar conservados. Comprobación mínima: listado por espacio en prueba de invitación, lint y build.

- Regresión de listado Mi Turno corregida: Alan mantiene Ventanilla 1 de Cosa nostra en el mismo workspace de Podologo Jaiva. Faltaba workspace_modules/mi-turno, por lo que el filtro ocultaba su tarjeta. Migración aditiva registra colas existentes sin modificar operadores ni asociaciones desactivadas; setup activa el módulo transaccionalmente. Prueba puntual de configuración y auditoría local.

### Navegación por espacios completada

- Inicio lista todos los espacios propios e invitados en tarjetas con nombre/rol; accesos de icono + nombre sin descripción ni botón Abrir. Mis microapps lista únicamente espacios OWNER. Espacios vacíos al final; Explorar conserva catálogo.
- Sin selector en Inicio, Mi Cita ni Mi Turno; dentro de cada microapp se mantiene nombre del espacio, rol y Volver a Inicio. Inicio abre usando el workspace concreto de la tarjeta.
- Separación local autorizada: Cosa nostra movida del workspace 41463cd1-c265-4f0e-bbe2-3208bfc203b6 al 2794b8af-abfd-4ad8-a578-c37d465935a5. Se preservan queue/code, cuatro tickets, invitación, operador y ventanilla 1 de Alan. Consultorio conserva profesionales/accesos y tres citas. Membresías OWNER/ADMIN y operadores de Mi Turno trasladadas por copia; permisos de Mi Cita quedan en origen. No se tocó ninguna BD remota.
- Mantenimiento explícito local en api/scripts/separate-turno-workspace.cjs, transaccional con comprobaciones de conservación; no se aplica automáticamente a otros negocios que comparten microapps.
- Verificación mínima: lint/build y único recorrido desktop de invitación/Inicio/apps propias/agenda/QR/revocación. Primera ejecución detectó nombres accesibles del menú con iconos incluidos; corregidos mediante aria-hidden. Revisión visual del usuario.

- Inicio: accesos compactos sin recuadro interno; botón ajustado al icono/nombre y hover sobre ambos. El espacio libre de la tarjeta ya no activa la app. Verificación mínima: build; visual del usuario.

### Catálogo dentro del panel
- Explorar microapps mantiene menú lateral y muestra Abrir, Más información y Agregar a mi espacio en cada tarjeta.
- Fichas con funciones y capturas reales de las cuatro herramientas, generadas con datos de ejemplo en PostgreSQL aislado. Regeneración explícita con UPDATE_MICROAPP_PREVIEWS; las pruebas normales no cambian recursos públicos.
- Modal de agregado selecciona el espacio PERSONAL propio por defecto, permite elegir espacios OWNER/ADMIN, informa asociaciones existentes y persiste mediante API. Abrir elige entre espacios con la herramienta instalada cuando hay varios; sin instalación conduce al agregado.
- Migración aditiva registra Sorteos simple, sin activar asociaciones por defecto ni modificar módulos desactivados.
- Prueba focalizada desktop: navegación interna, selección predeterminada, agregado a dos espacios, duplicados, persistencia, rechazo MEMBER y ficha con Escape. Lint/build; revisión visual del usuario.

- Catálogo: tres acciones compactas con iconos outline, etiquetas accesibles y tooltips al hover/foco; Escape los oculta. Áreas táctiles de 44px. Verificación mínima: lint/build; revisión visual del usuario.

### Categorías administrables y catálogo conectado (2026-10-17)
- CRUD de categorías en Superadmin; nombres normalizados, únicos sin distinguir mayúsculas, hasta 80 caracteres. Todas/Gratis reservados como filtros.
- Relación muchos-a-muchos: una microapp puede tener varias categorías. Editor de clasificación y atributo independiente Totalmente gratis.
- API pública GET /api/catalog; portada y Explorar consumen categorías, nombres, descripciones y gratuidad desde PostgreSQL. Se conservan las cuatro microapps implementadas; los registros históricos no implementados no se publican por conectar el catálogo.
- Migración aditiva 202610170001_catalog_categories crea categorías/asociaciones, conserva datos, asigna Negocios/Utilidades y marca Sorteos gratuito. Eliminación solo sin asociaciones, en transacción serializable.
- Pruebas aisladas PostgreSQL: permisos anónimo/USER/SUPERADMIN, CRUD, duplicados, validación, asociaciones múltiples, bloqueo de eliminación y contrato público; navegador escritorio/móvil con persistencia y filtros. Lint/build de web y Superadmin correctos.
- Activado en PostgreSQL local: migración aplicada, cliente Prisma estándar regenerado y API reiniciada bajo nodemon. GET /api/catalog verificado con HTTP 200. npm run test:catalog pasa ambos recorridos (API y navegador escritorio/móvil) con el cliente estándar. Lint/build de ambos frontends correctos. No se ha desplegado a producción.


### Catálogo QR · completado en localhost
- Alcance: un catálogo por espacio, gratis 30 productos y 1 foto; capacidad PRO 5 fotos preparada. Cobros y límite ampliado de productos pendientes de definición. Sin carrito, pedidos ni delivery.
- Dominio qr-catalog reutiliza auth, memberships, storage privado local/S3 y qrcode existentes; biblioteca BaseReutilizable evaluada, no incorporada para evitar reemplazar identidad/storage y añadir checkout ajeno al alcance.
- Productos/categorías pertenecen al workspace; presentación QR separada, preparada para conexión posterior con otras microapps.
- Migración 202610170006_qr_catalog exclusivamente aditiva; se descartaron del diff las diferencias históricas ajenas al dominio. Migración aplicada a mi0 localhost; cliente Prisma regenerado y API reiniciada. Prueba API en schema aislado correcta: permisos, validaciones, publicación, privacidad de archivos, límites de fotos FREE/PRO y límite de 30 ante creaciones concurrentes. Recorrido real de navegador correcto en 1280 y 390 px: crear negocio/categoría/producto, foto, publicación, QR descargable, catálogo público sin cuenta, búsqueda y WhatsApp. Capturas manager/public revisadas sin desbordamientos; corregido estado de producto sin foto. Lint y build de web correctos. Sin despliegue a producción.


### Identidad pública del espacio · completado en localhost
- Dirección única del espacio: /[nombre-del-espacio]/catalogo, sugerida desde su nombre y elegible al guardar por primera vez. La dirección se conserva después para mantener enlaces y QR; nombre visible editable.
- Workspace.publicSlug compartible con futuras microapps; duplicados y nombres reservados rechazados por servidor. Compartir y QR usan la dirección personalizada. /catalogo/:code sigue funcionando.
- Migración 202610170007_workspace_public_slug aplicada solo a localhost con backfill de catálogos existentes; dirección asignada y unicidad verificadas en la base local. Suite qr-catalog correcta (API y navegador en 1280/390 px): ruta por nombre, QR/enlace personalizado, legado por código, duplicados, nombres reservados, inmutabilidad y publicación. Lint/build correctos. Sin despliegue.


### Carta / Catálogo e identidad única · completado en localhost
- Selector Mostrar como: Catálogo o Carta. Enlace para compartir y QR terminan en /catalogo o /carta según preferencia; ambas rutas conservan acceso al mismo contenido.
- Nombre visible toma Workspace.name; al guardar Mi negocio se actualiza transaccionalmente el nombre del espacio (solo propietario). Dirección pública conservada; sugerencia inicial desde el nombre elegido.
- Migración 202610180001_catalog_presentation conserva nombres públicos existentes para espacios iniciales Mi espacio y sincroniza las copias históricas de nombre. Migración aplicada en mi0 local, cliente Prisma regenerado. API verificada: validación de presentación, nombre sincronizado, renombrado solo OWNER, slugs conservados, límites concurrentes (espera transaccional ajustada a 15s). Navegador 1280/390 correcto: selector, Carta/Catálogo, enlaces/QR y ambas rutas, búsqueda y WhatsApp. Capturas públicas revisadas, lint/build correctos. Servicios locales iniciados: web 5174, API 3000, superadmin 5173. Sin despliegue.


### Cambio del enlace de negocio · completado en localhost
- Propietario puede editar el enlace aun después de guardar. Direcciones anteriores reservadas al mismo workspace como alias; mantienen Carta/Catálogo y QR sin permitir que otro negocio las tome.
- Migración 202610180002_workspace_address_aliases aplicada localmente, direcciones existentes registradas. Suite qr-catalog correcta: edición después de guardar, reserva de alias contra apropiación por otros espacios, permisos OWNER/ADMIN, acceso con enlace anterior y nuevo, formulario/QR en 1280 y 390 px. Lint/build y diff-check correctos. API local /by-space/mi-espacio responde 200. El nombre visible sigue sin alterar enlaces automáticamente; cambiarlos es una acción explícita. Sin despliegue.


### Espacios y nombre público independiente · completado en localhost
- Crear varios espacios con nombre libre y OWNER al creador. Cards con lápiz inline (Enter/✓ guarda, Escape cancela) y tacho con confirmación. Crear en móvil solo ＋ accesible.
- Migración 202610180003_workspace_names aplicada localmente conserva nombres visibles históricos al retirar fallback desde consultorio/cola.
- Eliminar solo vacío: sin módulos incluso inactivos, dominios, productos/categorías, enlaces públicos ni invitados. Control servidor OWNER y bloqueo transaccional.
- Nombre de catálogo vuelve a QrCatalog.name independiente de Workspace.name; modificar uno no cambia el otro ni sus enlaces. Suite qr-catalog correcta (3 pruebas: dominio catálogo, CRUD de espacios y recorrido navegador a 1280/390). Regresión puntual de citas invitation renewal correcta, expectativa actualizada a nombre real del espacio. Capturas spaces/public revisadas, lint/build y diff-check correctos. Web 5174 y API 3000 responden 200. Sin despliegue.

- Corrección operativa local: API de puerto 3000 seguía ejecutando proceso anterior sin rutas CRUD; reiniciada. Smoke autenticado contra servidor real correcto: crear 201, PATCH nombre 200 y eliminar 200; usuario/espacio temporales retirados. No se modificaron los datos del usuario.


### Formulario de negocio, publicación y enlace confirmado · implementación local
- Nombre/logo/descripción agrupados; logo seleccionable con vista previa desde el primer guardado. Enlace destacado con URL completa y explicación explícita del QR. Luego moneda y contacto/redes.
- Checkbox retirado: Guardar borrador, Publicar carta/catálogo (confirmación del enlace), Guardar cambios y Retirar de publicación. LinkLocked persiste tras primera publicación y no se elimina al retirar. Existentes publicados quedan bloqueados por migración.
- Propietario solicita cambio de enlace/motivo; Superadmin → Catálogo QR → Solicitudes de enlace puede aprobar/rechazar. Alias anteriores se conservan.
- Migración 202610180004_catalog_link_publication aplicada solo a localhost; Prisma regenerado y API reiniciada. No se ejecutaron pruebas, lint, build ni recorridos de navegador por instrucción del usuario; revisión funcional/visual a cargo del usuario.


### Carga de logo más amigable · localhost
- Selector nativo sustituido por miniatura clicable, icon buttons accesibles con tooltip por foco/hover para cargar/cambiar, retirar y deshacer. Admite arrastrar archivo y vista previa antes de guardar. Formatos/tamaño y guardado diferido explícitos. Distribución compacta para móvil.
- Componente LogoPicker separado; conserva validaciones y persistencia existentes. Sin pruebas, lint, build ni inspección de navegador por instrucción del usuario.


### Pendiente · limpieza fiable de archivos eliminados/reemplazados
- Actualmente se retira la referencia en BD y se intenta eliminar el archivo en storage local/S3; algunos errores de limpieza se ignoran sin reintento, por lo que pueden quedar archivos huérfanos.
- Implementar cola persistente de bajas con reintentos, registro de fallos y procesamiento idempotente. Antes de eliminar, comprobar que la clave ya no esté referenciada; cubrir fallos tras reemplazos/subidas y tareas interrumpidas. No borrar archivos por antigüedad sin verificar referencias.
- Alcance futuro; no implementado en este cambio.

### Logo · controles en esquinas
- Una sola cámara abajo a la derecha carga/reemplaza. Tacho rojo sobre fondo blanco arriba a la derecha solo si hay imagen. Miniatura sin acción duplicada, zonas táctiles de 44px separadas. Deshacer como texto únicamente después de retirar; guardado diferido conservado.
- Sin pruebas, lint, build ni navegador, por petición del usuario.

- Ajuste de logo: después de retirar, Deshacer es icon button en esquina superior derecha, en lugar del tacho; no se muestran juntos. Sin pruebas por instrucción del usuario.

- Logo: retiradas indicaciones repetidas. Título separado, formatos/tamaño como única ayuda fija y estado de guardado solo cuando hay cambios. En móvil, título/imagen/ayuda apilados para evitar texto estrecho junto a la miniatura. Sin pruebas por petición del usuario.

- Formulario Mi negocio: secciones sin bordes/fondos anidados, agrupadas por títulos y divisores; tarjeta exterior retirada en móvil para recuperar ancho. Solo URL final destacada, selector Carta/Catálogo corto y aviso del enlace abreviado. Sin pruebas por petición del usuario.

- Redes sociales: quitar con tacho+texto en escritorio; solo icon button junto al input Red social en móvil, enlace debajo a ancho completo. Agregar con fondo verde suave. Accesibilidad/tooltip y mismas acciones responsive. Sin pruebas por petición del usuario.

- Guardar cambios/borrador destacado en verde con icono de guardar; móvil solo icon button accesible, escritorio icono+texto. Retirar de publicación renombrado Ocultar catálogo/carta, confirmando que clientes dejan de verlo sin perder enlace/productos. Sin pruebas por petición del usuario.

- Ocultar carta/catálogo retirado del formulario por decisión del usuario. Publicado muestra solo Guardar cambios; borrador conserva Guardar borrador y Publicar. Sin pruebas.


### Productos · fotos antes de guardar
- Creación y edición permiten seleccionar fotos con vista previa local, quitar selección y marcar fotos existentes para retirar; persistencia diferida a Guardar producto. Cancelar/cerrar/Escape descarta cambios sin subir archivos ni borrar fotos existentes. Objetos URL liberados al quitar/cerrar.
- Respeta límites de plan y 5 MB; un guardado coordina datos, retiros y subidas. Si falla una foto después de guardar datos, informa guardado parcial; conserva ID y fotos ya enviadas para reintentar sin duplicar producto/subidas confirmadas.
- Sin pruebas, lint, build ni navegador por instrucción del usuario.

- Editor de productos: guardar/cancelar/deshacer con icono+texto en escritorio y solo iconos accesibles en móvil; fotos con tacho, selector cámara sin texto en móvil. Sin pruebas por instrucción del usuario.


### Catálogo QR · experiencia centrada en el negocio
- Sidebar colapsable en escritorio con logo/nombre público y herramienta; espacio/rol como contexto secundario, Volver a mi0 al pie. Encabezado grande retirado.
- Móvil con identidad compacta y barra inferior fija Productos/Categorías/Mi negocio/QR, iconos+texto, safe-area y espacio reservado; barra oculta con teclado visual abierto. Regreso a mi0 en encabezado.
- Categorías extraído a sección independiente: crear, editar nombre/orden y eliminar preservando productos. Navegación por rutas /catalogo-qr/:workspaceId/productos|categorias|negocio|qr, compatibles con enlace anterior. Secciones permanecen montadas para conservar formularios al navegar.
- Sin pruebas, lint, build ni recorridos de navegador por instrucción del usuario.


### Portada y WhatsApp · implementado en localhost
- Foto banner configurable en Mi negocio, vista previa/retirar/deshacer con guardado diferido. Portada opcional en encabezado público, sin cambiar nombres/productos de prueba del usuario. Storage privado reutilizado; migración 202610190001_catalog_banner.
- WhatsApp con icono+texto en escritorio y solo icono accesible en móvil (contacto general y detalle). Sin pruebas por instrucción del usuario.

- Migración del banner aplicada a mi0 localhost y cliente Prisma regenerado; API recargada. No se ejecutaron pruebas, lint, build ni navegador. Nombres y productos de ejemplo del usuario conservados.

- Portada pública a ancho completo de pantalla en escritorio/móvil, sin tarjeta ni bordes; logo/nombre/descripción sobre imagen con degradado oscuro. Móvil compacto (mínimo 290px, adaptable al texto), redes en fila fuera del banner. Productos conservan ancho máximo y márgenes. Sin pruebas por instrucción del usuario.


### Catálogo público · navegación móvil y redes estructuradas
- Barra inferior Buscar/Categorías/WhatsApp en móvil; buscador superior/chips y WhatsApp flotante retirados solo en móvil. Buscar abre campo fijo arriba y enfoca dentro del gesto para solicitar teclado; categorías en panel modal inferior. Filtros activos visibles y limpiables; pie reserva espacio.
- Redes dentro del banner debajo de descripción, solo iconos con nombres accesibles y tooltip. Mi negocio: selector Instagram/Facebook/TikTok/YouTube/X/Sitio web y entrada usuario o enlace. Servidor arma HTTPS desde usuario y valida plataforma/dominio; enlaces históricos conservados al leer y adaptados al editar.
- Sin pruebas, lint, build ni recorridos de navegador por instrucción del usuario. Recarga de API solicitada al watcher local para la nueva validación.


### Catálogo QR · propuestas para el plan pago (pendientes)
Ideas documentadas el 19/10/2026; no implementadas. El alcance final y las reglas comerciales quedan por definir. Prioridad actual: terminar de pulir la versión gratuita.

- [ ] Dashboard de ingresos/visitas al catálogo público, con evolución por día o mes. Definir qué cuenta como visita y distinguir visitas de personas únicas; comunicar claramente la métrica.
- [ ] Sección de promociones: destacar productos con precio de oferta y fechas de vigencia.
- [ ] Sección de combos: agrupar productos con un precio conjunto (por ejemplo, pizza + bebida). Diferenciar combos de descuentos y permitir mostrarlos sin depender de carrito, pedidos o delivery.
- [ ] Más de 30 productos; definir el límite del plan pago.
- [ ] Hasta 5 fotos por producto, frente a 1 en la versión gratuita.
- [ ] Evaluar personalización adicional de apariencia; opciones concretas por definir.

Base gratuita acordada: hasta 30 productos, 1 foto por producto, categorías, identidad del negocio, redes sociales, contacto por WhatsApp y enlace/QR permanente. Facilidad de uso, velocidad y adaptación móvil deben mantenerse en ambos planes. La lista de funciones pagas puede ampliarse conforme se definan nuevas necesidades.

### Mi Bingo · MVP implementado en local · 20/10/2026
- Organizador propietario: una sala activa, QR, participantes, tres patrones, premio, varias rondas, pantalla pública e historial. Integrado a Explorar y espacios; conserva VDS.
- PostgreSQL autoritativo, bloqueos transaccionales y compare-and-set de sorteo, validación independiente de marcas, fase de resolución con empates y cierre manual. Identidad privada recuperable en mismo navegador; marcas locales por ronda.
- Migración 202610200001_mi_bingo aplicada solo en localhost y Prisma regenerado. Sin variables nuevas, push ni despliegue.
- Pruebas mínimas: 3 de reglas + 1 integración aislada correctas; build y lint de archivos afectados correctos. Lint global falla por 3 errores anteriores del Catálogo QR, sin modificar esos archivos.
- Chrome desktop/móvil: ingreso, sorteo, recuperación y marcas tras recarga, limpieza en nueva ronda, pantalla pública; capturas revisadas sin overflow móvil ni errores JS. Datos temporales eliminados.
- Pendientes: prueba realista con 30 jugadores, regresión completa y pruebas manuales del usuario. Detalles y pasos: docs/mi-bingo.md. Web 5174, API 3000.
