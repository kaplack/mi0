ALTER TABLE "TurnQueue"
  ADD COLUMN "documentMode" VARCHAR(16) NOT NULL DEFAULT 'NONE',
  ADD COLUMN "counterNames" JSONB NOT NULL DEFAULT '["Ventanilla 1"]';
ALTER TABLE "TurnTicket"
  ADD COLUMN "documentType" VARCHAR(8),
  ADD COLUMN "documentNumber" VARCHAR(20);

-- Keep existing ticket-to-counter references valid when upgrading an existing queue.
UPDATE "TurnQueue" q SET "counterNames" = (
  SELECT jsonb_agg('Ventanilla ' || n ORDER BY n)
  FROM generate_series(1, GREATEST(1, COALESCE(
    (SELECT MAX(t."counter") FROM "TurnTicket" t WHERE t."queueId" = q."id"), 1))) AS n
);
