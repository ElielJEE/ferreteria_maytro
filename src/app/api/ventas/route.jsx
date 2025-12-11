import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

const originalPoolQuery = pool.query.bind(pool);
const tableNameCache = new Map();
const TABLE_BASES = [
  'factura_detalles',
  'movimientos_inventario',
  'producto_unidades',
  'config_tasa_cambio',
  'stock_sucursal',
  'factura_descuento',
  'factura_pagos',
  'producto_existencia',
  'reservas',
  'stock_danados',
  'nivelacion',
  'productos',
  'clientes',
  'usuarios',
  'sucursal',
  'factura',
  'descuentos'
].filter(Boolean).sort((a, b) => b.length - a.length);

const identifierPatternsCache = new Map();

const buildVariants = (base) => {
  const parts = base.split('_');
  const pascal = parts
    .map(segment => segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : segment)
    .join('_');
  const lower = base.toLowerCase();
  const upper = base.toUpperCase();
  const variants = new Set([base, lower, upper, pascal]);
  return Array.from(variants).filter(Boolean);
};

async function resolveTableName(executor, base) {
  if (tableNameCache.has(base)) return tableNameCache.get(base);
  const variants = buildVariants(base);
  const placeholders = variants.map(() => '?').join(', ');
  let actual = base;
  try {
    const [rows] = await executor(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) LIMIT ${variants.length}`,
      variants
    );
    if (Array.isArray(rows) && rows.length) {
      const found = new Set(rows.map(r => String(r.TABLE_NAME)));
      for (const variant of variants) {
        if (found.has(variant)) {
          actual = variant;
          break;
        }
      }
    }
  } catch {
    actual = base;
  }
  const meta = { raw: actual, quoted: `\`${actual}\`` };
  tableNameCache.set(base, meta);
  return meta;
}

const buildPatterns = (base, meta) => {
  const cacheKey = `${base}::${meta.raw}`;
  if (identifierPatternsCache.has(cacheKey)) return identifierPatternsCache.get(cacheKey);
  const escapedBase = base.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const patterns = [
    { regex: new RegExp(`\`${escapedBase}\``, 'gi'), value: meta.quoted },
    { regex: new RegExp(`\\b${escapedBase}\\b`, 'gi'), value: meta.quoted },
    { regex: new RegExp(`'${escapedBase}'`, 'gi'), value: `'${meta.raw}'` },
    { regex: new RegExp(`"${escapedBase}"`, 'gi'), value: `"${meta.raw}"` }
  ];
  identifierPatternsCache.set(cacheKey, patterns);
  return patterns;
};

async function mapSqlIdentifiers(executor, sql) {
  if (typeof sql !== 'string') return sql;
  const matchedBases = TABLE_BASES.filter(base => new RegExp(`(${base})`, 'i').test(sql));
  if (!matchedBases.length) return sql;
  const uniqueBases = Array.from(new Set(matchedBases)).sort((a, b) => b.length - a.length);
  const entries = await Promise.all(uniqueBases.map(async base => [base, await resolveTableName(executor, base)]));
  const tableMap = Object.fromEntries(entries);
  let mapped = sql;
  for (const base of uniqueBases) {
    const meta = tableMap[base];
    if (!meta) continue;
    const patterns = buildPatterns(base, meta);
    for (const { regex, value } of patterns) {
      mapped = mapped.replace(regex, value);
    }
  }
  return mapped;
}

async function queryWithResolvedTables(executor, sql, params = []) {
  const mappedSql = await mapSqlIdentifiers(executor, sql);
  return executor(mappedSql, params);
}

pool.query = function patchedPoolQuery(sql, params) {
  return queryWithResolvedTables(originalPoolQuery, sql, params);
};

function wrapConnection(conn) {
  if (conn.__tableCaseWrapped) return conn;
  const original = conn.query.bind(conn);
  conn.__tableCaseWrapped = true;
  conn.__rawQuery = original;
  conn.query = (sql, params) => queryWithResolvedTables(original, sql, params);
  return conn;
}

// Helper: find or create client by name/phone; returns client ID or null
async function getOrCreateCliente(conn, nombre, telefono) {
  const name = (nombre || '').toString().trim();
  const tel = (telefono || '').toString().trim();
  if (!name && !tel) return null;
  const clauses = []; const values = [];
  if (name) { clauses.push('NOMBRE_CLIENTE = ?'); values.push(name); }
  if (tel) { clauses.push('TELEFONO_CLIENTE = ?'); values.push(tel); }
  const [rows] = await conn.query(`SELECT ID_CLIENTES FROM clientes WHERE ${clauses.join(' OR ')} LIMIT 1`, values);
  if (rows?.length) return rows[0].ID_CLIENTES;
  if (!name) return null;
  const [ins] = await conn.query(
    `INSERT INTO clientes (NOMBRE_CLIENTE, DIRECCION_CLIENTE, TELEFONO_CLIENTE) VALUES (?, '', ?)`,
    [name, tel || null]
  );
  return ins.insertId || null;
}

