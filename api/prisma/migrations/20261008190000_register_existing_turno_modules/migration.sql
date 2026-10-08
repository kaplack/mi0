INSERT INTO "modules" ("id", "code", "name", "description", "active", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'mi-turno', 'Mi Turno', 'Cola virtual, ventanillas y pantalla pública para tu negocio.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Existing configured queues belong to their workspace; preserve explicit disabled associations.
INSERT INTO "workspace_modules" ("workspace_id", "module_id", "active", "created_at", "updated_at")
SELECT q."workspaceId", m."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TurnQueue" q CROSS JOIN "modules" m
WHERE m."code" = 'mi-turno' AND m."active" = true
ON CONFLICT ("workspace_id", "module_id") DO NOTHING;
