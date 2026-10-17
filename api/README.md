# API mi0.app

## Archivos: base preparada para futuras funcionalidades

En desarrollo, el almacenamiento usa por defecto `api/uploads/`, fuera de Git. Se puede configurar con `STORAGE_DRIVER=local` y `LOCAL_UPLOAD_DIR=uploads` (ruta relativa a `api/`, o absoluta). La carpeta se crea al guardar el primer archivo.

En producción el valor por defecto es `s3`; al preparar variables desde `.env.example`, usar `STORAGE_DRIVER=s3`. El modo local se rechaza en producción y no existe fallback automático. El cliente S3, sus credenciales y `/api/s3-health` se mantienen sin cambios. Los métodos S3 nuevos solo hacen solicitudes cuando una funcionalidad los invoca.

Los routers pueden usar `req.app.locals.storage` con `save({ buffer, extension, contentType, visibility })`, `read(key)` y `remove(key)`. `save` devuelve `{ key, size, contentType }`; guardar la clave en la base de datos. El nombre se genera con UUID; `extension` se pasa sin punto. La visibilidad predeterminada es `private`.

Solo los archivos guardados como `public` se sirven localmente en `http://localhost:3000/uploads/public/<nombre>`. Los privados requieren una futura ruta que valide permisos antes de llamar a `read`. En S3 la visibilidad es un prefijo de clave; no modifica políticas ni ACL del bucket y no garantiza acceso público.

Ejemplo para una futura función que ya haya validado una imagen:

```js
const file = await req.app.locals.storage.save({
  buffer: validatedImageBuffer,
  extension: 'jpg',
  contentType: 'image/jpeg',
  visibility: 'public',
});
// Persistir file.key, por ejemplo public/<uuid>.jpg.
```

Todavía no se habilita un endpoint de subida. Cada funcionalidad deberá incorporar autenticación, permisos, límites de tamaño y validación del contenido real de imágenes (no confiar solo en extensión/MIME). No publicar HTML o SVG sin una política específica. `read` devuelve el archivo completo en memoria y debe usarse con archivos de tamaño limitado.

Express y Prisma con PostgreSQL. `server.js` inicia el servidor y procesos periódicos; `app.js` monta middleware, autenticación, routers y errores. Los routers existentes están en `routes/`; `auth/` gestiona contraseñas/sesiones; `raffles/`, `turnos/` y `citas/` contienen reglas por dominio. `prisma.js` comparte el cliente; `prisma/` conserva schema y migraciones versionadas.

Mi Cita separa HTTP (`routes/citas.js`), servicios/transacciones, validaciones, disponibilidad y mantenimiento en `citas/`. Usa la membresía del workspace; OWNER/ADMIN configuran y MEMBER opera. Los endpoints públicos devuelven solo datos mínimos; los privados se autentican mediante el middleware existente.

Variables: copiar `.env.example` y configurar DATABASE_URL/CORS_ORIGIN; no publicar credenciales. Scripts: `npm run dev`, `npm run db:generate`, `npm run db:migrate:deploy`, `npm run test:citas` y `npm run test:raffles`. Las pruebas de Mi Cita crean esquemas temporales solo en PostgreSQL local.

Consulta [Mi Cita](../docs/MI_CITA.md) y [Sorteos Avanzado](../docs/SORTEOS_AVANZADO.md) para operación, persistencia, configuración y límites de cada dominio.

## Categorías del catálogo

Aplicar la migración `202610170001_catalog_categories` con `npm run db:migrate:deploy` y regenerar el cliente con `npm run db:generate` (detener primero la API si Windows mantiene la DLL de Prisma en uso).

- Público: `GET /api/catalog` devuelve categorías y microapps activas, sin datos de usuarios o espacios.
- Solo SUPERADMIN: `GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/:id` y `PATCH /api/admin/modules/:id/catalog`.
- Clasificación: `{ "categoryIds": ["uuid"], "free": true }`. Varias categorías por microapp; `free` significa totalmente gratis y no modifica precios ni permisos de funciones.
- No se eliminan categorías asociadas a microapps; reasignarlas primero. Nombres únicos sin distinguir mayúsculas; Todas y Gratis son filtros reservados.
- Verificación: `npm run test:catalog` usa PostgreSQL local y crea/elimina un esquema aislado. Incluye navegador Chrome mediante Playwright de web; no toca datos de la instalación habitual. Capturas en `web/test-results/catalog/`.

### Fichas públicas de microapps

El superadmin edita la descripción breve, descripción completa, funciones y capturas desde **Microapps → Gestionar → Ficha pública**. Las imágenes se cargan automáticamente como borradores privados. Guardar publica de forma conjunta los textos, capturas, descripciones y orden, y retira las fotos quitadas de la galería. Se permiten hasta 8 capturas PNG/JPEG/WebP de 5 MB cada una, usando el storage configurado (local en desarrollo, S3 en producción).

La ficha pública está en `/microapps/:code`; sus datos se consultan en `GET /api/catalog/:code`. Las imágenes se sirven desde `GET /api/catalog/:code/images/:imageId`. Las microapps desactivadas no exponen su ficha por estas rutas. La vista previa del superadmin puede consultar sus imágenes con autenticación incluso si están desactivadas.

Aplicar las migraciones y ejecutar `npm run db:generate` al actualizar el modelo. `npm run test:profiles` verifica permisos, imágenes, validación y el recorrido completo de edición y lectura pública con una base de datos aislada y almacenamiento de prueba.
