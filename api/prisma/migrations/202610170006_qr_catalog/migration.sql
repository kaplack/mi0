

-- CreateTable
CREATE TABLE "qr_catalogs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PEN',
    "whatsapp" VARCHAR(15) NOT NULL DEFAULT '',
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "plan" VARCHAR(10) NOT NULL DEFAULT 'FREE',
    "logoKey" TEXT,
    "logoType" TEXT,

    CONSTRAINT "qr_catalogs_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "catalog_products" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "categoryId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "catalog_product_images" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_product_images_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "qr_catalogs_workspaceId_key" ON "qr_catalogs"("workspaceId");


-- CreateIndex
CREATE UNIQUE INDEX "qr_catalogs_code_key" ON "qr_catalogs"("code");


-- CreateIndex
CREATE UNIQUE INDEX "catalog_categories_workspaceId_id_key" ON "catalog_categories"("workspaceId", "id");


-- CreateIndex
CREATE INDEX "catalog_products_workspaceId_position_idx" ON "catalog_products"("workspaceId", "position");


-- CreateIndex
CREATE INDEX "catalog_product_images_productId_position_idx" ON "catalog_product_images"("productId", "position");


-- AddForeignKey
ALTER TABLE "qr_catalogs" ADD CONSTRAINT "qr_catalogs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_workspaceId_categoryId_fkey" FOREIGN KEY ("workspaceId", "categoryId") REFERENCES "catalog_categories"("workspaceId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "catalog_product_images" ADD CONSTRAINT "catalog_product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE qr_catalogs ADD CONSTRAINT qr_catalog_plan_check CHECK (plan IN ('FREE','PRO'));
ALTER TABLE catalog_products ADD CONSTRAINT catalog_product_price_check CHECK ("priceCents" >= 0);
ALTER TABLE catalog_products ADD CONSTRAINT catalog_product_status_check CHECK (status IN ('AVAILABLE','SOLD_OUT','HIDDEN'));
CREATE UNIQUE INDEX catalog_category_name_unique ON catalog_categories ("workspaceId", lower(name));
INSERT INTO modules (id,code,name,description,active,free,details,features,created_at,updated_at)
VALUES (gen_random_uuid(),'catalogo-qr','Catálogo QR','Muestra tus productos, precios y redes con un enlace y QR permanente.',true,false,'Crea el catálogo de tu negocio y compártelo sin que tus clientes necesiten registrarse. Gratis hasta 30 productos y una foto por producto.',ARRAY['Organiza productos y categorías','Comparte un enlace y QR permanente','Agrega WhatsApp y redes sociales'],now(),now()) ON CONFLICT (code) DO NOTHING;
INSERT INTO "_CategoryToModule" ("A","B") SELECT c.id,m.id FROM categories c, modules m WHERE c.name='Negocios' AND m.code='catalogo-qr' ON CONFLICT DO NOTHING;
