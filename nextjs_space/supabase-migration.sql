-- ============================================
-- RedLeg Hardwood Calculator — Supabase Migration
-- ============================================
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- This creates all tables from scratch.
-- Safe to run on a fresh database.

-- CreateTable: suppliers
CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "email" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "delivery_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: price_sheets
CREATE TABLE IF NOT EXISTS "price_sheets" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "thickness_quarters" INTEGER NOT NULL,
    "price_per_bf" DOUBLE PRECISION NOT NULL,
    "width_qualifier" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "price_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: projects
CREATE TABLE IF NOT EXISTS "projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_items
CREATE TABLE IF NOT EXISTS "project_items" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "grade" TEXT DEFAULT '',
    "thickness_quarters" INTEGER,
    "width_inches" DOUBLE PRECISION,
    "length_inches" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "board_feet" DOUBLE PRECISION,
    "price_per_bf" DOUBLE PRECISION,
    "total_cost" DOUBLE PRECISION,
    CONSTRAINT "project_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: settings
CREATE TABLE IF NOT EXISTS "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex: unique composite on price_sheets
CREATE UNIQUE INDEX IF NOT EXISTS "price_sheets_supplier_id_species_grade_thickness_quarters_w_key"
    ON "price_sheets"("supplier_id", "species", "grade", "thickness_quarters", "width_qualifier");

-- AddForeignKey: price_sheets → suppliers (CASCADE)
ALTER TABLE "price_sheets"
    ADD CONSTRAINT "price_sheets_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: project_items → projects (CASCADE)
ALTER TABLE "project_items"
    ADD CONSTRAINT "project_items_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default settings
INSERT INTO "settings" ("key", "value") VALUES
    ('default_tax_rate', '0'),
    ('dark_mode', 'true'),
    ('default_supplier_id', '')
ON CONFLICT ("key") DO NOTHING;

-- uploaded_documents table
CREATE TABLE IF NOT EXISTS "uploaded_documents" (
    "id"            SERIAL PRIMARY KEY,
    "supplier_id"   INTEGER NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
    "supplier_name" TEXT NOT NULL DEFAULT '',
    "file_name"     TEXT NOT NULL DEFAULT '',
    "uploaded_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "inserted"      INTEGER NOT NULL DEFAULT 0,
    "updated"       INTEGER NOT NULL DEFAULT 0,
    "total"         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "uploaded_documents_supplier_id_idx" ON "uploaded_documents"("supplier_id");

-- Add file_url column for PDF storage links
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
