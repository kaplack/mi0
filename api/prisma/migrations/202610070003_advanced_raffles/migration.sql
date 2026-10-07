-- CreateEnum
CREATE TYPE "RaffleStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RafflePublicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "raffles" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "RaffleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "drawn_at" TIMESTAMP(3),
    "public_code" VARCHAR(32),
    "published_at" TIMESTAMP(3),

    CONSTRAINT "raffles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_participants" (
    "id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "raffle_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_prizes" (
    "id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "raffle_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_results" (
    "id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "prize_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "drawn_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raffle_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raffle_publications" (
    "id" UUID NOT NULL,
    "raffle_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "reference" VARCHAR(40) NOT NULL,
    "amount_cents" INTEGER NOT NULL DEFAULT 490,
    "status" "RafflePublicationStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" VARCHAR(300),

    CONSTRAINT "raffle_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raffles_public_code_key" ON "raffles"("public_code");

-- CreateIndex
CREATE INDEX "raffles_workspace_id_created_at_idx" ON "raffles"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_participants_raffle_id_id_key" ON "raffle_participants"("raffle_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_participants_raffle_id_order_key" ON "raffle_participants"("raffle_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_prizes_raffle_id_id_key" ON "raffle_prizes"("raffle_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_prizes_raffle_id_order_key" ON "raffle_prizes"("raffle_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_results_raffle_id_prize_id_key" ON "raffle_results"("raffle_id", "prize_id");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_results_raffle_id_participant_id_key" ON "raffle_results"("raffle_id", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "raffle_publications_reference_key" ON "raffle_publications"("reference");

-- CreateIndex
CREATE INDEX "raffle_publications_status_requested_at_idx" ON "raffle_publications"("status", "requested_at");

-- CreateIndex
CREATE INDEX "raffle_publications_raffle_id_requested_at_idx" ON "raffle_publications"("raffle_id", "requested_at");

-- AddForeignKey
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_participants" ADD CONSTRAINT "raffle_participants_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_prizes" ADD CONSTRAINT "raffle_prizes_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_results" ADD CONSTRAINT "raffle_results_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_results" ADD CONSTRAINT "raffle_results_raffle_id_prize_id_fkey" FOREIGN KEY ("raffle_id", "prize_id") REFERENCES "raffle_prizes"("raffle_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_results" ADD CONSTRAINT "raffle_results_raffle_id_participant_id_fkey" FOREIGN KEY ("raffle_id", "participant_id") REFERENCES "raffle_participants"("raffle_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_publications" ADD CONSTRAINT "raffle_publications_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_publications" ADD CONSTRAINT "raffle_publications_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raffle_publications" ADD CONSTRAINT "raffle_publications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Only implemented advanced tool is added; no existing modules or workspace data are removed.
INSERT INTO "modules" ("id", "code", "name", "description", "active", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'sorteos-avanzado', 'Sorteos Avanzado', 'Varios premios y resultados guardados. Publica y comparte por S/4.90.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "raffle_publications" ADD CONSTRAINT "raffle_publications_amount_check" CHECK ("amount_cents" = 490);
CREATE UNIQUE INDEX "raffle_publications_one_pending" ON "raffle_publications" ("raffle_id") WHERE "status" = 'PENDING';