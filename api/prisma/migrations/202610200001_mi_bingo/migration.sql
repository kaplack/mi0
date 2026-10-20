CREATE TABLE "bingo_rooms" (
 "id" UUID NOT NULL PRIMARY KEY, "workspaceId" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE RESTRICT,
 "ownerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "code" VARCHAR(32) NOT NULL UNIQUE,
 "name" VARCHAR(120) NOT NULL, "status" VARCHAR(16) NOT NULL DEFAULT 'WAITING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "bingo_room_status" CHECK ("status" IN ('WAITING','PLAYING','BETWEEN','FINISHED'))
);
CREATE INDEX "bingo_rooms_workspaceId_createdAt_idx" ON "bingo_rooms"("workspaceId", "createdAt");
CREATE UNIQUE INDEX "bingo_one_active_owner" ON "bingo_rooms"("ownerId") WHERE "status" <> 'FINISHED';
CREATE TABLE "bingo_participants" (
 "id" UUID NOT NULL PRIMARY KEY, "roomId" UUID NOT NULL REFERENCES "bingo_rooms"("id") ON DELETE CASCADE,
 "name" VARCHAR(80) NOT NULL, "tokenHash" CHAR(64) NOT NULL, "card" INTEGER[] NOT NULL, "cardKey" VARCHAR(100) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "bingo_card_size" CHECK (cardinality("card") = 25),
 CONSTRAINT "bingo_participants_roomId_tokenHash_key" UNIQUE ("roomId", "tokenHash"),
 CONSTRAINT "bingo_participants_roomId_cardKey_key" UNIQUE ("roomId", "cardKey")
);
CREATE TABLE "bingo_rounds" (
 "id" UUID NOT NULL PRIMARY KEY, "roomId" UUID NOT NULL REFERENCES "bingo_rooms"("id") ON DELETE CASCADE,
 "number" INTEGER NOT NULL, "pattern" VARCHAR(8) NOT NULL, "prize" VARCHAR(120) NOT NULL DEFAULT '',
 "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE', "balls" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
 "winners" JSONB NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedAt" TIMESTAMP(3),
 CONSTRAINT "bingo_round_pattern" CHECK ("pattern" IN ('ONE','TWO','FULL')),
 CONSTRAINT "bingo_round_status" CHECK ("status" IN ('ACTIVE','RESOLVING','CLOSED','CANCELLED')),
 CONSTRAINT "bingo_rounds_roomId_number_key" UNIQUE ("roomId", "number")
);
INSERT INTO "modules" ("id", "code", "name", "description", "active", "free", "updated_at", "details", "features")
VALUES (gen_random_uuid(), 'mi-bingo', 'Mi Bingo', 'Bingo de 75 bolillas, cartones digitales y salas para compartir.', true, true, CURRENT_TIMESTAMP,
 'Organiza un bingo con varias rondas. Comparte el QR y juega desde el celular, sin registro.', ARRAY['Cartones digitales de 75 bolillas','Una línea, dos líneas y cartón lleno','Validación de ganadores y empates','Pantalla pública para tu evento']) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "_CategoryToModule" ("A", "B") SELECT c.id, m.id FROM categories c CROSS JOIN modules m WHERE c.name='Utilidades' AND m.code='mi-bingo' ON CONFLICT DO NOTHING;
