-- CreateTable
CREATE TABLE "catalog_guests" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "adminHash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_guests_workspaceId_key" ON "catalog_guests"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_guests_adminHash_key" ON "catalog_guests"("adminHash");

-- AddForeignKey
ALTER TABLE "catalog_guests" ADD CONSTRAINT "catalog_guests_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
