# Mi Bingo · MVP local

## Probar

1. Inicia API y web con `npm run dev:api` y `npm run dev:web`. Esta entrega está disponible en http://localhost:5174/mi-bingo y API en http://localhost:3000.
2. Inicia sesión, selecciona un espacio propio y crea una sala. También puedes agregar Mi Bingo a tu espacio desde Explorar microapps.
3. Copia el enlace de sala y ábrelo en otro navegador o perfil privado. Cada perfil conserva una identidad por sala; varias pestañas del mismo perfil recuperan el mismo cartón.
4. Escribe tu nombre, recibe el cartón y vuelve al organizador para iniciar ronda. Selecciona una línea horizontal, dos líneas horizontales o cartón lleno y un premio opcional.
5. Saca bolillas, marca/desmarca y prueba recargar. ¡BINGO! se valida con cartón y bolillas del servidor, independientemente de las marcas.
6. El primer bingo válido congela sorteos. Otros jugadores pueden reclamar hasta que el organizador cierre reclamaciones y confirme. Sin temporizador automático.
7. Otra ronda conserva cartones, limpia marcas y reinicia bolillas. Entre rondas se admiten jugadores nuevos. Cerrar sin ganadores registra la ronda como cancelada.
8. Abre Pantalla pública en otra ventana. Finaliza la sala y consulta Historial. Puedes crear otra sala al finalizar.

Para teléfonos físicos, localhost apunta al teléfono. Se requiere servir web/API en una dirección accesible de la red local, ajustar las variables existentes VITE_API_URL y CORS_ORIGIN y compartir el enlace desde esa dirección. La configuración actual permite pruebas entre perfiles del mismo equipo.

## Datos y funcionamiento

- Migración `api/prisma/migrations/202610200001_mi_bingo/migration.sql` aplicada solo a PostgreSQL local. Registra la microapp en el catálogo. Sin variables nuevas.
- PostgreSQL guarda salas, participantes/cartones y rondas con bolillas ordenadas y ganadores. No hay estado autoritativo en memoria.
- Un solo evento activo por organizador, incluso entre espacios; índice parcial y bloqueo del organizador al crear. Solo el creador y propietario del espacio activo puede administrar.
- Mutaciones bloquean la sala en transacción. Sorteo compara ronda y cantidad esperada de bolillas para rechazar solicitudes duplicadas. Reclamos se serializan con sorteo/cierre.
- Token aleatorio de 256 bits en almacenamiento local, enviado por POST; BD guarda solo hash. No aparece en enlaces ni respuestas públicas. Recuperación en el mismo navegador: borrar datos o cambiar dispositivo pierde esa identidad.
- Marcas locales por participante/ronda, sin escrituras en BD. Consultas cada 1,5 s, 6 s con pestaña oculta; paran al finalizar y reintentan ante fallos.
- Tope de 500 participantes/sala y límites HTTP básicos por proceso, compatibles con Wi-Fi compartida. No constituyen garantía de capacidad ni protección distribuida.
- Las vistas públicas muestran evento y nombres de ganadores. Inscritos y cartones completos se limitan a sus accesos correspondientes.

## Verificación mínima

- `npm run test:bingo --prefix api`: tres pruebas de reglas y un recorrido integrado con esquema PostgreSQL temporal. Rangos, centro libre, sorteo completo, patrones, recuperación, permisos, bloqueo de altas, sorteo concurrente, empates simultáneos, conservación del cartón y transiciones.
- La integración configura el final de una ronda con 75 bolillas para probar empate; no es prueba de carga.
- Build correcto y lint de archivos frontend afectados correcto. Lint global tiene tres errores anteriores en CatalogSettings.jsx y ProductEditor.jsx, fuera del cambio.
- Smoke en Chrome: organizador 1440 px, jugador 390 px, ingreso, sorteo, marcas tras recarga, limpieza por nueva ronda, pantalla pública, sin overflow móvil ni errores JavaScript. Capturas revisadas en `.tmp/bingo-desktop.png`, `.tmp/bingo-mobile.png` y `.tmp/bingo-display.png`.
- Pendiente prueba de 30 jugadores y regresión completa de otras microapps, conforme a pruebas mínimas solicitadas. Sin push ni despliegue.

## Archivos

- `api/bingo/` y `api/routes/bingo.js`: reglas, servicio y pruebas.
- Prisma schema/migración: modelos, restricciones y catálogo.
- `web/src/microapps/mi-bingo/` y `web/src/services/bingo.js`: vistas, estilos, consultas e identidad.
- `api/app.js`, `web/src/App.jsx`, catálogo y ExploreMicroapps: integración.
- `api/workspaces/service.js`: impide borrar espacios con historial de bingo.
