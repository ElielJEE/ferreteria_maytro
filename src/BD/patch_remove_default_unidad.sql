-- Patch: remove DEFAULT_UNIDAD_ID from productos (drop FK, index, column)
-- IMPORTANT: BACKUP your DB before running this script.
-- This script will try to drop the foreign key and index named in the original dump, then drop the column.

/*
Run in MySQL client (example):
mysql -u user -p ferreteria_maytro < src/BD/patch_remove_default_unidad.sql
Or execute the statements interactively.
*/

-- Drop foreign key (may fail if constraint name differs or doesn't exist)
ALTER TABLE productos DROP FOREIGN KEY IF EXISTS fk_productos_unidad;

-- Drop index (may fail if name differs or doesn't exist)
DROP INDEX IF EXISTS idx_productos_default_unidad ON productos;

-- Finally drop the column (IF EXISTS supported in recent MySQL)
ALTER TABLE productos DROP COLUMN IF EXISTS DEFAULT_UNIDAD_ID;

-- Note: IF EXISTS in DROP FOREIGN KEY is supported in MySQL 8.0.23+; if your MySQL version doesn't support
-- "DROP FOREIGN KEY IF EXISTS" use the following safer sequence manually to discover and drop the FK:
--
-- SELECT CONSTRAINT_NAME
-- FROM information_schema.KEY_COLUMN_USAGE
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'DEFAULT_UNIDAD_ID' AND REFERENCED_TABLE_NAME = 'unidades_medidas';
--
-- Then run: ALTER TABLE productos DROP FOREIGN KEY <constraint_name>;

-- After running, verify table structure:
-- SHOW CREATE TABLE productos\G

COMMIT;
