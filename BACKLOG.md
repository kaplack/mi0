# mi0.app · Backlog

**Actualizado:** 7 de octubre de 2026
**Fase actual:** Consolidación de Sorteos y del Core existente.

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
| Activación de módulos | API implementada | Falta comprobar estado del espacio y autorización según rol |
| Panel del usuario | Parcial | Lista espacios y módulos; tarjetas sin acción de apertura |
| Superadmin | Parcial | Resumen/listados; respuestas concurrentes y dos errores de lint pendientes |
| S3 | Integración presente | Conectividad y flujo de archivos no verificados |
| PWA | Pendiente | Portada anuncia instalación; no se encontró manifest ni service worker |
| Otras microapps | Pendientes | Catálogo público las muestra como «Próximamente» |
| Producción | No verificada | No se comprobó despliegue ni servicios externos |

## P0 · Corregir autorización de módulos

**Próxima tarea técnica:** endurecer `POST /api/workspaces/:workspaceId/modules/:moduleCode`.

- [ ] Rechazar activaciones en espacios INACTIVE.
- [ ] Definir y aplicar qué roles pueden activar módulos; propuesta pendiente de confirmar: OWNER y ADMIN.
- [ ] Mantener el rechazo de usuarios sin membresía y de módulos inactivos.
- [ ] Verificar permisos con usuarios de dos espacios y con los roles permitidos/restringidos.

**Criterio de aceptación:** un usuario sin permiso o un espacio inactivo no produce cambios en los módulos del espacio.

## P0 · Estabilizar superadmin

- [ ] Evitar que una respuesta anterior sobrescriba los datos de una sección elegida después.
- [ ] Limpiar el estado del panel al cerrar sesión.
- [ ] Corregir los dos errores de `react-hooks/set-state-in-effect`.
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
| Sorteos | Primera herramienta implementada |
| Generador QR | Próximamente en el catálogo |
| Conversor de unidades | Próximamente en el catálogo |
| Notas rápidas | Próximamente en el catálogo |
| Extractor de texto | Próximamente en el catálogo |
| Calculadora de fechas | Próximamente en el catálogo |
| Generador de contraseñas | Próximamente en el catálogo |
| Compresor de imágenes | Próximamente en el catálogo |
| Renombrador de archivos | Próximamente en el catálogo |
| Matrículas, Citas, Sellos, Huéspedes, Acuerdos, Calendario e Incidentes | Ideas futuras; sin orden de implementación confirmado |

### Referencia conservada: Matrículas

El plan anterior contemplaba adaptar la demo `kaplack/demo-nido` (Colores y Sonrisas) para negocios con slug y branding propios, configuración de campañas/niveles, recepción de solicitudes y dashboard de seguimiento.

Si se retoma, reutilizar la demo y diseñar el aislamiento por espacio. Las entidades propuestas eran EnrollmentConfig, EnrollmentLevel y EnrollmentRequest; los estados propuestos: Nuevo, Contactado, En revisión, Confirmado y Descartado. El piloto anterior de 10–20 nidos queda como referencia, sin ejecución priorizada actualmente.

## Límites de alcance

- No construir todas las microapps antes de validar Sorteos.
- No convertir las utilidades públicas en flujos que exijan cuenta innecesariamente.
- No automatizar pagos ni suscripciones antes de definir el modelo comercial.
- No reconstruir Vincu ni ampliar el Core sin una herramienta que lo necesite.

## Evidencia de revisión · 7 de octubre de 2026

| Comprobación | Resultado |
|---|---|
| `npm run build --prefix web` | Correcto |
| `npm run lint --prefix web` | Correcto |
| `npm run build --prefix superadmin` | Correcto |
| `npm run lint --prefix superadmin` | Falla: dos errores en App.jsx, líneas 36 y 105 |
| Pruebas automatizadas del proyecto | No encontradas en la revisión |
| PostgreSQL/S3 y producción | No comprobados |
| Prueba visual/interactiva | Pendiente |

La revisión identificó los pendientes por lectura de código y comprobaciones locales. No se aplicaron correcciones funcionales. Esta actualización modifica únicamente README y backlog para reflejar la prioridad confirmada.
