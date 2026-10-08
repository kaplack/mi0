# mi0.app · Backlog

**Actualizado:** 8 de octubre de 2026
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
| S3 | Integración presente | Conectividad y flujo de archivos no verificados |
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
