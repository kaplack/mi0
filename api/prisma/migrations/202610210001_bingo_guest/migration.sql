CREATE TABLE "bingo_guests" (
 "id" UUID PRIMARY KEY, "adminHash" CHAR(64) NOT NULL UNIQUE,
 "recoveryHash" CHAR(64), "recoveryCode" VARCHAR(32), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "bingo_rooms" ALTER COLUMN "workspaceId" DROP NOT NULL, ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE "bingo_rooms"
 ADD COLUMN "guestId" UUID REFERENCES "bingo_guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN "participantLimit" INTEGER NOT NULL DEFAULT 50,
 ADD COLUMN "lastAdminAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "expiresAt" TIMESTAMP(3), ADD COLUMN "deleteAfter" TIMESTAMP(3);
-- Keep every existing participant in legacy rooms, even above the new limit.
UPDATE "bingo_rooms" r SET "participantLimit" = GREATEST(50, (SELECT COUNT(*)::int FROM "bingo_participants" p WHERE p."roomId"=r.id));
ALTER TABLE "bingo_rooms" ADD CONSTRAINT "bingo_owner_kind" CHECK (
 ("ownerId" IS NOT NULL AND "workspaceId" IS NOT NULL AND "guestId" IS NULL) OR
 ("ownerId" IS NULL AND "workspaceId" IS NULL AND "guestId" IS NOT NULL)
);
ALTER TABLE "bingo_rooms" ADD CONSTRAINT "bingo_capacity" CHECK ("participantLimit" >= 30);
CREATE UNIQUE INDEX "bingo_one_active_guest" ON "bingo_rooms"("guestId") WHERE "status" <> 'FINISHED';
CREATE INDEX "bingo_rooms_expiresAt_idx" ON "bingo_rooms"("expiresAt");
CREATE INDEX "bingo_rooms_deleteAfter_idx" ON "bingo_rooms"("deleteAfter");
