CREATE TABLE "TurnOperator" (
 "id" UUID NOT NULL, "queueId" UUID NOT NULL, "userId" UUID NOT NULL, "counter" INTEGER NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TurnOperator_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "TurnOperator_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "TurnQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "TurnOperator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TurnOperator_queueId_userId_key" ON "TurnOperator"("queueId","userId");
CREATE INDEX "TurnOperator_queueId_counter_idx" ON "TurnOperator"("queueId","counter");
CREATE TABLE "TurnInvitation" (
 "id" UUID NOT NULL, "queueId" UUID NOT NULL, "email" VARCHAR(254) NOT NULL, "counter" INTEGER NOT NULL,
 "tokenHash" CHAR(64) NOT NULL, "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acceptedAt" TIMESTAMP(3),
 CONSTRAINT "TurnInvitation_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "TurnInvitation_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "TurnQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TurnInvitation_tokenHash_key" ON "TurnInvitation"("tokenHash");
CREATE UNIQUE INDEX "TurnInvitation_queueId_email_key" ON "TurnInvitation"("queueId","email");
ALTER TABLE "TurnTicket" ADD COLUMN "calledById" UUID;
ALTER TABLE "TurnTicket" ADD CONSTRAINT "TurnTicket_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
