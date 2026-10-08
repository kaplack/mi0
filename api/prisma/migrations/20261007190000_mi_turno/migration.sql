CREATE TABLE "TurnQueue" ("id" UUID NOT NULL,"workspaceId" UUID NOT NULL,"code" VARCHAR(16) NOT NULL,"name" VARCHAR(120) NOT NULL,"lastNumber" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "TurnQueue_pkey" PRIMARY KEY ("id"));
CREATE TABLE "TurnTicket" ("id" UUID NOT NULL,"queueId" UUID NOT NULL,"number" INTEGER NOT NULL,"name" VARCHAR(80) NOT NULL,"clientKey" VARCHAR(80) NOT NULL,"status" VARCHAR(16) NOT NULL DEFAULT 'WAITING',"counter" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"calledAt" TIMESTAMP(3),"servedAt" TIMESTAMP(3),CONSTRAINT "TurnTicket_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TurnQueue_workspaceId_key" ON "TurnQueue"("workspaceId");
CREATE UNIQUE INDEX "TurnQueue_code_key" ON "TurnQueue"("code");
CREATE UNIQUE INDEX "TurnTicket_queueId_number_key" ON "TurnTicket"("queueId","number");
CREATE INDEX "TurnTicket_queueId_status_number_idx" ON "TurnTicket"("queueId","status","number");
CREATE INDEX "TurnTicket_queueId_clientKey_status_idx" ON "TurnTicket"("queueId","clientKey","status");
ALTER TABLE "TurnQueue" ADD CONSTRAINT "TurnQueue_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TurnTicket" ADD CONSTRAINT "TurnTicket_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "TurnQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
