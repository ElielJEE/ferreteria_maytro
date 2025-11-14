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
  `ID_PROVEEDOR` int DEFAULT NULL,
  `ID_USUARIO` int DEFAULT NULL,
  `ID_SUCURSAL` varchar(10) DEFAULT NULL,
  `ESTADO` varchar(20) DEFAULT 'pendiente',
  PRIMARY KEY (`ID_COMPRA`),
  KEY `idx_compras_proveedor` (`ID_PROVEEDOR`),
  KEY `idx_compras_sucursal` (`ID_SUCURSAL`),
  CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`ID_PROVEEDOR`) REFERENCES `proveedor` (`ID_PROVEEDOR`) ON DELETE SET NULL ON UPDATE CASCADE
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
  `UNIDAD_ID` int DEFAULT NULL,
  `CANTIDAD_POR_UNIDAD` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `UNIDAD_NOMBRE` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID_DETALLE_COTIZACION`),
  KEY `idx_cotdet_cot` (`ID_COTIZACION`),
  KEY `idx_cotdet_prod` (`ID_PRODUCT`),
  KEY `idx_cotdet_unidad` (`UNIDAD_ID`),
  CONSTRAINT `fk_cotdet_cot` FOREIGN KEY (`ID_COTIZACION`) REFERENCES `cotizacion` (`ID_COTIZACION`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cotdet_prod` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_compra`
--

DROP TABLE IF EXISTS `detalles_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_compra` (
  `ID_DETALLES_COMPRA` int NOT NULL AUTO_INCREMENT,
  `ID_COMPRA` int DEFAULT NULL,
  `ID_PRODUCT` int DEFAULT NULL,
  `CANTIDAD` decimal(12,2) NOT NULL,
  `PRECIO_UNIT` decimal(12,2) NOT NULL DEFAULT '0.00',
  `SUB_TOTAL` decimal(12,2) NOT NULL,
  `ID_PROVEEDOR` int DEFAULT NULL,
  PRIMARY KEY (`ID_DETALLES_COMPRA`),
  KEY `idx_detcomp_compra` (`ID_COMPRA`),
  KEY `idx_detcomp_product` (`ID_PRODUCT`),
  KEY `idx_detcomp_prov` (`ID_PROVEEDOR`),
  CONSTRAINT `fk_detcomp_compra` FOREIGN KEY (`ID_COMPRA`) REFERENCES `compras` (`ID_COMPRA`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detcomp_productos` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_detcomp_proveedor` FOREIGN KEY (`ID_PROVEEDOR`) REFERENCES `proveedor` (`ID_PROVEEDOR`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- (file truncated here for brevity; full content was restored from ferreteria_maytroBDcompleta.sql)

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-11  5:12:55
-- Consolidated schema for ferreteria_maytro
-- This file merges the CREATE TABLE statements from the three provided dumps
-- and excludes all INSERT seed data. It also includes idempotent schema
-- adjustments present in the original dumps to ensure necessary columns
-- and constraints exist for the application's features (credits, units, etc.).

CREATE DATABASE IF NOT EXISTS `ferreteria_maytro` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */;
USE `ferreteria_maytro`;

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

-- -----------------------------------------------------------------
-- Table definitions (DROP IF EXISTS + CREATE TABLE)
-- -----------------------------------------------------------------

-- apertura_caja
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

DROP TABLE IF EXISTS `caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `caja` (
  `ID_CAJA` varchar(10) NOT NULL,
  `DESCRIPCION` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID_CAJA`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  KEY `idx_caja_fecha` (`FECHA_APERTURA`),
  KEY `fk_caja_user_open` (`USUARIO_APERTURA`),
  KEY `fk_caja_user_close` (`USUARIO_CIERRE`),
  CONSTRAINT `fk_caja_suc` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_caja_user_close` FOREIGN KEY (`USUARIO_CIERRE`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_caja_user_open` FOREIGN KEY (`USUARIO_APERTURA`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- categorias
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

-- clientes
DROP TABLE IF EXISTS `clientes`;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `ID_CLIENTES` int NOT NULL AUTO_INCREMENT,
  `NOMBRE_CLIENTE` varchar(255) NOT NULL,
  `DIRECCION_CLIENTE` varchar(255) NOT NULL,
  `TELEFONO_CLIENTE` varchar(20) NOT NULL,
  PRIMARY KEY (`ID_CLIENTES`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- compras
-- compras (duplicate fragment removed; canonical definition appears earlier in this file)

-- config_tasa_cambio
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

-- cotizacion
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

-- cotizacion_detalles
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
  `UNIDAD_ID` int DEFAULT NULL,
  `CANTIDAD_POR_UNIDAD` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `UNIDAD_NOMBRE` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID_DETALLE_COTIZACION`),
  KEY `idx_cotdet_cot` (`ID_COTIZACION`),
  KEY `idx_cotdet_prod` (`ID_PRODUCT`),
  KEY `idx_cotdet_unidad` (`UNIDAD_ID`),
  CONSTRAINT `fk_cotdet_cot` FOREIGN KEY (`ID_COTIZACION`) REFERENCES `cotizacion` (`ID_COTIZACION`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cotdet_prod` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- descuentos
DROP TABLE IF EXISTS `descuentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `descuentos` (
  `ID_DESCUENTO` int NOT NULL AUTO_INCREMENT,
  `CODIGO_DESCUENTO` varchar(50) NOT NULL,
  `NOMBRE_DESCUENTO` varchar(100) NOT NULL,
  `VALOR_PORCENTAJE` decimal(5,2) NOT NULL,
  `DESCRIPCION` text,
  `ESTADO` enum('Activo','Inactivo','Eliminado') DEFAULT 'Activo',
  `FECHA_CREACION` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `FECHA_ACTUALIZACION` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_DESCUENTO`),
  UNIQUE KEY `CODIGO_DESCUENTO` (`CODIGO_DESCUENTO`),
  CONSTRAINT `descuentos_chk_1` CHECK (((`VALOR_PORCENTAJE` >= 0) and (`VALOR_PORCENTAJE` <= 100)))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- detalles_compra
DROP TABLE IF EXISTS `detalles_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_compra` (
  `ID_DETALLES_COMPRA` int NOT NULL AUTO_INCREMENT,
  `ID_COMPRA` int DEFAULT NULL,
  `ID_PRODUCT` int DEFAULT NULL,
  `CANTIDAD` decimal(12,2) NOT NULL,
  `PRECIO_UNIT` decimal(12,2) NOT NULL DEFAULT '0.00',
  `SUB_TOTAL` decimal(12,2) NOT NULL,
  `ID_PROVEEDOR` int DEFAULT NULL,
  PRIMARY KEY (`ID_DETALLES_COMPRA`),
  KEY `idx_detcomp_product` (`ID_PRODUCT`),
  KEY `idx_detcomp_prov` (`ID_PROVEEDOR`),
  CONSTRAINT `fk_detcomp_productos` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_detcomp_proveedor` FOREIGN KEY (`ID_PROVEEDOR`) REFERENCES `proveedor` (`ID_PROVEEDOR`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- devolucion
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

-- factura
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

-- factura_descuento
DROP TABLE IF EXISTS `factura_descuento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `factura_descuento` (
  `ID_DESCUENTO_FACTURA` int NOT NULL AUTO_INCREMENT,
  `ID_FACTURA` int NOT NULL,
  `ID_DESCUENTO` int DEFAULT NULL,
  `PERCENT` decimal(6,2) DEFAULT '0.00',
  `AMOUNT` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`ID_DESCUENTO_FACTURA`),
  KEY `idx_fd_fact` (`ID_FACTURA`),
  CONSTRAINT `fk_fd_fact` FOREIGN KEY (`ID_FACTURA`) REFERENCES `factura` (`ID_FACTURA`) ON DELETE CASCADE
 ) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
-- factura_detalles
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

-- factura_pagos
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

-- movimientos_inventario
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

-- nivelacion
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

-- permisos
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

-- producto_unidades
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

-- productos
DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `ID_PRODUCT` int NOT NULL AUTO_INCREMENT,
  `CODIGO_PRODUCTO` varchar(50) DEFAULT NULL,
  `PRODUCT_NAME` varchar(255) NOT NULL,
  `CANTIDAD` decimal(12,2) DEFAULT NULL,
  `ID_SUBCATEGORIAS` varchar(10) DEFAULT NULL,
  `PRECIO_COMPRA` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`ID_PRODUCT`),
  KEY `idx_productos_idsub` (`ID_SUBCATEGORIAS`)
 ) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- proveedor
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

-- reservas
DROP TABLE IF EXISTS `reservas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservas` (
  `ID_RESERVA` int NOT NULL AUTO_INCREMENT,
  `ID_PRODUCT` int NOT NULL,
  `ID_SUCURSAL` varchar(10) NOT NULL,
  `ID_CLIENTES` int DEFAULT NULL,
  `RESERVADO_POR` int DEFAULT NULL,
  `CANTIDAD` int NOT NULL,
  `FECHA_RESERVA` date NOT NULL,
  `FECHA_ENTREGA` date DEFAULT NULL,
  `ESTADO` enum('pendiente','entregada','cancelada') NOT NULL DEFAULT 'pendiente',
  `TELEFONO_CONTACTO` varchar(20) DEFAULT NULL,
  `NOTAS` varchar(255) DEFAULT NULL,
  `CREATED_AT` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UPDATED_AT` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_RESERVA`),
  KEY `idx_res_prod` (`ID_PRODUCT`),
  KEY `idx_res_suc` (`ID_SUCURSAL`),
  KEY `idx_res_cli` (`ID_CLIENTES`),
  KEY `idx_res_estado` (`ESTADO`),
  KEY `fk_res_user` (`RESERVADO_POR`),
  CONSTRAINT `fk_res_cliente` FOREIGN KEY (`ID_CLIENTES`) REFERENCES `clientes` (`ID_CLIENTES`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_res_product` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_sucursal` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_res_user` FOREIGN KEY (`RESERVADO_POR`) REFERENCES `usuarios` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- rol
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

-- rol_permisos
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

-- stock_danados
DROP TABLE IF EXISTS `stock_danados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_danados` (
  `ID_DANADO` int NOT NULL AUTO_INCREMENT,
  `ID_PRODUCT` int NOT NULL,
  `ID_SUCURSAL` varchar(20) DEFAULT NULL,
  `CANTIDAD` decimal(12,2) NOT NULL DEFAULT '0.00',
  `UNIDAD_ID` int DEFAULT NULL,
  `CANTIDAD_POR_UNIDAD` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `UNIDAD_NOMBRE` varchar(100) DEFAULT NULL,
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
  KEY `idx_sd_unidad` (`UNIDAD_ID`),
  CONSTRAINT `fk_sd_prod` FOREIGN KEY (`ID_PRODUCT`) REFERENCES `productos` (`ID_PRODUCT`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sd_suc` FOREIGN KEY (`ID_SUCURSAL`) REFERENCES `sucursal` (`ID_SUCURSAL`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- stock_sucursal
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

-- subcategorias
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

-- sucursal
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

-- unidades_medidas
DROP TABLE IF EXISTS `unidades_medidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades_medidas` (
  `ID_UNIDAD` int NOT NULL AUTO_INCREMENT,
  `NOMBRE` varchar(100) NOT NULL,
  PRIMARY KEY (`ID_UNIDAD`),
  UNIQUE KEY `uk_unidad_nombre` (`NOMBRE`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- usuarios
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

-- usuarios_creditos
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

-- -----------------------------------------------------------------
-- Idempotent schema adjustments (from original dumps)
-- These statements check information_schema and add columns/indices/FKs
-- only if they are missing. They are included to ensure the DB has the
-- extra metadata the application expects (credits metadata, unit columns, etc.).
-- -----------------------------------------------------------------

-- Ensure columns and indices for `USUARIOS_CREDITOS`
SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'FECHA_CREACION');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `FECHA_CREACION` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt_uc1 FROM @sql_stmt; EXECUTE stmt_uc1; DEALLOCATE PREPARE stmt_uc1;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'DEUDA_INICIAL');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `DEUDA_INICIAL` decimal(12,2) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_uc2 FROM @sql_stmt; EXECUTE stmt_uc2; DEALLOCATE PREPARE stmt_uc2;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'DEUDA_ACTUAL');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `DEUDA_ACTUAL` decimal(12,2) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_uc3 FROM @sql_stmt; EXECUTE stmt_uc3; DEALLOCATE PREPARE stmt_uc3;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'ID_USUARIO');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `ID_USUARIO` int DEFAULT NULL', 'SELECT 1');
PREPARE stmt_uc4 FROM @sql_stmt; EXECUTE stmt_uc4; DEALLOCATE PREPARE stmt_uc4;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'ESTADO');
SET @sql_stmt := IF(@col_exists = 0, "ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `ESTADO` varchar(20) DEFAULT 'activa'", 'SELECT 1');
PREPARE stmt_uc5 FROM @sql_stmt; EXECUTE stmt_uc5; DEALLOCATE PREPARE stmt_uc5;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'NUMERO_FACTURA');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `NUMERO_FACTURA` varchar(50) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_uc6 FROM @sql_stmt; EXECUTE stmt_uc6; DEALLOCATE PREPARE stmt_uc6;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'ID_SUCURSAL');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `ID_SUCURSAL` varchar(10) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_uc7 FROM @sql_stmt; EXECUTE stmt_uc7; DEALLOCATE PREPARE stmt_uc7;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'ID_CLIENTE');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD COLUMN `ID_CLIENTE` int DEFAULT NULL', 'SELECT 1');
PREPARE stmt_uc8 FROM @sql_stmt; EXECUTE stmt_uc8; DEALLOCATE PREPARE stmt_uc8;

-- Create indices if not exists
SET @idx_exists := (SELECT COUNT(1) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND INDEX_NAME = 'idx_usucred_usuario');
SET @sql_stmt := IF(@idx_exists = 0, 'CREATE INDEX idx_usucred_usuario ON USUARIOS_CREDITOS (ID_USUARIO)', 'SELECT 1');
PREPARE stmt_ui1 FROM @sql_stmt; EXECUTE stmt_ui1; DEALLOCATE PREPARE stmt_ui1;

SET @idx_exists := (SELECT COUNT(1) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND INDEX_NAME = 'idx_usucred_sucursal');
SET @sql_stmt := IF(@idx_exists = 0, 'CREATE INDEX idx_usucred_sucursal ON USUARIOS_CREDITOS (ID_SUCURSAL)', 'SELECT 1');
PREPARE stmt_ui2 FROM @sql_stmt; EXECUTE stmt_ui2; DEALLOCATE PREPARE stmt_ui2;

SET @idx_exists := (SELECT COUNT(1) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND INDEX_NAME = 'idx_usucred_cliente');
SET @sql_stmt := IF(@idx_exists = 0, 'CREATE INDEX idx_usucred_cliente ON USUARIOS_CREDITOS (ID_CLIENTE)', 'SELECT 1');
PREPARE stmt_ui3 FROM @sql_stmt; EXECUTE stmt_ui3; DEALLOCATE PREPARE stmt_ui3;

-- Add FK constraints for usuarios_creditos if missing
SET @fk_exists := (SELECT COUNT(1) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND CONSTRAINT_NAME = 'fk_usucred_usuario');
SET @sql_stmt := IF(@fk_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD CONSTRAINT fk_usucred_usuario FOREIGN KEY (ID_USUARIO) REFERENCES usuarios(ID) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt_ufk1 FROM @sql_stmt; EXECUTE stmt_ufk1; DEALLOCATE PREPARE stmt_ufk1;

SET @fk_exists := (SELECT COUNT(1) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND CONSTRAINT_NAME = 'fk_usucred_sucursal');
SET @sql_stmt := IF(@fk_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD CONSTRAINT fk_usucred_sucursal FOREIGN KEY (ID_SUCURSAL) REFERENCES sucursal(ID_SUCURSAL) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt_ufk2 FROM @sql_stmt; EXECUTE stmt_ufk2; DEALLOCATE PREPARE stmt_ufk2;

SET @fk_exists := (SELECT COUNT(1) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND CONSTRAINT_NAME = 'fk_usucred_cliente');
SET @sql_stmt := IF(@fk_exists = 0, 'ALTER TABLE `USUARIOS_CREDITOS` ADD CONSTRAINT fk_usucred_cliente FOREIGN KEY (ID_CLIENTE) REFERENCES clientes(ID_CLIENTES) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt_ufk3 FROM @sql_stmt; EXECUTE stmt_ufk3; DEALLOCATE PREPARE stmt_ufk3;

-- Ensure unit columns exist in COTIZACION_DETALLES and FACTURA_DETALLES
SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES' AND COLUMN_NAME = 'UNIDAD_ID');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `COTIZACION_DETALLES` ADD COLUMN `UNIDAD_ID` INT DEFAULT NULL', 'SELECT 1');
PREPARE stmt_cd1 FROM @sql_stmt; EXECUTE stmt_cd1; DEALLOCATE PREPARE stmt_cd1;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES' AND COLUMN_NAME = 'CANTIDAD_POR_UNIDAD');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `COTIZACION_DETALLES` ADD COLUMN `CANTIDAD_POR_UNIDAD` DECIMAL(12,4) NOT NULL DEFAULT ''1.0000''', 'SELECT 1');
PREPARE stmt_cd2 FROM @sql_stmt; EXECUTE stmt_cd2; DEALLOCATE PREPARE stmt_cd2;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES' AND COLUMN_NAME = 'UNIDAD_NOMBRE');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `COTIZACION_DETALLES` ADD COLUMN `UNIDAD_NOMBRE` VARCHAR(100) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_cd3 FROM @sql_stmt; EXECUTE stmt_cd3; DEALLOCATE PREPARE stmt_cd3;

SET @idx_exists := (SELECT COUNT(1) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES' AND INDEX_NAME = 'idx_cotdet_unidad');
SET @sql_stmt := IF(@idx_exists = 0, 'CREATE INDEX idx_cotdet_unidad ON COTIZACION_DETALLES (UNIDAD_ID)', 'SELECT 1');
PREPARE stmt_idx FROM @sql_stmt; EXECUTE stmt_idx; DEALLOCATE PREPARE stmt_idx;

-- Ensure unit columns exist in STOCK_DANADOS
SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS' AND COLUMN_NAME = 'UNIDAD_ID');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `STOCK_DANADOS` ADD COLUMN `UNIDAD_ID` INT DEFAULT NULL', 'SELECT 1');
PREPARE stmt_sd1 FROM @sql_stmt; EXECUTE stmt_sd1; DEALLOCATE PREPARE stmt_sd1;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS' AND COLUMN_NAME = 'CANTIDAD_POR_UNIDAD');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `STOCK_DANADOS` ADD COLUMN `CANTIDAD_POR_UNIDAD` DECIMAL(12,4) NOT NULL DEFAULT ''1.0000''', 'SELECT 1');
PREPARE stmt_sd2 FROM @sql_stmt; EXECUTE stmt_sd2; DEALLOCATE PREPARE stmt_sd2;

SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS' AND COLUMN_NAME = 'UNIDAD_NOMBRE');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `STOCK_DANADOS` ADD COLUMN `UNIDAD_NOMBRE` VARCHAR(100) DEFAULT NULL', 'SELECT 1');
PREPARE stmt_sd3 FROM @sql_stmt; EXECUTE stmt_sd3; DEALLOCATE PREPARE stmt_sd3;

SET @idx_exists := (SELECT COUNT(1) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS' AND INDEX_NAME = 'idx_sd_unidad');
SET @sql_stmt := IF(@idx_exists = 0, 'CREATE INDEX idx_sd_unidad ON STOCK_DANADOS (UNIDAD_ID)', 'SELECT 1');
PREPARE stmt_sdidx FROM @sql_stmt; EXECUTE stmt_sdidx; DEALLOCATE PREPARE stmt_sdidx;

-- Ensure PRECIO_COMPRA exists in productos
SET @col_exists := (SELECT COUNT(1) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'PRECIO_COMPRA');
SET @sql_stmt := IF(@col_exists = 0, 'ALTER TABLE `productos` ADD COLUMN `PRECIO_COMPRA` DECIMAL(12,2) NOT NULL DEFAULT ''0.00''', 'SELECT 1');
PREPARE stmt_prod FROM @sql_stmt; EXECUTE stmt_prod; DEALLOCATE PREPARE stmt_prod;

-- -----------------------------------------------------------------
-- End of consolidated schema
-- -----------------------------------------------------------------

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- File generated by consolidation (no seed INSERTs included)
