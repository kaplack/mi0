INSERT INTO modules (id, code, name, description, active, created_at, updated_at)
VALUES (gen_random_uuid(), 'sorteos', 'Sorteos', 'Elige un ganador al azar de forma rápida y gratis.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;
