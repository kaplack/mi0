-- Soporte para multiples cartones por participante en Mi Bingo
-- 1. Agregar columna cards (JSONB) para almacenar la lista de cartones [[25 num], [25 num]]
ALTER TABLE "bingo_participants" ADD COLUMN IF NOT EXISTS "cards" JSONB;

-- 2. Migrar los cartones existentes de card -> cards
UPDATE "bingo_participants" SET "cards" = jsonb_build_array(to_jsonb("card")) WHERE "cards" IS NULL;

-- 3. Asignar default vacio
ALTER TABLE "bingo_participants" ALTER COLUMN "cards" SET DEFAULT '[]'::jsonb;
