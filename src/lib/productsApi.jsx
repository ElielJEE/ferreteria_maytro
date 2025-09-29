// src/lib/productsApi.js
import { pool } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * Comprueba si existe una columna en la tabla PRODUCTOS (para PURCHASE_PRICE opcional)
 */
async function columnExists(tableName, columnName) {
  try {
    const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || null;
    if (!dbName) return false;
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, tableName, columnName]
    );
    return rows && rows[0] && Number(rows[0].c) > 0;
  } catch (e) {
    console.error('columnExists error', e);
    return false;
  }
}

export async function handleGET() {
  try {
    // Construir SELECT dinámico según si existe PURCHASE_PRICE
    const hasPurchase = await columnExists('PRODUCTOS', 'PURCHASE_PRICE');

    const select = `
      SELECT
        p.ID_PRODUCT AS id,
        p.PRODUCT_NAME AS name,
        COALESCE(p.CANTIDAD, 0) AS stock,
        ${hasPurchase ? 'p.PURCHASE_PRICE AS purchasePrice,' : 'NULL AS purchasePrice,'}
        COALESCE(p.PRECIO, 0) AS salePrice,
        COALESCE(s.NOMBRE_SUBCATEGORIA, c.NOMBRE_CATEGORIAS, '') AS category,
        p.STATUS AS status
      FROM PRODUCTOS p
      LEFT JOIN SUBCATEGORIAS s ON p.ID_SUBCATEGORIAS = s.ID_SUBCATEGORIAS
      LEFT JOIN CATEGORIAS c ON s.ID_CATEGORIAS = c.ID_CATEGORIAS
      ORDER BY p.ID_PRODUCT DESC
    `;

    const [rows] = await pool.query(select);

    const products = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      stock: Number(r.stock),
      purchasePrice: r.purchasePrice === undefined ? null : (r.purchasePrice === null ? null : Number(r.purchasePrice)),
      salePrice: Number(r.salePrice ?? 0),
      status: r.status ?? 'Disponible'
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('GET productos error:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

function genSubcatId() {
  // Generador simple; si prefieres otra convención, cámbialo
  return 'SC' + Date.now().toString().slice(-10);
}

export async function handlePOST(req) {
  try {
    const body = await req.json();

    // Mapeo flexible (acepta fields posibles del frontend)
    const product_name = body.product_name ?? body.name ?? body.productName;
    const cantidad = Number(body.cantidad ?? body.stock ?? 0);
    const salePrice = Number(body.precio ?? body.salePrice ?? body.price ?? 0);
    const purchasePrice = body.purchasePrice ?? body.purchase_price ?? null;
    const status = body.status ?? 'Disponible';
    const categoryName = body.category ?? body.categoria ?? null;
    let id_subcategoria = body.id_subcategoria ?? body.id_subcategory ?? null;

    if (!product_name) {
      return NextResponse.json({ message: 'El nombre del producto es requerido' }, { status: 400 });
    }

    // Buscar/crear subcategoria si frontend envió 'category' (por nombre)
    if (!id_subcategoria && categoryName) {
      const [foundRows] = await pool.query(
        `SELECT ID_SUBCATEGORIAS FROM SUBCATEGORIAS WHERE NOMBRE_SUBCATEGORIA = ? LIMIT 1`,
        [categoryName]
      );
      if (foundRows && foundRows.length > 0) {
        id_subcategoria = foundRows[0].ID_SUBCATEGORIAS;
      } else {
        id_subcategoria = genSubcatId();
        await pool.query(
          `INSERT INTO SUBCATEGORIAS (ID_SUBCATEGORIAS, NOMBRE_SUBCATEGORIA, ID_CATEGORIAS)
           VALUES (?, ?, NULL)`,
          [id_subcategoria, categoryName]
        );
      }
    }

    // Comprueba si existe columna PURCHASE_PRICE para incluirla en INSERT si aplica
    const hasPurchase = await columnExists('PRODUCTOS', 'PURCHASE_PRICE');

    // Construir INSERT dinámico
    if (hasPurchase) {
      const [result] = await pool.query(
        `INSERT INTO PRODUCTOS
          (PRODUCT_NAME, CANTIDAD, CANTIDAD_STOCK, PRECIO, PURCHASE_PRICE, STATUS, ID_SUBCATEGORIAS)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product_name, cantidad, null, salePrice, purchasePrice, status, id_subcategoria]
      );
      const insertedId = result.insertId;
      const [[row]] = await pool.query(
        `SELECT
           p.ID_PRODUCT AS id,
           p.PRODUCT_NAME AS name,
           COALESCE(p.CANTIDAD,0) AS stock,
           p.PURCHASE_PRICE AS purchasePrice,
           COALESCE(p.PRECIO,0) AS salePrice,
           COALESCE(s.NOMBRE_SUBCATEGORIA, c.NOMBRE_CATEGORIAS, '') AS category,
           p.STATUS AS status
         FROM PRODUCTOS p
         LEFT JOIN SUBCATEGORIAS s ON p.ID_SUBCATEGORIAS = s.ID_SUBCATEGORIAS
         LEFT JOIN CATEGORIAS c ON s.ID_CATEGORIAS = c.ID_CATEGORIAS
         WHERE p.ID_PRODUCT = ? LIMIT 1`,
        [insertedId]
      );
      return NextResponse.json({
        product: {
          id: row.id,
          name: row.name,
          category: row.category,
          stock: Number(row.stock),
          purchasePrice: row.purchasePrice === null ? null : Number(row.purchasePrice),
          salePrice: Number(row.salePrice ?? 0),
          status: row.status ?? 'Disponible'
        }
      }, { status: 201 });
    } else {
      // Tabla no tiene PURCHASE_PRICE
      const [result] = await pool.query(
        `INSERT INTO PRODUCTOS
          (PRODUCT_NAME, CANTIDAD, CANTIDAD_STOCK, PRECIO, STATUS, ID_SUBCATEGORIAS)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product_name, cantidad, null, salePrice, status, id_subcategoria]
      );
      const insertedId = result.insertId;
      const [[row]] = await pool.query(
        `SELECT
           p.ID_PRODUCT AS id,
           p.PRODUCT_NAME AS name,
           COALESCE(p.CANTIDAD,0) AS stock,
           COALESCE(p.PRECIO,0) AS salePrice,
           COALESCE(s.NOMBRE_SUBCATEGORIA, c.NOMBRE_CATEGORIAS, '') AS category,
           p.STATUS AS status
         FROM PRODUCTOS p
         LEFT JOIN SUBCATEGORIAS s ON p.ID_SUBCATEGORIAS = s.ID_SUBCATEGORIAS
         LEFT JOIN CATEGORIAS c ON s.ID_CATEGORIAS = c.ID_CATEGORIAS
         WHERE p.ID_PRODUCT = ? LIMIT 1`,
        [insertedId]
      );
      return NextResponse.json({
        product: {
          id: row.id,
          name: row.name,
          category: row.category,
          stock: Number(row.stock),
          purchasePrice: purchasePrice ? Number(purchasePrice) : null,
          salePrice: Number(row.salePrice ?? 0),
          status: row.status ?? 'Disponible'
        }
      }, { status: 201 });
    }
  } catch (error) {
    console.error('POST productos error:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
