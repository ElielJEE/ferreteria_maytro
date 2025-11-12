-- Patch: Rename PRODUCTOS.CANTIDAD_STOCK -> PRODUCTOS.CANTIDAD
-- WARNING: Backup your database before running this.
-- Example backup command (run in shell):
-- mysqldump -u root -p ferreteria_maytro > ferreteria_backup.sql

ALTER TABLE PRODUCTOS
  CHANGE COLUMN `CANTIDAD_STOCK` `CANTIDAD` DECIMAL(12,2) DEFAULT NULL;

-- If your column contains non-numeric values, consider cleaning/converting them first.
-- Example to convert strings containing integers to decimal (run only if safe):
-- UPDATE PRODUCTOS SET CANTIDAD_STOCK = TRIM(CANTIDAD_STOCK) WHERE CANTIDAD_STOCK IS NOT NULL;
-- Then run the ALTER TABLE.
