CREATE DATABASE  IF NOT EXISTS `ferreteria_maytro` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ferreteria_maytro`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: ferreteria_maytro
-- ------------------------------------------------------
-- Server version	9.2.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `apertura_caja`
--

DROP TABLE IF EXISTS `apertura_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `apertura_caja` (
  `D_APERTURA` varchar(10) NOT NULL,
  `ID_CAJA` varchar(10) DEFAULT NULL,
  `ID` int DEFAULT NULL,
  `ESTADO` varchar(255) NOT NULL,
  `MONTO` decimal(12,2) NOT NULL,
  `FECHA` date NOT NULL,
  PRIMARY KEY (`D_APERTURA`),
  KEY `idx_apertura_id` (`ID`),
  KEY `idx_apertura_idcaja` (`ID_CAJA`),
  CONSTRAINT `fk_apertura_caja_caja` FOREIGN KEY (`ID_CAJA`) REFERENCES `caja` (`ID_CAJA`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_apertura_caja_usuarios` FOREIGN KEY (`ID`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `apertura_caja`
--

LOCK TABLES `apertura_caja` WRITE;
/*!40000 ALTER TABLE `apertura_caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `apertura_caja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `caja`
--

DROP TABLE IF EXISTS `caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `caja` (
  `ID_CAJA` varchar(10) NOT NULL,
  `DESCRIPCION` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID_CAJA`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `caja`
--

LOCK TABLES `caja` WRITE;
/*!40000 ALTER TABLE `caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `caja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `caja_sesion`
--

DROP TABLE IF EXISTS `caja_sesion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `caja_sesion` (
  `ID_SESION` int NOT NULL AUTO_INCREMENT,
  `ID_SUCURSAL` varchar(10) NOT NULL,
  `USUARIO_APERTURA` int DEFAULT NULL,
  `FECHA_APERTURA` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MONTO_INICIAL` decimal(12,2) NOT NULL DEFAULT '0.00',
  `ESTADO` enum('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  `FECHA_CIERRE` datetime DEFAULT NULL,
  `USUARIO_CIERRE` int DEFAULT NULL,
  `MONTO_FINAL` decimal(12,2) DEFAULT NULL,
  `TOTAL_VENTAS_EQ_C` decimal(12,2) DEFAULT NULL,
  `DIFERENCIA` decimal(12,2) DEFAULT NULL,
  `OBSERVACIONES` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID_SESION`),
  KEY `idx_caja_suc_estado` (`ID_SUCURSAL`,`ESTADO`),
  KEY `idx_caja_fecha` (`FECHA_APERTURA`),
  KEY `fk_caja_user_open` (`USUARIO_APERTURA`),
  KEY `fk_caja_user_close` (`USUARIO_CIERRE`),
  CONSTRAINT `fk_caja_suc` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_caja_user_close` FOREIGN KEY (`USUARIO_CIERRE`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_caja_user_open` FOREIGN KEY (`USUARIO_APERTURA`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `caja_sesion`
--

LOCK TABLES `caja_sesion` WRITE;
/*!40000 ALTER TABLE `caja_sesion` DISABLE KEYS */;
INSERT INTO `caja_sesion` VALUES (1,'S1',1,'2025-11-10 01:55:24',2000.00,'cerrada','2025-11-10 01:56:17',1,3000.00,0.00,1000.00,NULL),(2,'S1',1,'2025-11-10 01:57:23',2000.00,'cerrada','2025-11-10 01:57:38',1,0.00,0.00,-2000.00,NULL),(3,'S1',1,'2025-11-10 14:54:31',2000.00,'cerrada','2025-11-10 14:54:52',1,2500.00,0.00,500.00,NULL);
/*!40000 ALTER TABLE `caja_sesion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `ID_CATEGORIAS` varchar(10) NOT NULL,
  `NOMBRE_CATEGORIAS` varchar(255) NOT NULL,
  PRIMARY KEY (`ID_CATEGORIAS`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES ('C1','Herramientas'),('C2','Ferretería General');
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `ID_CLIENTES` int NOT NULL AUTO_INCREMENT,
  `NOMBRE_CLIENTE` varchar(255) NOT NULL,
  `DIRECCION_CLIENTE` varchar(255) NOT NULL,
  `TELEFONO_CLIENTE` varchar(20) NOT NULL,
  PRIMARY KEY (`ID_CLIENTES`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (2,'Eliel J E Escoto','Gas Central 1 cuadra y media al sur','84005907');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compras`
--

DROP TABLE IF EXISTS `compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compras` (
  `ID_COMPRA` int NOT NULL AUTO_INCREMENT,
  `FECHA_PEDIDO` date NOT NULL,
  `FECHA_ENTREGA` date DEFAULT NULL,
  `TOTAL` decimal(12,2) NOT NULL,
  `ID_DETALLES_COMPRA` int DEFAULT NULL,
  PRIMARY KEY (`ID_COMPRA`),
  KEY `idx_compras_detalles` (`ID_DETALLES_COMPRA`),
  CONSTRAINT `fk_compras_detalles` FOREIGN KEY (`ID_DETALLES_COMPRA`) REFERENCES `detalles_compra` (`ID_DETALLES_COMPRA`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compras`
--

LOCK TABLES `compras` WRITE;
/*!40000 ALTER TABLE `compras` DISABLE KEYS */;
/*!40000 ALTER TABLE `compras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `config_tasa_cambio`
--

DROP TABLE IF EXISTS `config_tasa_cambio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `config_tasa_cambio` (
  `ID` int NOT NULL,
  `TASA` decimal(12,4) NOT NULL,
  `UPDATED_AT` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `config_tasa_cambio`
--

LOCK TABLES `config_tasa_cambio` WRITE;
/*!40000 ALTER TABLE `config_tasa_cambio` DISABLE KEYS */;
INSERT INTO `config_tasa_cambio` VALUES (1,36.5500,'2025-11-10 09:48:21');
/*!40000 ALTER TABLE `config_tasa_cambio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizacion`
--

DROP TABLE IF EXISTS `cotizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizacion` (
  `ID_COTIZACION` varchar(24) NOT NULL,
  `FECHA_CREACION` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `FECHA_VENCIMIENTO` date NOT NULL,
  `SUBTOTAL` decimal(12,2) NOT NULL DEFAULT '0.00',
  `DESCUENTO` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TOTAL` decimal(12,2) NOT NULL DEFAULT '0.00',
  `ESTADO` enum('activa','expirada','cancelada','procesada') NOT NULL DEFAULT 'activa',
  `ID_CLIENTES` int DEFAULT NULL,
  `ID_SUCURSAL` varchar(10) DEFAULT NULL,
  `ID_USUARIO` int DEFAULT NULL,
  `NOTAS` text,
  PRIMARY KEY (`ID_COTIZACION`),
  KEY `idx_cot_cli` (`ID_CLIENTES`),
  KEY `idx_cot_suc` (`ID_SUCURSAL`),
  KEY `idx_cot_user` (`ID_USUARIO`),
  CONSTRAINT `fk_cotizacion_cliente` FOREIGN KEY (`ID_CLIENTES`) REFERENCES `clientes` (`ID_CLIENTES`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cotizacion_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cotizacion_usuario` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizacion`
--

LOCK TABLES `cotizacion` WRITE;
/*!40000 ALTER TABLE `cotizacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `cotizacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizacion_detalles`
--

DROP TABLE IF EXISTS `cotizacion_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizacion_detalles` (
  `ID_DETALLE_COTIZACION` int NOT NULL AUTO_INCREMENT,
  `ID_COTIZACION` varchar(24) NOT NULL,
  `ID_PRODUCT` int DEFAULT NULL,
  `AMOUNT` decimal(12,2) NOT NULL DEFAULT '0.00',
  `PRECIO_UNIT` decimal(12,2) NOT NULL DEFAULT '0.00',
  `SUB_TOTAL` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`ID_DETALLE_COTIZACION`),
  KEY `idx_cotdet_cot` (`ID_COTIZACION`),
  KEY `idx_cotdet_prod` (`ID_PRODUCT`),
  CONSTRAINT `fk_cotdet_cot` FOREIGN KEY (`ID_COTIZACION`) REFERENCES `cotizacion` (`ID_COTIZACION`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cotdet_prod` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizacion_detalles`
--

LOCK TABLES `cotizacion_detalles` WRITE;
/*!40000 ALTER TABLE `cotizacion_detalles` DISABLE KEYS */;
/*!40000 ALTER TABLE `cotizacion_detalles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalles_compra`
--

DROP TABLE IF EXISTS `detalles_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_compra` (
  `ID_DETALLES_COMPRA` int NOT NULL AUTO_INCREMENT,
  `ID_PRODUCT` int DEFAULT NULL,
  `AMOUNT` int NOT NULL,
  `TIPO_PAGO` varchar(50) DEFAULT NULL,
  `SUB_TOTAL` decimal(12,2) NOT NULL,
  `NUMERO_REFERENCIA` varchar(50) DEFAULT NULL,
  `ID_PROVEEDOR` int DEFAULT NULL,
  PRIMARY KEY (`ID_DETALLES_COMPRA`),
  KEY `idx_detcomp_product` (`ID_PRODUCT`),
  KEY `idx_detcomp_prov` (`ID_PROVEEDOR`),
  CONSTRAINT `fk_detcomp_productos` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_detcomp_proveedor` FOREIGN KEY (`ID_PROVEEDOR`) REFERENCES `proveedor` (`ID_PROVEEDOR`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalles_compra`
--

LOCK TABLES `detalles_compra` WRITE;
/*!40000 ALTER TABLE `detalles_compra` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalles_compra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devolucion`
--

DROP TABLE IF EXISTS `devolucion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devolucion` (
  `ID_DEVOLUCION` varchar(16) NOT NULL,
  `CANTIDAD` int DEFAULT NULL,
  `ESTADO` varchar(10) DEFAULT NULL,
  `MOTIVO` varchar(255) DEFAULT NULL,
  `ID_USUARIO_DEVOLUCION` int DEFAULT NULL,
  `FECHA_DEVOLUCION` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_SUCURSAL` varchar(10) DEFAULT NULL,
  `ID_CLIENTES` int DEFAULT NULL,
  `ID_DETALLES_FACTURA` int DEFAULT NULL,
  `ID_PRODUCT` int DEFAULT NULL,
  PRIMARY KEY (`ID_DEVOLUCION`),
  KEY `idx_devol_detfac` (`ID_DETALLES_FACTURA`),
  KEY `idx_devol_product` (`ID_PRODUCT`),
  KEY `idx_devol_sucursal` (`ID_SUCURSAL`),
  KEY `idx_devol_cliente` (`ID_CLIENTES`),
  KEY `fk_devolucion_usuario` (`ID_USUARIO_DEVOLUCION`),
  CONSTRAINT `fk_devolucion_cliente` FOREIGN KEY (`ID_CLIENTES`) REFERENCES `clientes` (`ID_CLIENTES`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_devolucion_factdet` FOREIGN KEY (`ID_DETALLES_FACTURA`) REFERENCES `factura_detalles` (`ID_DETALLES_FACTURA`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_devolucion_productos` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_devolucion_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_devolucion_usuario` FOREIGN KEY (`ID_USUARIO_DEVOLUCION`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devolucion`
--

LOCK TABLES `devolucion` WRITE;
/*!40000 ALTER TABLE `devolucion` DISABLE KEYS */;
/*!40000 ALTER TABLE `devolucion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `factura`
--

DROP TABLE IF EXISTS `factura`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura` (
  `ID_FACTURA` int NOT NULL AUTO_INCREMENT,
  `NUMERO_FACTURA` varchar(24) DEFAULT NULL,
  `FECHA` date DEFAULT NULL,
  `SUBTOTAL` decimal(12,2) NOT NULL,
  `DESCUENTO` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TOTAL` decimal(12,2) NOT NULL,
  `D_APERTURA` varchar(10) DEFAULT NULL,
  `ID_CLIENTES` int DEFAULT NULL,
  `ID_SUCURSAL` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ID_FACTURA`),
  UNIQUE KEY `uk_fact_numero` (`NUMERO_FACTURA`),
  KEY `idx_fact_dapertura` (`D_APERTURA`),
  KEY `idx_fact_clientes` (`ID_CLIENTES`),
  KEY `idx_fact_idsucursal` (`ID_SUCURSAL`),
  CONSTRAINT `fk_factura_apertura` FOREIGN KEY (`D_APERTURA`) REFERENCES `apertura_caja` (`D_APERTURA`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_factura_clientes` FOREIGN KEY (`ID_CLIENTES`) REFERENCES `clientes` (`ID_CLIENTES`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_factura_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factura`
--

LOCK TABLES `factura` WRITE;
/*!40000 ALTER TABLE `factura` DISABLE KEYS */;
INSERT INTO `factura` VALUES (1,'FAC-20251110-034904','2025-11-10',14000.00,0.00,14000.00,NULL,2,'S2');
/*!40000 ALTER TABLE `factura` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `factura_detalles`
--

DROP TABLE IF EXISTS `factura_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura_detalles` (
  `ID_DETALLES_FACTURA` int NOT NULL AUTO_INCREMENT,
  `ID_FACTURA` int DEFAULT NULL,
  `ID_PRODUCT` int DEFAULT NULL,
  `AMOUNT` int NOT NULL,
  `PRECIO_UNIT` decimal(12,2) NOT NULL DEFAULT '0.00',
  `SUB_TOTAL` decimal(12,2) NOT NULL,
  `UNIDAD_ID` int DEFAULT NULL,
  `CANTIDAD_POR_UNIDAD` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `UNIDAD_NOMBRE` varchar(100) DEFAULT NULL,
  `ID_USUARIO` int DEFAULT NULL,
  PRIMARY KEY (`ID_DETALLES_FACTURA`),
  KEY `idx_factdet_factura` (`ID_FACTURA`),
  KEY `idx_factdet_product` (`ID_PRODUCT`),
  KEY `idx_factdet_usuario` (`ID_USUARIO`),
  CONSTRAINT `fk_factdet_factura` FOREIGN KEY (`ID_FACTURA`) REFERENCES `factura` (`ID_FACTURA`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_factdet_productos` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_factdet_usuarios` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factura_detalles`
--

LOCK TABLES `factura_detalles` WRITE;
/*!40000 ALTER TABLE `factura_detalles` DISABLE KEYS */;
INSERT INTO `factura_detalles` (ID_DETALLES_FACTURA, ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, UNIDAD_ID, CANTIDAD_POR_UNIDAD, UNIDAD_NOMBRE, ID_USUARIO)
VALUES (1,1,2, 4, 3500.00, 14000.00, NULL, 1.0000, NULL, 1);
/*!40000 ALTER TABLE `factura_detalles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `factura_pagos`
--

DROP TABLE IF EXISTS `factura_pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura_pagos` (
  `ID_PAGO` int NOT NULL AUTO_INCREMENT,
  `ID_FACTURA` int NOT NULL,
  `MONTO_CORDOBAS` decimal(12,2) NOT NULL DEFAULT '0.00',
  `MONTO_DOLARES` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TASA_CAMBIO` decimal(12,4) NOT NULL DEFAULT '36.5500',
  `METODO` varchar(50) DEFAULT NULL,
  `FECHA_PAGO` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NOTAS` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID_PAGO`),
  KEY `idx_pag_factura` (`ID_FACTURA`),
  CONSTRAINT `fk_pago_factura` FOREIGN KEY (`ID_FACTURA`) REFERENCES `factura` (`ID_FACTURA`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `factura_pagos`
--

LOCK TABLES `factura_pagos` WRITE;
/*!40000 ALTER TABLE `factura_pagos` DISABLE KEYS */;
INSERT INTO `factura_pagos` VALUES (1,1,15000.00,0.00,36.5500,'efectivo','2025-11-10 03:49:04',NULL);
/*!40000 ALTER TABLE `factura_pagos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_inventario`
--

DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int DEFAULT NULL,
  `sucursal_id` varchar(10) DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `tipo_movimiento` enum('entrada','salida','danado','transferencia','reservado') NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `referencia_id` varchar(50) DEFAULT NULL,
  `stock_anterior` decimal(12,2) DEFAULT NULL,
  `stock_nuevo` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mov_prod` (`producto_id`),
  KEY `idx_mov_suc` (`sucursal_id`),
  KEY `idx_mov_user` (`usuario_id`),
  KEY `idx_mov_fecha` (`fecha`),
  CONSTRAINT `fk_mov_prod` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mov_suc` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mov_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_inventario`
--

LOCK TABLES `movimientos_inventario` WRITE;
/*!40000 ALTER TABLE `movimientos_inventario` DISABLE KEYS */;
INSERT INTO `movimientos_inventario` VALUES (1,1,'S1',3,'entrada',50,'Stock inicial','2025-11-10 05:47:14','INIT-S1-1',0,50),(2,2,'S2',4,'entrada',20,'Stock inicial','2025-11-10 05:47:14','INIT-S2-1',0,20),(3,3,'S1',3,'entrada',200,'Stock inicial','2025-11-10 05:47:14','INIT-S1-3',0,200),(4,2,'S2',1,'salida',4,'Venta','2025-11-10 09:49:04','1',20,16);
/*!40000 ALTER TABLE `movimientos_inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nivelacion`
--

DROP TABLE IF EXISTS `nivelacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nivelacion` (
  `ID_NIVELACION` int NOT NULL AUTO_INCREMENT,
  `CANTIDAD` decimal(12,2) DEFAULT NULL,
  `CANTIDAD_MAX` decimal(12,2) DEFAULT NULL,
  `ID_PRODUCT` int DEFAULT NULL,
  `ID_SUCURSAL` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ID_NIVELACION`),
  UNIQUE KEY `uk_nivelacion_producto_sucursal` (`ID_PRODUCT`,`ID_SUCURSAL`),
  KEY `idx_nivel_product` (`ID_PRODUCT`),
  KEY `idx_nivel_sucursal` (`ID_SUCURSAL`),
  CONSTRAINT `fk_nivelacion_productos` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_nivelacion_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nivelacion`
--

LOCK TABLES `nivelacion` WRITE;
/*!40000 ALTER TABLE `nivelacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `nivelacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `idpermisos` int NOT NULL AUTO_INCREMENT,
  `permisos_name` varchar(255) NOT NULL,
  `path` varchar(255) NOT NULL,
  `modulo` varchar(255) NOT NULL,
  PRIMARY KEY (`idpermisos`),
  UNIQUE KEY `unique_path` (`path`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'Ver Dashboard','/dashboard','Dashboard'),(2,'Ver Productos','/inventario/productos','Inventario'),(3,'Ver Categorías','/inventario/categorias','Inventario'),(4,'Ver Control de Stock','/inventario/control-stock','Inventario'),(5,'Ver Punto de venta','/venta/punto-venta','Ventas'),(6,'Ver Historial de Ventas','/venta/historial-ventas','Ventas'),(7,'Ver Cotizaciones','/venta/cotizaciones','Ventas'),(8,'Ver Devoluciones','/venta/devoluciones','Ventas'),(9,'Ver Compras','/compras','Compras'),(10,'Ver Lista de clientes','/clientes/clientes-lista','Clientes'),(11,'Ver Créditos','/clientes/creditos','Clientes'),(12,'Ver Proveedores','/proveedores','Proveedores'),(13,'Ver Usuarios','/configuracion/usuarios','Configuración'),(14,'Ver Roles','/configuracion/roles','Configuración'),(15,'Ver Caja','/configuracion/caja','Configuración'),(16,'Ver Tasa de cambio','/configuracion/tasa-de-cambio','Configuración'),(17,'Ver Sucursales','/configuracion/sucursales','Configuración'),(18,'Ver Unidades de medida','/configuracion/unidades-medidas','Configuración'),(19,'Ver Descuentos','/configuracion/descuentos','Configuración');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `ID_PRODUCT` int NOT NULL AUTO_INCREMENT,
  `CODIGO_PRODUCTO` varchar(50) DEFAULT NULL,
  `PRODUCT_NAME` varchar(255) NOT NULL,
  `CANTIDAD` decimal(12,2) DEFAULT NULL,
  `ID_SUBCATEGORIAS` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ID_PRODUCT`),
  KEY `idx_productos_idsub` (`ID_SUBCATEGORIAS`)
  -- ID_SUCURSAL removed: per-sucursal info should live in STOCK_SUCURSAL
 ) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'HER001','Martillo 16oz',50,'SC1'),(2,'HER002','Taladro Eléctrico 12V',20,'SC2'),(3,'FER001','Juego de Tornillos 100u',200,'SC3');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

-- Table structure for table `unidades_medidas`
--
DROP TABLE IF EXISTS `unidades_medidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_medidas` (
  `ID_UNIDAD` int NOT NULL AUTO_INCREMENT,
  `NOMBRE` varchar(100) NOT NULL,
  PRIMARY KEY (`ID_UNIDAD`),
  UNIQUE KEY `uk_unidad_nombre` (`NOMBRE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Table structure for table `producto_unidades` (precio por unidad y cantidad por unidad)
--
DROP TABLE IF EXISTS `producto_unidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_unidades` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `PRODUCT_ID` int NOT NULL,
  `UNIDAD_ID` int NOT NULL,
  `PRECIO` decimal(12,2) NOT NULL DEFAULT '0.00',
  `CANTIDAD_POR_UNIDAD` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `ES_POR_DEFECTO` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID`),
  KEY `idx_pu_product` (`PRODUCT_ID`),
  KEY `idx_pu_unidad` (`UNIDAD_ID`),
  CONSTRAINT `fk_pu_product` FOREIGN KEY (`PRODUCT_ID`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pu_unidad` FOREIGN KEY (`UNIDAD_ID`) REFERENCES `unidades_medidas` (`ID_UNIDAD`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `proveedor`
--

DROP TABLE IF EXISTS `proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor` (
  `ID_PROVEEDOR` int NOT NULL AUTO_INCREMENT,
  `NOMBRE_PROVEEDOR` varchar(255) NOT NULL,
  `TELEFONO_PROVEEDOR` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ID_PROVEEDOR`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedor`
--

LOCK TABLES `proveedor` WRITE;
/*!40000 ALTER TABLE `proveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol`
--

DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol` (
  `ID_ROL` int NOT NULL AUTO_INCREMENT,
  `ROL_NAME` varchar(255) NOT NULL,
  `ROL_DESCRIPTION` text,
  PRIMARY KEY (`ID_ROL`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol`
--

LOCK TABLES `rol` WRITE;
/*!40000 ALTER TABLE `rol` DISABLE KEYS */;
INSERT INTO `rol` VALUES (1,'Administrador','Administra todo el sistema tiene todos los permisos.'),(2,'Gerente','Hace cosas de gerentes'),(3,'Vendedor',NULL);
/*!40000 ALTER TABLE `rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol_permisos`
--

DROP TABLE IF EXISTS `rol_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rol_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rol_permiso` (`rol_id`,`permiso_id`),
  KEY `permiso_id` (`permiso_id`),
  CONSTRAINT `rol_permisos_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`ID_ROL`) ON DELETE CASCADE,
  CONSTRAINT `rol_permisos_ibfk_2` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`idpermisos`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol_permisos`
--

LOCK TABLES `rol_permisos` WRITE;
/*!40000 ALTER TABLE `rol_permisos` DISABLE KEYS */;
INSERT INTO `rol_permisos` VALUES (17,1,1),(19,1,2),(18,1,3),(20,1,4),(25,1,5),(23,1,6),(22,1,7),(24,1,8),(8,1,9),(9,1,10),(7,1,11),(21,1,12),(15,1,13),(10,1,14),(11,1,15),(14,1,16),(13,1,17),(16,1,18),(12,1,19),(31,2,1),(33,2,2),(34,2,3),(32,2,4),(39,2,5),(36,2,6),(35,2,7),(38,2,8),(27,2,9),(28,2,10),(26,2,11),(37,2,12),(42,2,15),(30,2,16),(29,2,17),(40,2,18),(41,2,19),(45,3,1),(49,3,5),(47,3,6),(46,3,7),(48,3,8),(44,3,10),(43,3,11);
/*!40000 ALTER TABLE `rol_permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_danados`
--

DROP TABLE IF EXISTS `stock_danados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_danados` (
  `ID_DANADO` int NOT NULL AUTO_INCREMENT,
  `ID_PRODUCT` int NOT NULL,
  `ID_SUCURSAL` varchar(20) DEFAULT NULL,
  `CANTIDAD` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TIPO_DANO` varchar(100) DEFAULT NULL,
  `ESTADO` varchar(100) DEFAULT NULL,
  `DESCRIPCION` text,
  `USUARIO_ID` int DEFAULT NULL,
  `REFERENCIA` varchar(100) DEFAULT NULL,
  `PERDIDA` decimal(10,2) NOT NULL DEFAULT '0.00',
  `CREATED_AT` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_DANADO`),
  KEY `idx_sd_prod` (`ID_PRODUCT`),
  KEY `idx_sd_suc` (`ID_SUCURSAL`),
  CONSTRAINT `fk_sd_prod` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sd_suc` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_danados`
--

LOCK TABLES `stock_danados` WRITE;
/*!40000 ALTER TABLE `stock_danados` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_danados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_sucursal`
--

DROP TABLE IF EXISTS `stock_sucursal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_sucursal` (
  `ID_PRODUCT` int NOT NULL,
  `ID_SUCURSAL` varchar(10) NOT NULL,
  `CANTIDAD` decimal(12,2) NOT NULL,
  `STATUS` varchar(10) DEFAULT 'ACTIVO',
  PRIMARY KEY (`ID_PRODUCT`,`ID_SUCURSAL`),
  KEY `fk_stock_sucursal` (`ID_SUCURSAL`),
  CONSTRAINT `fk_stock_producto` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_sucursal`
--

LOCK TABLES `stock_sucursal` WRITE;
/*!40000 ALTER TABLE `stock_sucursal` DISABLE KEYS */;
INSERT INTO `stock_sucursal` VALUES (1,'S1',50,'ACTIVO'),(2,'S2',16,'ACTIVO'),(3,'S1',200,'ACTIVO');
/*!40000 ALTER TABLE `stock_sucursal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategorias`
--

DROP TABLE IF EXISTS `subcategorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategorias` (
  `ID_SUBCATEGORIAS` varchar(10) NOT NULL,
  `NOMBRE_SUBCATEGORIA` varchar(255) NOT NULL,
  `ID_CATEGORIAS` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ID_SUBCATEGORIAS`),
  KEY `idx_subcat_idcat` (`ID_CATEGORIAS`),
  CONSTRAINT `fk_subcat_categorias` FOREIGN KEY (`ID_CATEGORIAS`) REFERENCES `categorias` (`ID_CATEGORIAS`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategorias`
--

LOCK TABLES `subcategorias` WRITE;
/*!40000 ALTER TABLE `subcategorias` DISABLE KEYS */;
INSERT INTO `subcategorias` VALUES ('SC1','Manuales','C1'),('SC2','Eléctricas','C1'),('SC3','Tornillería','C2');
/*!40000 ALTER TABLE `subcategorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sucursal`
--

DROP TABLE IF EXISTS `sucursal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sucursal` (
  `ID_SUCURSAL` varchar(10) NOT NULL,
  `NOMBRE_SUCURSAL` varchar(255) NOT NULL,
  `DIRECCION` varchar(255) DEFAULT NULL,
  `TELEFONO` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ID_SUCURSAL`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sucursal`
--

LOCK TABLES `sucursal` WRITE;
/*!40000 ALTER TABLE `sucursal` DISABLE KEYS */;
INSERT INTO `sucursal` VALUES ('S1','Sucursal Centro','Calle Principal 123, Ciudad','2222-1111'),('S2','Sucursal Norte','Avenida Secundaria 45, Ciudad','3333-2222');
/*!40000 ALTER TABLE `sucursal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `NOMBRE` varchar(255) DEFAULT NULL,
  `NOMBRE_USUARIO` varchar(255) NOT NULL,
  `CORREO` varchar(255) NOT NULL,
  `CONTRASENA` varchar(255) NOT NULL,
  `ESTATUS` varchar(10) NOT NULL,
  `ID_ROL` int NOT NULL,
  `ID_SUCURSAL` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_usuarios_idrol` (`ID_ROL`),
  KEY `idx_usuarios_idsucursal` (`ID_SUCURSAL`),
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`ID_ROL`) REFERENCES `rol` (`ID_ROL`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_usuarios_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Admin Principal','admin','admin@ferreteria.local','$2b$12$pmU5.BK.qYmaixEb8vW06eeznqlmDR97FElNJsJ7btWWIG3PNwe4G','ACTIVO',1,NULL),(2,'Gerente S1','gerente_s1','gerente.s1@ferreteria.local','gerentepass','INACTIVO',2,'S1'),(3,'Vendedor S1','vendedor_s1','vend.s1@ferreteria.local','vendpass1','INACTIVO',3,'S1'),(4,'Vendedor S2','vendedor_s2','vend.s2@ferreteria.local','vendpass2','ACTIVO',3,'S2'),(5,'Pancho Gonzales','Panchito123','PanchoGonzales@gmail.com','$2b$10$QOeMZ7vXf8a3sO6MdWJG5OJOQX7AONjuL4DHlVn6oxj08zbOI3e0W','INACTIVO',2,'s1'),(6,'Eliel Jose Escobar Escoto','Elielsito123','eliel123escobar@gmail.com','$2b$10$wV7Yp3ZfUCjPLZv0YxRLqOd2t4F2bmXHdAF5kxCvBtWg1Z3rudkva','ACTIVO',1,'S1'),(7,'Jose Abraham','Abraham','si@gmail.com','$2b$10$V0dak6ApBe8iJq1oRuPdy.TDnud/dQaoqYFIDa6H8R.xun4Z7iOZq','INACTIVO',2,'S1'),(8,'Darcys sahomy Mayorga Hernandez','darcys123','darcys123@gmail.com','$2b$10$03zxRABwNwjGQl/xWTBT/upqqWidSckZ0PJr99uNyepD.EpyANwHa','ACTIVO',3,'S1'),(9,'Juan Lopez','Juansito','juaneltuani@gmail.com','$2b$10$7nczXHQOrEr2J4sKvBClOeQp8RzSMRvge3qScsZ.keC5lojoQXYki','INACTIVO',3,'S1');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios_creditos`
--

DROP TABLE IF EXISTS `usuarios_creditos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios_creditos` (
  `ID_USUARIOSCRED` varchar(10) NOT NULL,
  `MONTO_PAGO` varchar(20) DEFAULT NULL,
  `MONTO_DEUDA` decimal(12,2) NOT NULL,
  `ID_FACTURA` int DEFAULT NULL,
  PRIMARY KEY (`ID_USUARIOSCRED`),
  KEY `idx_usucred_fact` (`ID_FACTURA`),
  CONSTRAINT `fk_usucred_factura` FOREIGN KEY (`ID_FACTURA`) REFERENCES `factura` (`ID_FACTURA`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios_creditos`
--

LOCK TABLES `usuarios_creditos` WRITE;
/*!40000 ALTER TABLE `usuarios_creditos` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios_creditos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-11  5:12:55
