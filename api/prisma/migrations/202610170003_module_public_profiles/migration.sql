ALTER TABLE "modules" ADD COLUMN "details" TEXT NOT NULL DEFAULT '';
ALTER TABLE "modules" ADD COLUMN "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE "module_screenshots" (
  "id" UUID NOT NULL PRIMARY KEY,
  "module_id" UUID NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
  "storage_key" VARCHAR(200) NOT NULL,
  "content_type" VARCHAR(40) NOT NULL,
  "caption" VARCHAR(180) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "module_screenshots_module_id_position_idx" ON "module_screenshots"("module_id", "position");
UPDATE "modules" SET "details" = "description" WHERE "description" IS NOT NULL;
