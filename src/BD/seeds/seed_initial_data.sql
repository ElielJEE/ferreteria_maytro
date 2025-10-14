-- Seed: initial data for ferreteria_maytro
-- 1) rol administrador
-- 2) usuario admin
-- 3) 10 categorias
-- 4) 2 subcategorias por categoria
-- 5) 10 productos con subcategoria asignada

USE ferreteria_maytro;

-- Roles
INSERT INTO ROL (ROL_NAME)
SELECT 'ADMIN' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM ROL WHERE ROL_NAME = 'ADMIN');

-- Obtener id del rol admin
SET @admin_role_id = (SELECT ID_ROL FROM ROL WHERE ROL_NAME = 'ADMIN' LIMIT 1);

-- Usuario administrador (si no existe)
INSERT INTO USUARIOS (NOMBRE, NOMBRE_USUARIO, CORREO, CONTRASENA, ESTATUS, ID_ROL)
SELECT 'Administrador', 'admin', 'admin@local', '$2b$12$pmU5.BK.qYmaixEb8vW06eeznqlmDR97FElNJsJ7btWWIG3PNwe4G', 'ACTIVO', @admin_role_id
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM USUARIOS WHERE NOMBRE_USUARIO = 'admin');

-- Categorias (10)
INSERT INTO CATEGORIAS (ID_CATEGORIAS, NOMBRE_CATEGORIAS)
VALUES
('C01', 'Ferretería General'),
('C02', 'Electricidad'),
('C03', 'Plomería'),
('C04', 'Pinturas'),
('C05', 'Herramientas Manuales'),
('C06', 'Herramientas Eléctricas'),
('C07', 'Cementos y Adhesivos'),
('C08', 'Seguridad y Protección'),
('C09', 'Carpintería'),
('C10', 'Jardinería')
ON DUPLICATE KEY UPDATE NOMBRE_CATEGORIAS = VALUES(NOMBRE_CATEGORIAS);

-- Subcategorias: 2 por categoria
INSERT INTO SUBCATEGORIAS (ID_SUBCATEGORIAS, NOMBRE_SUBCATEGORIA, ID_CATEGORIAS)
VALUES
('SC01','Tornillería','C01'),
('SC02','Fijaciones','C01'),

('SC03','Cables','C02'),
('SC04','Conectores','C02'),

('SC05','Tubos','C03'),
('SC06','Accesorios Plomería','C03'),

('SC07','Esmaltes','C04'),
('SC08','Barnices','C04'),

('SC09','Martillos','C05'),
('SC10','Destornilladores','C05'),

('SC11','Taladros','C06'),
('SC12','Sierras','C06'),

('SC13','Cementos','C07'),
('SC14','Adhesivos','C07'),

('SC15','Cascos','C08'),
('SC16','Guantes','C08'),

('SC17','Clavos y Clavadoras','C09'),
('SC18','Lijas','C09'),

('SC19','Fertilizantes','C10'),
('SC20','Herramientas de Jardín','C10')
ON DUPLICATE KEY UPDATE NOMBRE_SUBCATEGORIA = VALUES(NOMBRE_SUBCATEGORIA), ID_CATEGORIAS = VALUES(ID_CATEGORIAS);

-- Productos (10) asignados a subcategorias
INSERT INTO PRODUCTOS (CODIGO_PRODUCTO, PRODUCT_NAME, CANTIDAD, CANTIDAD_STOCK, PRECIO, ID_SUBCATEGORIAS)
VALUES
('HER001','Martillo de Carpintero 16oz',100,'100',12.50,'SC09'),
('HER002','Destornillador Phillips #2',150,'150',5.00,'SC10'),
('ELE001','Cable Eléctrico 12 AWG',200,'200',30.00,'SC03'),
('PLO001','Tubo PVC 3/4"',120,'120',8.00,'SC05'),
('PIN001','Esmalte Blanco 1L',80,'80',15.00,'SC07'),
('HER003','Taladro Percutor 500W',25,'25',120.00,'SC11'),
('CEM001','Cemento Portland 50kg',60,'60',7.50,'SC13'),
('SEG001','Casco de Seguridad',40,'40',22.00,'SC15'),
('CAR001','Clavos 3" x 1kg',300,'300',6.00,'SC17'),
('JAR001','Manguera Jardin 15m',50,'50',18.00,'SC20')
ON DUPLICATE KEY UPDATE PRODUCT_NAME = VALUES(PRODUCT_NAME), CANTIDAD = VALUES(CANTIDAD), PRECIO = VALUES(PRECIO), ID_SUBCATEGORIAS = VALUES(ID_SUBCATEGORIAS);

-- Asignar ID_SUCURSAL aleatoria a algunos productos (opcional)
UPDATE PRODUCTOS SET ID_SUCURSAL = 'S1' WHERE CODIGO_PRODUCTO IN ('HER001','HER002','ELE001');
UPDATE PRODUCTOS SET ID_SUCURSAL = 'S2' WHERE CODIGO_PRODUCTO IN ('PLO001','PIN001','HER003');

-- Fin del seed
