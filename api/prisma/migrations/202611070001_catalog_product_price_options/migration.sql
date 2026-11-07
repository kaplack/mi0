ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "priceOptions" JSONB NOT NULL DEFAULT '[]';
