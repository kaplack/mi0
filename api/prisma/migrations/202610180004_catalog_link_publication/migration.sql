ALTER TABLE qr_catalogs ADD COLUMN "linkLocked" BOOLEAN NOT NULL DEFAULT false;
UPDATE qr_catalogs SET "linkLocked"=true WHERE published=true;
CREATE TABLE catalog_link_requests (
 id UUID PRIMARY KEY, "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "requestedById" UUID NOT NULL, "requestedSlug" VARCHAR(60) NOT NULL, reason VARCHAR(300) NOT NULL,
 status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3), "reviewedById" UUID
);
CREATE INDEX "catalog_link_requests_workspaceId_createdAt_idx" ON catalog_link_requests("workspaceId","createdAt");
CREATE UNIQUE INDEX catalog_link_one_pending ON catalog_link_requests("workspaceId") WHERE status='PENDING';
