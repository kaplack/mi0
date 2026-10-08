ALTER TABLE "TurnTicket" ADD COLUMN "endedAt" TIMESTAMP(3);

-- Preserve known completion times; unknown historic outcomes remain null.
UPDATE "TurnTicket" SET "endedAt" = "servedAt" WHERE "servedAt" IS NOT NULL;
