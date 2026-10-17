BEGIN;

-- Keep installed microapps safe if this migration reaches a different database.
LOCK TABLE "workspace_modules" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "workspace_modules" wm
    JOIN "modules" m ON m.id = wm.module_id
    WHERE m.code IN (
      'qr-generator', 'unit-converter', 'quick-notes', 'text-extractor',
      'date-calculator', 'password-generator', 'image-compressor', 'file-renamer'
    )
  ) THEN
    RAISE EXCEPTION 'Cannot remove placeholder microapps with existing workspace associations';
  END IF;
END $$;

DELETE FROM "modules"
WHERE code IN (
  'qr-generator', 'unit-converter', 'quick-notes', 'text-extractor',
  'date-calculator', 'password-generator', 'image-compressor', 'file-renamer'
);

COMMIT;
