ALTER TABLE workspaces ADD COLUMN "publicSlug" VARCHAR(80);
CREATE UNIQUE INDEX "workspaces_publicSlug_key" ON workspaces("publicSlug");
-- Existing catalogs receive a readable address while their original code links remain valid.
DO $$
DECLARE entry RECORD; base TEXT; candidate TEXT; suffix INTEGER;
BEGIN
 FOR entry IN SELECT w.id,w.name FROM workspaces w JOIN qr_catalogs c ON c."workspaceId"=w.id ORDER BY w.id LOOP
  base := trim(both '-' from left(regexp_replace(lower(translate(entry.name,'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')),'[^a-z0-9]+','-','g'),50));
  IF length(base)<3 OR base IN ('api','admin','uploads','catalogo','catalogo-qr','microapps','mi-cita','mi-turno','auth','login','registro','s','turno','cita') THEN base := 'mi-negocio'; END IF;
  candidate := base; suffix := 1;
  WHILE EXISTS(SELECT 1 FROM workspaces WHERE "publicSlug"=candidate) LOOP
   suffix := suffix+1; candidate := base || '-' || suffix::text;
  END LOOP;
  UPDATE workspaces SET "publicSlug"=candidate WHERE id=entry.id;
 END LOOP;
END $$;
