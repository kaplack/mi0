ALTER TABLE "TurnQueue" ADD COLUMN "dashboardUntil" TIMESTAMP(3);
CREATE TABLE "TurnDashboardPayment" (
 "id" UUID NOT NULL, "queueId" UUID NOT NULL, "requestedById" UUID NOT NULL, "reviewedById" UUID,
 "plan" VARCHAR(16) NOT NULL, "amountCents" INTEGER NOT NULL, "reference" VARCHAR(80) NOT NULL,
 "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING', "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "reviewedAt" TIMESTAMP(3), "rejectionReason" VARCHAR(300), "validFrom" TIMESTAMP(3), "validUntil" TIMESTAMP(3),
 CONSTRAINT "TurnDashboardPayment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "TurnDashboardPayment_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "TurnQueue"("id") ON DELETE CASCADE,
 CONSTRAINT "TurnDashboardPayment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT,
 CONSTRAINT "TurnDashboardPayment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL,
 CONSTRAINT "TurnDashboardPayment_plan_check" CHECK (("plan" = 'MONTHLY' AND "amountCents" = 1000) OR ("plan" = 'ANNUAL' AND "amountCents" = 7900)),
 CONSTRAINT "TurnDashboardPayment_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED'))
);
CREATE UNIQUE INDEX "TurnDashboardPayment_reference_key" ON "TurnDashboardPayment"("reference");
CREATE UNIQUE INDEX "TurnDashboardPayment_pending_queue" ON "TurnDashboardPayment"("queueId") WHERE "status" = 'PENDING';
CREATE INDEX "TurnDashboardPayment_queueId_requestedAt_idx" ON "TurnDashboardPayment"("queueId", "requestedAt");
CREATE INDEX "TurnDashboardPayment_status_requestedAt_idx" ON "TurnDashboardPayment"("status", "requestedAt");
CREATE INDEX "TurnTicket_queueId_createdAt_idx" ON "TurnTicket"("queueId", "createdAt");