export async function POST(req) {
  const conn = await pool.getConnection();
  wrapConnection(conn);
  try {
    const body = await req.json();
    const { items, subtotal, descuento = 0, total, pago = {}, cliente = {}, servicio_transporte = 0 } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No hay items en la venta' }, { status: 400 });
    }

    // User and sucursal from token if possible
    let usuarioId = null;
    let sucursalId = null;
    try {
      const token = req.cookies?.get?.('token')?.value ?? null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        usuarioId = decoded?.id || decoded?.sub || decoded?.userId || decoded?.user_id || null;
        sucursalId = decoded?.ID_SUCURSAL || decoded?.sucursal_id || null;
      }
    } catch { /* ignore */ }
    // allow override from payload
    if (body.usuario_id) usuarioId = body.usuario_id;
    if (body.sucursal_id) sucursalId = body.sucursal_id;

    // Fallback: derive sucursal from the usuario if not present in token/payload
    try {
      if (!sucursalId && usuarioId) {
        const [uRows] = await conn.query('SELECT ID_SUCURSAL FROM usuarios WHERE ID = ? LIMIT 1', [usuarioId]);
        if (uRows && uRows[0] && uRows[0].ID_SUCURSAL) sucursalId = uRows[0].ID_SUCURSAL;
      }
      // As an additional fallback, try by sucursal name in payload
      if (!sucursalId && body.sucursal) {
        const [suc] = await conn.query('SELECT ID_SUCURSAL FROM sucursal WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [body.sucursal]);
        if (suc && suc[0] && suc[0].ID_SUCURSAL) sucursalId = suc[0].ID_SUCURSAL;
      }
    } catch { /* ignore resolution errors */ }

    await conn.beginTransaction();

    // Detectar si FACTURA_DETALLES contiene columnas de unidad para trabajar de forma compatible
    let hasUnidadCols = { UNIDAD_ID: false, CANTIDAD_POR_UNIDAD: false, UNIDAD_NOMBRE: false };
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles'`);
      const colset = new Set((cols || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
      hasUnidadCols.UNIDAD_ID = colset.has('UNIDAD_ID');
      hasUnidadCols.CANTIDAD_POR_UNIDAD = colset.has('CANTIDAD_POR_UNIDAD');
      hasUnidadCols.UNIDAD_NOMBRE = colset.has('UNIDAD_NOMBRE');
    } catch (e) {
      // si falla la comprobación, asumimos compatibilidad mínima
    }

    // Validate and compute. Validación ahora considera multiplicador cantidad_por_unidad por item
    let computedSubtotal = 0;
    for (const it of items) {
      const idProd = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      if (!idProd || qty <= 0) throw new Error('Item inválido');
      computedSubtotal += precio * qty;

      // Ensure stock exists in STOCK_SUCURSAL and lock it
      if (!sucursalId && body.sucursal) {
        const [suc] = await conn.query('SELECT ID_SUCURSAL FROM sucursal WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [body.sucursal]);
        if (suc?.length) sucursalId = suc[0].ID_SUCURSAL;
      }
      if (!sucursalId) throw new Error('Sucursal no definida');

      // cantidad_por_unidad puede venir del cliente o asumirse 1
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const totalARestar = qty * cantidadPorUnidad;

      const [stockRows] = await conn.query(
        'SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE',
        [idProd, sucursalId]
      );
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      if (totalARestar > cantidadEnSucursal) throw new Error('Stock insuficiente para el producto ' + idProd);
    }

    const subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : computedSubtotal;
    const descuentoOk = Number(descuento || 0);
    const servicioTrans = Number((body?.servicio_transporte ?? body?.servicioTransporte ?? servicio_transporte) || 0) || 0;
    const totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk + servicioTrans);

    // Create invoice (FACTURA and FACTURA_DETALLES)
    const clienteId = await getOrCreateCliente(conn, cliente?.nombre, cliente?.telefono);
    const fecha = new Date();
    // Detectar si FACTURA tiene columnas opcionales (compatibilidad con esquemas previos)
    let hasFacturaSucursal = false;
    let hasFacturaNumero = false;
    let hasFacturaServicio = false;
    try {
      const [colRows] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'ID_SUCURSAL'
      `);
      hasFacturaSucursal = (colRows?.[0] && Number(colRows[0].CNT || 0) > 0) || false;
    } catch { hasFacturaSucursal = false; }
    try {
      const [colNum] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'NUMERO_FACTURA'
      `);
      hasFacturaNumero = (colNum?.[0] && Number(colNum[0].CNT || 0) > 0) || false;
    } catch { hasFacturaNumero = false; }
    try {
      const [colServ] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'SERVICIO_TRANSPORTE'
      `);
      hasFacturaServicio = (colServ?.[0] && Number(colServ[0].CNT || 0) > 0) || false;
    } catch { hasFacturaServicio = false; }

    // Generar número de factura (FAC-YYYYMMDD-HHMMSS) sin sufijo aleatorio
    const pad = n => String(n).padStart(2,'0');
    const y = fecha.getFullYear();
    const mo = pad(fecha.getMonth()+1);
    const da = pad(fecha.getDate());
    const hh = pad(fecha.getHours());
    const mi = pad(fecha.getMinutes());
    const ss = pad(fecha.getSeconds());
    let numeroFactura = `FAC-${y}${mo}${da}-${hh}${mi}${ss}`;

    // Si existe la columna y ya hay una colisión improbable, intentar sufijos incrementales
    if (hasFacturaNumero) {
      let intentos = 0;
      while (intentos < 5) {
        const [dup] = await conn.query('SELECT 1 FROM factura WHERE NUMERO_FACTURA = ? LIMIT 1', [numeroFactura]);
        if (!dup?.length) break;
        intentos++;
        numeroFactura = `FAC-${y}${mo}${da}-${hh}${mi}${ss}-${intentos}`;
      }
    }

    let facturaSql = hasFacturaNumero
      ? 'INSERT INTO factura (NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES) VALUES (?, ?, ?, ?, ?, NULL, ?)'
      : 'INSERT INTO factura (FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES) VALUES (?, ?, ?, ?, NULL, ?)';
    let facturaParams = hasFacturaNumero
      ? [numeroFactura, fecha, subtotalOk, descuentoOk, totalOk, clienteId || null]
      : [fecha, subtotalOk, descuentoOk, totalOk, clienteId || null];
    if (hasFacturaSucursal) {
      facturaSql = hasFacturaNumero
        ? 'INSERT INTO factura (NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES, ID_SUCURSAL) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)'
        : 'INSERT INTO factura (FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES, ID_SUCURSAL) VALUES (?, ?, ?, ?, NULL, ?, ?)';
      facturaParams = hasFacturaNumero
        ? [numeroFactura, fecha, subtotalOk, descuentoOk, totalOk, clienteId || null, sucursalId || null]
        : [fecha, subtotalOk, descuentoOk, totalOk, clienteId || null, sucursalId || null];
    }
    const [factRes] = await conn.query(facturaSql, facturaParams);
    const facturaId = factRes.insertId;

    // Si la columna SERVICIO_TRANSPORTE existe, guardarla (compatibilidad con esquemas que no la tengan)
    try {
      if (hasFacturaServicio) {
        await conn.query('UPDATE factura SET SERVICIO_TRANSPORTE = ? WHERE ID_FACTURA = ?', [servicioTrans, facturaId]);
      }
    } catch (err) {
      // no fatal
      console.error('No se pudo guardar SERVICIO_TRANSPORTE:', err?.message || err);
    }

    // Si se envió información detallada del descuento, almacenarla en tabla auxiliar
    try {
      const discountPayload = body?.discount;
      if (discountPayload) {
        const discId = discountPayload?.id || null;
        const percent = Number(discountPayload?.percent || 0) || 0;
        const amount = Number(discountPayload?.amount || 0) || 0;
        // Crear tabla si no existe (no asumimos migración previa)
        await conn.query(`
          CREATE TABLE IF NOT EXISTS factura_descuento (
            ID_DESCUENTO_FACTURA INT NOT NULL AUTO_INCREMENT,
            ID_FACTURA INT NOT NULL,
            ID_DESCUENTO INT DEFAULT NULL,
            PERCENT DECIMAL(6,2) DEFAULT 0.00,
            AMOUNT DECIMAL(12,2) DEFAULT 0.00,
            PRIMARY KEY (ID_DESCUENTO_FACTURA),
            KEY idx_fd_fact (ID_FACTURA),
            CONSTRAINT fk_fd_fact FOREIGN KEY (ID_FACTURA) REFERENCES factura(ID_FACTURA) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        await conn.query('INSERT INTO factura_descuento (ID_FACTURA, ID_DESCUENTO, PERCENT, AMOUNT) VALUES (?, ?, ?, ?)', [facturaId, discId, percent, amount]);
      }
    } catch (err) {
      // No detener la venta por un fallo en el guardado adicional del descuento
      console.error('Error guardando FACTURA_DESCUENTO:', err?.message || err);
    }

    // Insert details and update stocks per item (considerando cantidad_por_unidad)
    for (const it of items) {
      const idProd = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      const sub = Number((precio * qty).toFixed(2));

      const unidadId = it.unit_id ?? it.UNIDAD_ID ?? null;
      const unidadNombre = it.unit_name ?? it.UNIDAD_NOMBRE ?? null;
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const totalARestar = qty * cantidadPorUnidad;

      // Insert details including unidad columns si existen
      if (hasUnidadCols.UNIDAD_ID || hasUnidadCols.CANTIDAD_POR_UNIDAD || hasUnidadCols.UNIDAD_NOMBRE) {
        await conn.query(
          'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO'
          + (hasUnidadCols.UNIDAD_ID ? ', UNIDAD_ID' : '')
          + (hasUnidadCols.CANTIDAD_POR_UNIDAD ? ', CANTIDAD_POR_UNIDAD' : '')
          + (hasUnidadCols.UNIDAD_NOMBRE ? ', UNIDAD_NOMBRE' : '')
          + ') VALUES (?, ?, ?, ?, ?, ?'
          + (hasUnidadCols.UNIDAD_ID ? ', ?' : '')
          + (hasUnidadCols.CANTIDAD_POR_UNIDAD ? ', ?' : '')
          + (hasUnidadCols.UNIDAD_NOMBRE ? ', ?' : '')
          + ')',
          [facturaId, idProd, qty, precio, sub, usuarioId || null]
            .concat(hasUnidadCols.UNIDAD_ID ? [unidadId] : [])
            .concat(hasUnidadCols.CANTIDAD_POR_UNIDAD ? [cantidadPorUnidad] : [])
            .concat(hasUnidadCols.UNIDAD_NOMBRE ? [unidadNombre] : [])
        );
      } else {
        await conn.query(
          'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)',
          [facturaId, idProd, qty, precio, sub, usuarioId || null]
        );
      }

      const [stockRows] = await conn.query('SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProd, sucursalId]);
      const stockAnterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      const stockNuevo = stockAnterior - totalARestar;
      await conn.query('UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProd, sucursalId]);

      // Log movement as 'salida' with la cantidad real descontada
      try {
        await conn.query(
          `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
          [idProd, sucursalId, usuarioId || null, totalARestar, 'Venta', facturaId, stockAnterior, stockNuevo]
        );
      } catch { }
    }

    // Registrar pago (si existe tabla FACTURA_PAGOS)
    // Obtener tasa de cambio actual desde tabla de configuración si existe para evitar hardcode
    let tasaCambio = Number(pago?.tasaCambio || 0);
    try {
      if (!tasaCambio || isNaN(tasaCambio) || tasaCambio <= 0) {
        const [cfg] = await conn.query('SELECT TASA FROM config_tasa_cambio WHERE ID = 1 LIMIT 1');
        if (cfg?.length && cfg[0].TASA) tasaCambio = Number(cfg[0].TASA);
      }
    } catch { /* tabla puede no existir */ }
    if (!tasaCambio || isNaN(tasaCambio) || tasaCambio <= 0) tasaCambio = 36.55;
    const recibidoCordobas = Number(pago?.cordobas || 0);
    const recibidoDolares = Number(pago?.dolares || 0);
    const recibidoTotalC = recibidoCordobas + recibidoDolares * tasaCambio;
    const cambio = Math.max(0, Number((recibidoTotalC - totalOk).toFixed(2)));
    try {
      await conn.query(
        'INSERT INTO factura_pagos (ID_FACTURA, MONTO_CORDOBAS, MONTO_DOLARES, TASA_CAMBIO, METODO) VALUES (?, ?, ?, ?, ?)',
        [facturaId, recibidoCordobas, recibidoDolares, tasaCambio, pago?.metodo || 'efectivo']
      );
    } catch { /* Tabla no existe aún; ignorar para compatibilidad */ }

    await conn.commit();

  return Response.json({ ok: true, facturaId, numero: hasFacturaNumero ? numeroFactura : null, total: totalOk, cambio });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    return Response.json({ error: e.message || 'Error al procesar la venta' }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}

export async function GET(req) {
  try {
    // Detectar si existe la columna NUMERO_FACTURA para compatibilidad
    let hasFacturaNumero = false;
    try {
      const [colRows] = await pool.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'NUMERO_FACTURA'
      `);
      hasFacturaNumero = (colRows?.[0] && Number(colRows[0].CNT || 0) > 0) || false;
    } catch { hasFacturaNumero = false; }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    // Determinar sucursal efectiva segun el usuario (si tiene sucursal asignada => no es admin)
    let usuarioSucursalId = null;
    try {
      const token = req.cookies?.get?.('token')?.value ?? null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded?.id || decoded?.ID || decoded?.sub || null;
        if (userId) {
          const [[uRow]] = await pool.query('SELECT ID_SUCURSAL FROM usuarios WHERE ID = ? LIMIT 1', [userId]);
          if (uRow && uRow.ID_SUCURSAL) usuarioSucursalId = uRow.ID_SUCURSAL;
        }
      }
    } catch { usuarioSucursalId = null; }

    // If id provided, return detailed sale
    if (id) {
      try {
        const selectDetalle = hasFacturaNumero
          ? 'SELECT ID_FACTURA, NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, SERVICIO_TRANSPORTE, ID_CLIENTES, IFNULL(ID_SUCURSAL, NULL) AS ID_SUCURSAL FROM factura WHERE ID_FACTURA = ?'
          : 'SELECT ID_FACTURA, NULL AS NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, SERVICIO_TRANSPORTE, ID_CLIENTES, IFNULL(ID_SUCURSAL, NULL) AS ID_SUCURSAL FROM factura WHERE ID_FACTURA = ?';
        const [factRows] = await pool.query(selectDetalle, [id]);
        if (!factRows || !factRows.length) return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
        const f = factRows[0];

        // client
        const [clientRows] = await pool.query('SELECT ID_CLIENTES, NOMBRE_CLIENTE, TELEFONO_CLIENTE FROM clientes WHERE ID_CLIENTES = ?', [f.ID_CLIENTES || null]);
        const cliente = clientRows && clientRows[0] ? { id: clientRows[0].ID_CLIENTES, nombre: clientRows[0].NOMBRE_CLIENTE, telefono: clientRows[0].TELEFONO_CLIENTE } : null;

        // sucursal
        let sucursal = null;
        if (f.ID_SUCURSAL) {
          const [sucRows] = await pool.query('SELECT ID_SUCURSAL, NOMBRE_SUCURSAL FROM sucursal WHERE ID_SUCURSAL = ?', [f.ID_SUCURSAL]);
          if (sucRows && sucRows[0]) sucursal = { id: sucRows[0].ID_SUCURSAL, nombre: sucRows[0].NOMBRE_SUCURSAL };
        }

        // usuario who made the sale (take first user from detalles or from movimientos)
        const [userRows] = await pool.query(`
          SELECT COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS usuario, u.ID
          FROM factura_detalles fd
          LEFT JOIN usuarios u ON u.ID = fd.ID_USUARIO
          WHERE fd.ID_FACTURA = ? LIMIT 1
        `, [id]);
        const usuario = userRows && userRows[0] ? { id: userRows[0].ID, nombre: userRows[0].usuario } : null;

        // items
        const [itemsRows] = await pool.query(`
          SELECT fd.ID_DETALLES_FACTURA, fd.ID_PRODUCT, fd.AMOUNT AS cantidad, fd.PRECIO_UNIT AS precio_unit, fd.SUB_TOTAL AS subtotal,
                 fd.UNIDAD_ID AS unidad_id, fd.CANTIDAD_POR_UNIDAD AS cantidad_por_unidad, fd.UNIDAD_NOMBRE AS unidad_nombre,
                 p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
          FROM factura_detalles fd
          LEFT JOIN productos p ON p.ID_PRODUCT = fd.ID_PRODUCT
          WHERE fd.ID_FACTURA = ?
        `, [id]);

        // Construir el objeto factura básico
        const facturaObj = {
          id: f.ID_FACTURA,
          numero: f.NUMERO_FACTURA || null,
          fecha: f.FECHA,
          subtotal: Number(f.SUBTOTAL || 0),
          descuento: Number(f.DESCUENTO || 0),
          total: Number(f.TOTAL || 0),
          servicio_transporte: Number(f.SERVICIO_TRANSPORTE || 0),
          cliente,
          sucursal,
          usuario,
          items: (itemsRows || []).map(it => ({
            detalle_id: it.ID_DETALLES_FACTURA,
            producto_id: it.ID_PRODUCT,
            producto_nombre: it.producto_nombre,
            producto_codigo: it.producto_codigo,
            cantidad: Number(it.cantidad || 0),
            precio_unit: Number(it.precio_unit || 0),
            subtotal: Number(it.subtotal || 0),
            unidad_id: it.unidad_id ?? null,
            cantidad_por_unidad: Number(it.cantidad_por_unidad || 1),
            unidad_nombre: it.unidad_nombre || null
          }))
        };
        // Intentar adjuntar info de descuento si existe
        try {
          // obtener info adicional del descuento (codigo/nombre) si existe
          const [discRows] = await pool.query(
            `SELECT fd.ID_DESCUENTO, fd.PERCENT, fd.AMOUNT, d.CODIGO_DESCUENTO, d.NOMBRE_DESCUENTO
             FROM factura_descuento fd
             LEFT JOIN descuentos d ON fd.ID_DESCUENTO = d.ID_DESCUENTO
             WHERE fd.ID_FACTURA = ?`,
            [f.ID_FACTURA]
          );
          if (discRows && discRows[0]) {
            const disc = discRows[0];
            facturaObj.discount = {
              id: disc.ID_DESCUENTO || null,
              percent: Number(disc.PERCENT || 0),
              amount: Number(disc.AMOUNT || 0),
              codigo: disc.CODIGO_DESCUENTO || null,
              nombre: disc.NOMBRE_DESCUENTO || null
            };
          }
        } catch (e) { /* ignore additional discount read errors */ }

        return Response.json({ factura: facturaObj });
      } catch (e) {
        return Response.json({ error: e.message || 'Error al obtener detalle' }, { status: 500 });
      }
    }

    // Otherwise return list of ventas (general view). Si el usuario no es admin (tiene sucursal asignada) forzamos ese filtro.
    try {
      let sucursal = (searchParams.get('sucursal') || '').toString().trim();
      if (usuarioSucursalId) {
        // Usuario no admin: ignorar sucursal enviada y usar la suya
        sucursal = usuarioSucursalId;
      }

      // Construir SQL con filtro opcional por sucursal
            let sql = `
         SELECT f.ID_FACTURA AS id,
           ${hasFacturaNumero ? 'f.NUMERO_FACTURA' : 'NULL'} AS numero,
           DATE_FORMAT(f.FECHA, '%Y-%m-%d') AS fecha,
           DATE_FORMAT(f.FECHA, '%H:%i:%s') AS hora_sql,
           f.FECHA AS fecha_raw,
           f.TOTAL AS total,
           c.NOMBRE_CLIENTE AS cliente,
           s.NOMBRE_SUCURSAL AS sucursal,
           (SELECT COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') FROM factura_detalles fd LEFT JOIN usuarios u ON u.ID = fd.ID_USUARIO WHERE fd.ID_FACTURA = f.ID_FACTURA LIMIT 1) AS hecho_por
         FROM factura f
         LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
         LEFT JOIN sucursal s ON s.ID_SUCURSAL = f.ID_SUCURSAL`;
      const params = [];
      if (sucursal) {
        sql += ' WHERE f.ID_SUCURSAL = ?';
        params.push(sucursal);
      }
      sql += ' ORDER BY f.FECHA DESC LIMIT 1000';

      const [rows] = await pool.query(sql, params);

      const pad = n => String(n).padStart(2, '0');
      const formatDateParts = (value, fallbackYmd, fallbackTime) => {
        if (!value) {
          return {
            iso: null,
            ymd: fallbackYmd || '',
            display: fallbackYmd || '',
            time: fallbackTime || ''
          };
        }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
          return {
            iso: typeof value === 'string' ? value : null,
            ymd: fallbackYmd || (typeof value === 'string' ? value.slice(0, 10) : ''),
            display: fallbackYmd || (typeof value === 'string' ? value : ''),
            time: fallbackTime || ''
          };
        }
        const y = d.getFullYear();
        const m = pad(d.getMonth() + 1);
        const da = pad(d.getDate());
        return {
          iso: d.toISOString(),
          ymd: `${y}-${m}-${da}`,
          display: d.toLocaleDateString('es-ES'),
          time: d.toLocaleTimeString('es-ES')
        };
      };

      const mapped = (rows || []).map(r => {
        const parts = formatDateParts(r.fecha_raw, r.fecha, r.hora_sql);
        return {
          id: r.id,
          numero: r.numero || null,
          fecha: parts.display || r.fecha || '',
          fechaFiltro: parts.ymd || r.fecha || '',
          fechaIso: parts.iso,
          hora: parts.time || r.hora_sql || '',
          sucursal: r.sucursal || 'Sin sucursal',
          cliente: r.cliente || '',
          total: Number(r.total || 0),
          hecho_por: r.hecho_por || ''
        };
      });
      return Response.json({ ventas: mapped });
    } catch (e) {
      return Response.json({ error: e.message || 'Error al obtener ventas' }, { status: 500 });
    }
  } catch (err) {
    return Response.json({ error: err.message || 'Error en GET ventas' }, { status: 500 });
  }
}

