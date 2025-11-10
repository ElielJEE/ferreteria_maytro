-- Seed custom: roles, sucursales, usuarios, categorias, subcategorias, productos y stock
-- Diseñado para MySQL (Workbench) y para importar en la DB ferreteria_maytro

USE ferreteria_maytro;

SET FOREIGN_KEY_CHECKS = 0;

-- Roles
INSERT INTO ROL (ID_ROL, ROL_NAME)
VALUES
  (1, 'Administrador'),
  (2, 'Gerente'),
  (3, 'Vendedor')
ON DUPLICATE KEY UPDATE ROL_NAME = VALUES(ROL_NAME);

-- Sucursales
INSERT INTO SUCURSAL (ID_SUCURSAL, NOMBRE_SUCURSAL, DIRECCION, TELEFONO)
VALUES
  ('S1', 'Sucursal Centro', 'Calle Principal 123, Ciudad', '2222-1111'),
  ('S2', 'Sucursal Norte', 'Avenida Secundaria 45, Ciudad', '3333-2222')
ON DUPLICATE KEY UPDATE NOMBRE_SUCURSAL = VALUES(NOMBRE_SUCURSAL), DIRECCION = VALUES(DIRECCION), TELEFONO = VALUES(TELEFONO);

-- Usuarios (4): 1 admin, 1 gerente, 2 vendedores (en distintas sucursales)
-- Nota: la tabla USUARIOS en el dump requiere NOMBRE_USUARIO, CORREO, CONTRASENA, ESTATUS, ID_ROL, ID_SUCURSAL

INSERT INTO USUARIOS (ID, NOMBRE, NOMBRE_USUARIO, CORREO, CONTRASENA, ESTATUS, ID_ROL, ID_SUCURSAL)
VALUES
  (1, 'Admin Principal', 'admin', 'admin@ferreteria.local', 'adminpass', 'activo', 1, NULL),
  (2, 'Gerente S1', 'gerente_s1', 'gerente.s1@ferreteria.local', 'gerentepass', 'activo', 2, 'S1'),
  (3, 'Vendedor S1', 'vendedor_s1', 'vend.s1@ferreteria.local', 'vendpass1', 'activo', 3, 'S1'),
  (4, 'Vendedor S2', 'vendedor_s2', 'vend.s2@ferreteria.local', 'vendpass2', 'activo', 3, 'S2')
ON DUPLICATE KEY UPDATE NOMBRE = VALUES(NOMBRE), NOMBRE_USUARIO = VALUES(NOMBRE_USUARIO), CORREO = VALUES(CORREO), CONTRASENA = VALUES(CONTRASENA), ESTATUS = VALUES(ESTATUS), ID_ROL = VALUES(ID_ROL), ID_SUCURSAL = VALUES(ID_SUCURSAL);

-- Categorias y Subcategorias
INSERT INTO CATEGORIAS (ID_CATEGORIAS, NOMBRE_CATEGORIAS)
VALUES
  ('C1', 'Herramientas'),
  ('C2', 'Ferretería General')
ON DUPLICATE KEY UPDATE NOMBRE_CATEGORIAS = VALUES(NOMBRE_CATEGORIAS);

INSERT INTO SUBCATEGORIAS (ID_SUBCATEGORIAS, NOMBRE_SUBCATEGORIA, ID_CATEGORIAS)
VALUES
  ('SC1', 'Manuales', 'C1'),
  ('SC2', 'Eléctricas', 'C1'),
  ('SC3', 'Tornillería', 'C2')
ON DUPLICATE KEY UPDATE NOMBRE_SUBCATEGORIA = VALUES(NOMBRE_SUBCATEGORIA), ID_CATEGORIAS = VALUES(ID_CATEGORIAS);

-- Productos (algunos con CODIGO_PRODUCTO)
INSERT INTO PRODUCTOS (ID_PRODUCT, CODIGO_PRODUCTO, PRODUCT_NAME, CANTIDAD, CANTIDAD_STOCK, PRECIO, ID_SUBCATEGORIAS, ID_SUCURSAL)
VALUES
  (1, 'HER001', 'Martillo 16oz', 50, '50', 150.00, 'SC1', 'S1'),
  (2, 'HER002', 'Taladro Eléctrico 12V', 20, '20', 3500.00, 'SC2', 'S2'),
  (3, 'FER001', 'Juego de Tornillos 100u', 200, '200', 120.00, 'SC3', 'S1')
ON DUPLICATE KEY UPDATE CODIGO_PRODUCTO = VALUES(CODIGO_PRODUCTO), PRODUCT_NAME = VALUES(PRODUCT_NAME), CANTIDAD = VALUES(CANTIDAD), CANTIDAD_STOCK = VALUES(CANTIDAD_STOCK), PRECIO = VALUES(PRECIO), ID_SUBCATEGORIAS = VALUES(ID_SUBCATEGORIAS), ID_SUCURSAL = VALUES(ID_SUCURSAL);

-- Stock por sucursal (STOCK_SUCURSAL)
INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD, STATUS)
VALUES
  (1, 'S1', 50, 'ACTIVO'),
  (2, 'S2', 20, 'ACTIVO'),
  (3, 'S1', 200, 'ACTIVO')
ON DUPLICATE KEY UPDATE CANTIDAD = VALUES(CANTIDAD), STATUS = VALUES(STATUS);

-- Movimientos de inventario (MOVIMIENTOS_INVENTARIO) para control de stock
INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
VALUES
  (1, 'S1', 3, 'entrada', 50, 'Stock inicial', 'INIT-S1-1', 0, 50),
  (2, 'S2', 4, 'entrada', 20, 'Stock inicial', 'INIT-S2-1', 0, 20),
  (3, 'S1', 3, 'entrada', 200, 'Stock inicial', 'INIT-S1-3', 0, 200)
ON DUPLICATE KEY UPDATE fecha = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;

-- Fin seed custom
