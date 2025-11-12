-- Migration: 2025-11-12
-- Add unidad fields to FACTURA_DETALLES to support selling by different units
-- Safe operations using IF NOT EXISTS where supported (MySQL 8+)

-- UP: add columns (non-destructive defaults for backward compatibility)
ALTER TABLE FACTURA_DETALLES
  ADD COLUMN IF NOT EXISTS UNIDAD_ID INT NULL AFTER ID_PRODUCT,
  ADD COLUMN IF NOT EXISTS CANTIDAD_POR_UNIDAD DECIMAL(12,4) NOT NULL DEFAULT 1.0000 AFTER AMOUNT,
  ADD COLUMN IF NOT EXISTS UNIDAD_NOMBRE VARCHAR(100) NULL AFTER UNIDAD_ID;

-- Backfill sensible default for existing rows (if any)
UPDATE FACTURA_DETALLES
SET CANTIDAD_POR_UNIDAD = 1.0000
WHERE CANTIDAD_POR_UNIDAD IS NULL;

-- OPTIONAL: add foreign key to unidades_medidas if that table exists and you want referential integrity.
-- Uncomment and run only if you're sure unidades_medidas.ID_UNIDAD exists and no FK with same name already exists.
-- ALTER TABLE FACTURA_DETALLES
--   ADD CONSTRAINT fk_factura_detalles_unidad FOREIGN KEY (UNIDAD_ID)
--   REFERENCES unidades_medidas (ID_UNIDAD)
--   ON UPDATE CASCADE
--   ON DELETE SET NULL;

-- DOWN: rollback (use with caution in production)
-- To rollback, uncomment and run the following:
-- ALTER TABLE FACTURA_DETALLES
--   DROP COLUMN IF EXISTS UNIDAD_NOMBRE,
--   DROP COLUMN IF EXISTS CANTIDAD_POR_UNIDAD,
--   DROP COLUMN IF EXISTS UNIDAD_ID;

-- Notes:
-- 1) MySQL supports ADD COLUMN IF NOT EXISTS and DROP COLUMN IF EXISTS in 8.0+. If your server is older, run the migration manually after checking
--    the schema (information_schema.COLUMNS) to avoid errors.
-- 2) The application code expects these columns to exist. If you deploy the backend changes before running this migration, the backend will
--    detect the absence of columns and behave with compatibility (assuming multiplicador=1). However for full functionality run this migration.
-- 3) If you prefer a migration tool (Flyway, liquibase, knex, etc.), convert this script accordingly.