export async function PUT(req) {
  const conn = await pool.getConnection();
  wrapConnection(conn);
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    let id = searchParams.get('id');
    // also allow /api/ventas/:id
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!id && last && last !== 'api' && last !== 'ventas') id = last;

    const body = await req.json();
    if (!id) return Response.json({ error: 'ID de factura requerido' }, { status: 400 });
    const { items, subtotal, descuento = 0, total, cliente = {} } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No hay items en la venta' }, { status: 400 });
    }

    await conn.beginTransaction();

    // Load existing factura and its sucursal
    const [factRows] = await conn.query('SELECT * FROM factura WHERE ID_FACTURA = ? FOR UPDATE', [id]);
    if (!factRows || !factRows.length) {
      await conn.rollback();
      return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    const factura = factRows[0];
    const sucursalId = factura.ID_SUCURSAL || null;

    // Detectar si FACTURA_DETALLES tiene columna CANTIDAD_POR_UNIDAD para revertir correctamente
    let detalleHasCantidadPorUnidad = false;
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles' AND COLUMN_NAME = 'CANTIDAD_POR_UNIDAD'`);
      detalleHasCantidadPorUnidad = (cols && cols.length > 0);
    } catch { detalleHasCantidadPorUnidad = false; }

    // Revert previous detalles: add back cantidades multiplicadas por CANTIDAD_POR_UNIDAD
    const selectPrevCols = detalleHasCantidadPorUnidad
      ? 'SELECT ID_PRODUCT, AMOUNT, IFNULL(CANTIDAD_POR_UNIDAD,1) AS CANTIDAD_POR_UNIDAD, ID_USUARIO FROM factura_detalles WHERE ID_FACTURA = ?'
      : 'SELECT ID_PRODUCT, AMOUNT, ID_USUARIO FROM factura_detalles WHERE ID_FACTURA = ?';
    const [prevDetalles] = await conn.query(selectPrevCols, [id]);
    const defaultUsuarioId = prevDetalles && prevDetalles[0] ? (prevDetalles[0].ID_USUARIO || null) : null;
    for (const pd of (prevDetalles || [])) {
      const prodId = Number(pd.ID_PRODUCT);
      const prevQty = Number(pd.AMOUNT || 0);
      const mult = Number(pd.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const restoreQty = prevQty * mult;
      if (!prodId) continue;
      // Increase stock
      await conn.query('UPDATE stock_sucursal SET CANTIDAD = CANTIDAD + ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [restoreQty, prodId, sucursalId]);
      // Log movimento as entrada (restock due to edit) and preserve usuario if available
      try {
        await conn.query(
          `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'entrada', ?, ?, ?, NULL, NULL)`,
          [prodId, sucursalId, defaultUsuarioId, restoreQty, 'Reversión por edición de venta', id]
        );
      } catch { }
    }

    // Remove old detalles
    await conn.query('DELETE FROM factura_detalles WHERE ID_FACTURA = ?', [id]);

    // Detectar columnas de unidad para insertar detalles con compatibilidad
    let hasUnidadCols = { UNIDAD_ID: false, CANTIDAD_POR_UNIDAD: false, UNIDAD_NOMBRE: false };
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles'`);
      const colset = new Set((cols || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
      hasUnidadCols.UNIDAD_ID = colset.has('UNIDAD_ID');
      hasUnidadCols.CANTIDAD_POR_UNIDAD = colset.has('CANTIDAD_POR_UNIDAD');
      hasUnidadCols.UNIDAD_NOMBRE = colset.has('UNIDAD_NOMBRE');
    } catch (e) { }

    // Prepare new detalles: validate stock availability (after revert)
    let computedSubtotal = 0;
    for (const it of items) {
      const prodId = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      if (!prodId || qty <= 0) {
        await conn.rollback();
        return Response.json({ error: 'Item inválido en nuevos items' }, { status: 400 });
      }
      // check stock
      const [stockRows] = await conn.query(
          `SELECT 
        ss.CANTIDAD, 
        s.NOMBRE_SUCURSAL
      FROM stock_sucursal ss
      INNER JOIN sucursal s ON ss.ID_SUCURSAL = s.ID_SUCURSAL
      WHERE ss.ID_PRODUCT = ? AND ss.ID_SUCURSAL = ? 
      FOR UPDATE`,
        [prodId, sucursalId]
      );
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      const nombreSucursal = stockRows.length ? stockRows[0].NOMBRE_SUCURSAL : 'Sucursal desconocida';
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const totalARestar = qty * cantidadPorUnidad;
      if (totalARestar > cantidadEnSucursal) {
        await conn.rollback();
        return Response.json({ error: `Stock insuficiente para producto ${nombreSucursal}` }, { status: 400 });
      }
      computedSubtotal += precio * qty;
    }

    const subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : computedSubtotal;
    const descuentoOk = Number(descuento || 0);
    const totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk);

    // Insert new detalles and decrement stock
    for (const it of items) {
      const prodId = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      const sub = Number((precio * qty).toFixed(2));

      const unidadId = it.unit_id ?? it.UNIDAD_ID ?? null;
      const unidadNombre = it.unit_name ?? it.UNIDAD_NOMBRE ?? null;
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const totalARestar = qty * cantidadPorUnidad;

      if (hasUnidadCols.UNIDAD_ID || hasUnidadCols.CANTIDAD_POR_UNIDAD || hasUnidadCols.UNIDAD_NOMBRE) {
        await conn.query(
          'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO'
          + (hasUnidadCols.UNIDAD_ID ? ', UNIDAD_ID' : '')
          + (hasUnidadCols.CANTIDAD_POR_UNIDAD ? ', CANTIDAD_POR_UNIDAD' : '')
          + (hasUnidadCols.UNIDAD_NOMBRE ? ', UNIDAD_NOMBRE' : '')
          + ') VALUES (?, ?, ?, ?, ?, ?'
          + (hasUnidadCols.UNIDAD_ID ? ', ?' : '')
          + (hasUnidadCols.CANTIDAD_POR_UNIDAD ? ', ?' : '')
          + (hasUnidadCols.UNIDAD_NOMBRE ? ', ?' : '')
          + ')',
          [id, prodId, qty, precio, sub, defaultUsuarioId]
            .concat(hasUnidadCols.UNIDAD_ID ? [unidadId] : [])
            .concat(hasUnidadCols.CANTIDAD_POR_UNIDAD ? [cantidadPorUnidad] : [])
            .concat(hasUnidadCols.UNIDAD_NOMBRE ? [unidadNombre] : [])
        );
      } else {
        await conn.query(
          'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)',
          [id, prodId, qty, precio, sub, defaultUsuarioId]
        );
      }

      const [stockRows] = await conn.query('SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [prodId, sucursalId]);
      const stockAnterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      const stockNuevo = stockAnterior - totalARestar;
      await conn.query('UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, prodId, sucursalId]);
      try {
        await conn.query(
          `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
          [prodId, sucursalId, defaultUsuarioId, totalARestar, 'Edición venta', id, stockAnterior, stockNuevo]
        );
      } catch { }
    }

    // Update factura (subtotal, descuento, total, cliente)
  const clienteNombre = (cliente?.nombre || cliente?.cliente_nombre || body?.cliente_nombre || '').toString();
  const clienteTelefono = (cliente?.telefono || cliente?.telefono_cliente || body?.telefono_cliente || '').toString();
  const clienteId = await getOrCreateCliente(conn, clienteNombre, clienteTelefono);
    // Detectar si FACTURA tiene columna SERVICIO_TRANSPORTE para actualizarla también
    let hasFacturaServicio = false;
    try {
      const [colServ] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'SERVICIO_TRANSPORTE'
      `);
      hasFacturaServicio = (colServ?.[0] && Number(colServ[0].CNT || 0) > 0) || false;
    } catch { hasFacturaServicio = false; }
    const servicioTrans = Number((body?.servicio_transporte ?? body?.servicioTransporte) || 0) || 0;
    if (hasFacturaServicio) {
      await conn.query('UPDATE factura SET SUBTOTAL = ?, DESCUENTO = ?, TOTAL = ?, ID_CLIENTES = ?, SERVICIO_TRANSPORTE = ? WHERE ID_FACTURA = ?', [subtotalOk, descuentoOk, totalOk, clienteId || null, servicioTrans, id]);
    } else {
      await conn.query('UPDATE factura SET SUBTOTAL = ?, DESCUENTO = ?, TOTAL = ?, ID_CLIENTES = ? WHERE ID_FACTURA = ?', [subtotalOk, descuentoOk, totalOk, clienteId || null, id]);
    }

    // Actualizar/insertar información de descuento asociada (si viene en payload)
    try {
      const discountPayload = body?.discount;
      if (discountPayload) {
        const discId = discountPayload?.id || null;
        const percent = Number(discountPayload?.percent || 0) || 0;
        const amount = Number(discountPayload?.amount || 0) || 0;
        await conn.query(`
          CREATE TABLE IF NOT EXISTS factura_descuento (
            ID_DESCUENTO_FACTURA INT NOT NULL AUTO_INCREMENT,
            ID_FACTURA INT NOT NULL,
            ID_DESCUENTO INT DEFAULT NULL,
            PERCENT DECIMAL(6,2) DEFAULT 0.00,
            AMOUNT DECIMAL(12,2) DEFAULT 0.00,
            PRIMARY KEY (ID_DESCUENTO_FACTURA),
            KEY idx_fd_fact (ID_FACTURA),
            CONSTRAINT fk_fd_fact FOREIGN KEY (ID_FACTURA) REFERENCES factura(ID_FACTURA) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        // Eliminar registros previos y crear nuevo (mantener simple)
        await conn.query('DELETE FROM factura_descuento WHERE ID_FACTURA = ?', [id]);
        await conn.query('INSERT INTO factura_descuento (ID_FACTURA, ID_DESCUENTO, PERCENT, AMOUNT) VALUES (?, ?, ?, ?)', [id, discId, percent, amount]);
      } else {
        // Si no viene descuento en payload, eliminar cualquier registro previo
        await conn.query('DELETE FROM factura_descuento WHERE ID_FACTURA = ?', [id]);
      }
    } catch (err) {
      console.error('Error actualizando factura_descuento:', err?.message || err);
    }

    await conn.commit();
    return Response.json({ ok: true, facturaId: id, total: totalOk });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    const message = e && e.message ? e.message : 'Error al editar la venta';
    return Response.json({ error: message }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}

export async function DELETE(req) {
  const conn = await pool.getConnection();
  wrapConnection(conn);
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    let id = searchParams.get('id');
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!id && last && last !== 'api' && last !== 'ventas') id = last;

    if (!id) return Response.json({ error: 'ID de factura requerido' }, { status: 400 });

    await conn.beginTransaction();

    const [factRows] = await conn.query('SELECT * FROM factura WHERE ID_FACTURA = ? FOR UPDATE', [id]);
    if (!factRows || !factRows.length) {
      await conn.rollback();
      return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    const factura = factRows[0];
    const sucursalId = factura.ID_SUCURSAL || null;

    // Restore stock from detalles (consider CANTIDAD_POR_UNIDAD if existe)
    let detalleHasCantidadPorUnidad = false;
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles' AND COLUMN_NAME = 'CANTIDAD_POR_UNIDAD'`);
      detalleHasCantidadPorUnidad = (cols && cols.length > 0);
    } catch { detalleHasCantidadPorUnidad = false; }

    const selectDetalleCols = detalleHasCantidadPorUnidad
      ? 'SELECT ID_PRODUCT, AMOUNT, IFNULL(CANTIDAD_POR_UNIDAD,1) AS CANTIDAD_POR_UNIDAD FROM factura_detalles WHERE ID_FACTURA = ?'
      : 'SELECT ID_PRODUCT, AMOUNT FROM factura_detalles WHERE ID_FACTURA = ?';
    const [detalles] = await conn.query(selectDetalleCols, [id]);
    for (const d of (detalles || [])) {
      const prodId = Number(d.ID_PRODUCT);
      const qty = Number(d.AMOUNT || 0);
      const mult = Number(d.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const restoreQty = qty * mult;
      await conn.query('UPDATE stock_sucursal SET CANTIDAD = CANTIDAD + ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [restoreQty, prodId, sucursalId]);
      try {
        await conn.query(
          `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, NULL, 'entrada', ?, ?, ?, NULL, NULL)`,
          [prodId, sucursalId, restoreQty, 'Reversión por eliminación de venta', id]
        );
      } catch { }
    }

    // Delete detalles, pagos, factura
    try { await conn.query('DELETE FROM factura_pagos WHERE ID_FACTURA = ?', [id]); } catch { }
    await conn.query('DELETE FROM factura_detalles WHERE ID_FACTURA = ?', [id]);
    await conn.query('DELETE FROM factura WHERE ID_FACTURA = ?', [id]);

    await conn.commit();
    return Response.json({ ok: true, deleted: id });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    const message = e && e.message ? e.message : 'Error al eliminar la venta';
    return Response.json({ error: message }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}
