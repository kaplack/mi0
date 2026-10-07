CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'ORGANIZATION');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE "workspaces" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "type" "WorkspaceType" NOT NULL DEFAULT 'ORGANIZATION',
  "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
  "user_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id", "workspace_id")
);

CREATE TABLE "workspace_modules" (
  "workspace_id" UUID NOT NULL,
  "module_id" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspace_modules_pkey" PRIMARY KEY ("workspace_id", "module_id")
);

CREATE INDEX "memberships_workspace_id_idx" ON "memberships"("workspace_id");
CREATE INDEX "workspace_modules_module_id_idx" ON "workspace_modules"("module_id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_modules" ADD CONSTRAINT "workspace_modules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_modules" ADD CONSTRAINT "workspace_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing regular user receives the same personal workspace that new users get.
INSERT INTO "workspaces" ("id", "name", "type", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Mi espacio', 'PERSONAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users"
WHERE "role" = 'USER';

INSERT INTO "memberships" ("user_id", "workspace_id", "role", "created_at")
SELECT u."id", w."id", 'OWNER', CURRENT_TIMESTAMP
FROM "users" u
JOIN LATERAL (
  SELECT ws."id"
  FROM "workspaces" ws
  WHERE ws."type" = 'PERSONAL'
    AND NOT EXISTS (SELECT 1 FROM "memberships" m WHERE m."workspace_id" = ws."id")
  ORDER BY ws."created_at", ws."id"
  LIMIT 1
) w ON TRUE
WHERE u."role" = 'USER'
  AND NOT EXISTS (SELECT 1 FROM "memberships" m WHERE m."user_id" = u."id");

-- The old Business model had no user ownership yet, so there is no safe automatic
-- mapping to Workspace. It remains untouched in this migration to avoid data loss.
