# API mi0.app

Express y Prisma con PostgreSQL. `server.js` inicia el servidor y procesos periódicos; `app.js` monta middleware, autenticación, routers y errores. Los routers existentes están en `routes/`; `auth/` gestiona contraseñas/sesiones; `raffles/`, `turnos/` y `citas/` contienen reglas por dominio. `prisma.js` comparte el cliente; `prisma/` conserva schema y migraciones versionadas.

Mi Cita separa HTTP (`routes/citas.js`), servicios/transacciones, validaciones, disponibilidad y mantenimiento en `citas/`. Usa la membresía del workspace; OWNER/ADMIN configuran y MEMBER opera. Los endpoints públicos devuelven solo datos mínimos; los privados se autentican mediante el middleware existente.

Variables: copiar `.env.example` y configurar DATABASE_URL/CORS_ORIGIN; no publicar credenciales. Scripts: `npm run dev`, `npm run db:generate`, `npm run db:migrate:deploy`, `npm run test:citas` y `npm run test:raffles`. Las pruebas de Mi Cita crean esquemas temporales solo en PostgreSQL local.

Consulta [Mi Cita](../docs/MI_CITA.md) y [Sorteos Avanzado](../docs/SORTEOS_AVANZADO.md) para operación, persistencia, configuración y límites de cada dominio.
