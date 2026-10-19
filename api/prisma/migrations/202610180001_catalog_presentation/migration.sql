ALTER TABLE qr_catalogs ADD COLUMN presentation VARCHAR(10) NOT NULL DEFAULT 'CATALOG';
ALTER TABLE qr_catalogs ADD CONSTRAINT qr_catalog_presentation_check CHECK (presentation IN ('CATALOG','MENU'));
-- Preserve the business name already shown to the user when the initial workspace still has its placeholder name.
UPDATE workspaces w SET name=c.name FROM qr_catalogs c WHERE c."workspaceId"=w.id AND w.name='Mi espacio' AND c.name<>'Mi espacio';
UPDATE qr_catalogs c SET name=w.name FROM workspaces w WHERE c."workspaceId"=w.id;
