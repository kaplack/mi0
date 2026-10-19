CREATE TABLE workspace_public_addresses (
 slug VARCHAR(80) PRIMARY KEY,
 "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "workspace_public_addresses_workspaceId_idx" ON workspace_public_addresses("workspaceId");
INSERT INTO workspace_public_addresses(slug,"workspaceId") SELECT "publicSlug",id FROM workspaces WHERE "publicSlug" IS NOT NULL;
