-- Migration: drop PRECIO column from PRODUCTOS table
-- IMPORTANT: Backup your database before running this migration
-- Usage: run in MySQL client connected to ferreteria_maytro database

ALTER TABLE PRODUCTOS
  DROP COLUMN IF EXISTS PRECIO;

-- If your MySQL version doesn't support DROP COLUMN IF EXISTS, use:
-- ALTER TABLE PRODUCTOS DROP COLUMN PRECIO;

-- After running: verify application code no longer expects PRODUCTOS.PRECIO
