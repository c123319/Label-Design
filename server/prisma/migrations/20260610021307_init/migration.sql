-- CreateTable
CREATE TABLE "label_template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "template_json" TEXT NOT NULL,
    "canvas_unit" TEXT DEFAULT 'mm',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "data_source_id" TEXT,
    CONSTRAINT "label_template_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "label_data_source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "label_data_source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "fields_json" TEXT NOT NULL,
    "preview_json" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "rows_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "label_template_binding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template_id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "element_type" TEXT NOT NULL,
    "binding_type" TEXT NOT NULL,
    "field_code" TEXT,
    "template_text" TEXT,
    "default_value" TEXT,
    "extra_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "label_template_binding_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "label_template" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "label_render_job" (
    "job_id" TEXT NOT NULL PRIMARY KEY,
    "template_id" TEXT,
    "data_source_id" TEXT,
    "output_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "success" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "progress" REAL NOT NULL DEFAULT 0,
    "errors_json" TEXT,
    "zip_path" TEXT,
    "zip_file_name" TEXT,
    "download_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    CONSTRAINT "label_render_job_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "label_template" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "label_render_job_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "label_data_source" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "label_template_binding_template_id_idx" ON "label_template_binding"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "label_template_binding_template_id_element_id_key" ON "label_template_binding"("template_id", "element_id");

-- CreateIndex
CREATE INDEX "label_render_job_status_idx" ON "label_render_job"("status");

-- CreateIndex
CREATE INDEX "label_render_job_created_at_idx" ON "label_render_job"("created_at");
