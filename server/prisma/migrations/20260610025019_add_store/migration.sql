-- CreateTable
CREATE TABLE "label_store_template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mm',
    "thumbnail" TEXT NOT NULL,
    "template_json" TEXT NOT NULL,
    "tags_json" TEXT NOT NULL DEFAULT '[]',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "label_store_category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "collapsible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "label_store_asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "thumbnail" TEXT,
    "content" TEXT,
    "tags_json" TEXT NOT NULL DEFAULT '[]',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "label_store_template_category_idx" ON "label_store_template"("category");

-- CreateIndex
CREATE INDEX "label_store_template_featured_idx" ON "label_store_template"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "label_store_category_code_key" ON "label_store_category"("code");

-- CreateIndex
CREATE INDEX "label_store_asset_category_idx" ON "label_store_asset"("category");

-- CreateIndex
CREATE INDEX "label_store_asset_type_idx" ON "label_store_asset"("type");
