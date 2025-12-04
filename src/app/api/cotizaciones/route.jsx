import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// Utils: parse and normalize date to 'YYYY-MM-DD' (no TZ shift)
function toYMDString(input) {
  if (!input) return null;
  const pad = (n) => String(n).padStart(2, '0');
  let d;
  if (input instanceof Date) {
    d = new Date(input.getTime());
  } else if (typeof input === 'number') {
    d = new Date(input);
  } else if (typeof input === 'string') {
    const s = input.trim();
    // dd/MM/yyyy
    const m1 = s.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m1) {
      const day = Number(m1[1]);
      const mon = Number(m1[2]);
      const yr = Number(m1[3]);
      d = new Date(yr, mon - 1, day);
    } else {
      // yyyy-MM-dd (or any Date-parsable fallback)
      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m2) {
        const yr = Number(m2[1]);
        const mon = Number(m2[2]);
        const day = Number(m2[3]);
        d = new Date(yr, mon - 1, day);
      } else {
        const tmp = new Date(s);
        if (isNaN(tmp.getTime())) return null;
        d = tmp;
      }
    }
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;
  // build local date Y-M-D without time (prevents timezone off-by-one in DATE columns)
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
}

// Helpers reutilizados del módulo de stock para registrar movimientos
async function getAllowedTipoMovimiento(conn) {
  try {
    const [rows] = await conn.query(`
      SELECT COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movimientos_inventario' AND COLUMN_NAME = 'tipo_movimiento'
    `);
    const ct = rows?.[0]?.COLUMN_TYPE || '';
    const matches = ct.match(/'([^']+)'/g);
    return matches ? matches.map(m => m.replace(/'/g, '')) : [];
  } catch {
    return [];
  }
}

function chooseTipo(allowed, requested, fallback) {
  if (allowed.includes(requested)) return requested;
  if (allowed.includes(fallback)) return fallback;
  return allowed[0] || fallback || requested || 'salida';
}

// Expira una cotización (si sigue activa y vencida) y devuelve el stock a la sucursal
async function expireCotizacionAndReturnStock(cotizacionId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Bloquear cabecera
    const [cRows] = await conn.query(
      `SELECT ID_COTIZACION, FECHA_VENCIMIENTO, ESTADO, ID_SUCURSAL, ID_USUARIO FROM cotizacion WHERE ID_COTIZACION = ? FOR UPDATE`,
      [cotizacionId]
    );
    if (!cRows?.length) { await conn.rollback(); conn.release(); return false; }
    const ch = cRows[0];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expDate = ch.FECHA_VENCIMIENTO ? new Date(ch.FECHA_VENCIMIENTO) : null;
    if (expDate) expDate.setHours(0, 0, 0, 0);
    const isExpiredNow = expDate ? (expDate <= today) : false;
    if (!(ch.ESTADO === 'activa' && isExpiredNow)) {
      await conn.rollback(); conn.release();
      return false; // nada que hacer
    }

    // Marcar expirada
    await conn.query(`UPDATE cotizacion SET ESTADO = 'expirada' WHERE ID_COTIZACION = ? AND ESTADO = 'activa'`, [cotizacionId]);

    // Devolver stock por cada detalle (tener en cuenta CANTIDAD_POR_UNIDAD si existe)
    const [detRows] = await conn.query(
      `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, COALESCE(d.CANTIDAD_POR_UNIDAD,1) AS cantidad_por_unidad
       FROM COTIZACION_DETALLES d
       WHERE d.ID_COTIZACION = ?`,
      [cotizacionId]
    );

    const allowedTipos = await getAllowedTipoMovimiento(conn);
    const tipoEntrada = chooseTipo(allowedTipos, 'entrada', 'entrada');
    const sucursalId = ch.ID_SUCURSAL;
    const usuarioId = ch.ID_USUARIO || null;

    for (const det of detRows || []) {
      const idProd = Number(det.ID_PRODUCT);
      const qty = Number(det.cantidad || 0);
      const factor = Number(det.cantidad_por_unidad || 1) || 1;
      const qtyReal = qty * factor;
      if (!idProd || qty <= 0 || !sucursalId) continue;
      const [stRows] = await conn.query(
        'SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE',
        [idProd, sucursalId]
      );
      const anterior = stRows?.length ? Number(stRows[0].CANTIDAD || 0) : 0;
      const nuevo = anterior + qtyReal;
      if (stRows?.length) {
        await conn.query('UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevo, idProd, sucursalId]);
      } else {
        await conn.query('INSERT INTO stock_sucursal (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [idProd, sucursalId, nuevo]);
      }
      // registrar movimiento
      try {
        await conn.query(
          `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [idProd, sucursalId, usuarioId, tipoEntrada, qtyReal, 'Expiración de cotización', cotizacionId, anterior, nuevo]
        );
      } catch { /* ignore */ }
    }

    await conn.commit();
    conn.release();
    return true;
  } catch (e) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    return false;
  }
}

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

function parseAuth(req) {
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
  return { usuarioId, sucursalId };
}

export async function POST(req) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const { items, subtotal, descuento = 0, total, cliente = {}, fecha_vencimiento, notas, transporte = 0 } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No hay items en la cotización' }, { status: 400 });
    }
    // Validaciones obligatorias: cliente nombre y telefono
    const clienteNombre = (cliente?.nombre || cliente?.cliente_nombre || body?.cliente_nombre || '').toString().trim();
    const clienteTelefono = (cliente?.telefono || cliente?.telefono_cliente || body?.telefono_cliente || '').toString().trim();
    if (!clienteNombre || !clienteTelefono) {
      return Response.json({ error: 'Cliente y teléfono son obligatorios' }, { status: 400 });
    }

    // Validar fecha de vencimiento >= hoy (sin horas)
    if (!fecha_vencimiento) {
      return Response.json({ error: 'Fecha de vencimiento requerida' }, { status: 400 });
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expStr = toYMDString(fecha_vencimiento);
    if (!expStr) {
      return Response.json({ error: 'Formato de fecha inválido. Usa dd/MM/yyyy o yyyy-MM-dd' }, { status: 400 });
    }
    const exp = new Date(expStr + 'T00:00:00');
    if (isNaN(exp.getTime()) || exp < today) {
      return Response.json({ error: 'La fecha de vencimiento no puede ser anterior a hoy' }, { status: 400 });
    }

    let { usuarioId, sucursalId } = parseAuth(req);
    if (body.usuario_id) usuarioId = body.usuario_id;
    if (body.sucursal_id) sucursalId = body.sucursal_id;
    try {
      if (!sucursalId && usuarioId) {
        const [uRows] = await conn.query('SELECT ID_SUCURSAL FROM usuarios WHERE ID = ? LIMIT 1', [usuarioId]);
        if (uRows && uRows[0] && uRows[0].ID_SUCURSAL) sucursalId = uRows[0].ID_SUCURSAL;
      }
      if (!sucursalId && body.sucursal) {
        const [suc] = await conn.query('SELECT ID_SUCURSAL FROM sucursal WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [body.sucursal]);
        if (suc && suc[0] && suc[0].ID_SUCURSAL) sucursalId = suc[0].ID_SUCURSAL;
      }
    } catch { }

    await conn.beginTransaction();

    // Calcular totales del servidor
    let computedSubtotal = 0;
    for (const it of items) {
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || it.unitPrice || 0);
      if (qty <= 0) throw new Error('Item inválido');
      computedSubtotal += precio * qty;
    }
    const subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : computedSubtotal;
    const descuentoOk = Number(descuento || 0);
    const transporteOk = Number(transporte || 0);
    const totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk + transporteOk);

    const clienteId = await getOrCreateCliente(conn, clienteNombre, clienteTelefono);
    const fechaCreacion = new Date();

    // Generar SIEMPRE un ID string tipo COT-YYYYMMDD-HHMMSS-XXXX para guardar como VARCHAR(24)
    const pad = (n) => String(n).padStart(2, '0');
    const y = fechaCreacion.getFullYear();
    const m = pad(fechaCreacion.getMonth() + 1);
    const d = pad(fechaCreacion.getDate());
    const hh = pad(fechaCreacion.getHours());
    const mm = pad(fechaCreacion.getMinutes());
    const ss = pad(fechaCreacion.getSeconds());
    const rand = Math.floor(Math.random() * 9000) + 1000; // 4 dígitos para evitar colisiones
    const newId = `COT-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;

    await conn.query(
      `INSERT INTO cotizacion (ID_COTIZACION, FECHA_CREACION, FECHA_VENCIMIENTO, SUBTOTAL, DESCUENTO, SERVICIO_TRANSPORTE, TOTAL, ESTADO, ID_CLIENTES, ID_SUCURSAL, ID_USUARIO, NOTAS)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'activa', ?, ?, ?, ?)`,
      // Pass a pure date string to avoid timezone conversion in MySQL DATE column
      [newId, fechaCreacion, expStr, subtotalOk, descuentoOk, transporteOk, totalOk, clienteId || null, sucursalId || null, usuarioId || null, notas || null]
    );

    // Insertar detalles (no afecta stock)
    const insertedItems = [];
    let detallesInsertados = 0;
    // Detectar columnas de unidades en COTIZACION_DETALLES para compatibilidad
    let hasUnidadCols = false;
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES'`);
      const present = new Set((cols || []).map(r => String(r.COLUMN_NAME)));
      hasUnidadCols = present.has('UNIDAD_ID') || present.has('CANTIDAD_POR_UNIDAD') || present.has('UNIDAD_NOMBRE');
    } catch { hasUnidadCols = false; }
    for (const it of items) {
      const idProd = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || it.unitPrice || 0);
      if (!idProd || qty <= 0) continue; // ignora líneas inválidas sin abortar toda la transacción
      const sub = Number((precio * qty).toFixed(2));
      let detRes;
      // declarar variables de unidad en el scope del bucle para evitar ReferenceError
      let unidadId = null;
      let cantidadPorUnidad = 1;
      let unidadNombre = null;
      if (hasUnidadCols) {
        // asignar valores si las columnas están presentes (aceptar formas camelCase y english keys)
        unidadId = it.UNIDAD_ID || it.unidad_id || it.unit_id || it.unit || null;
        cantidadPorUnidad = Number((it.cantidad_por_unidad ?? it.cantidadPorUnidad ?? it.CANTIDAD_POR_UNIDAD ?? 1)) || 1;
        unidadNombre = it.UNIDAD_NOMBRE || it.unidad_nombre || it.unit_name || it.unit || null;
        [detRes] = await conn.query(
          `INSERT INTO COTIZACION_DETALLES (ID_COTIZACION, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, UNIDAD_ID, CANTIDAD_POR_UNIDAD, UNIDAD_NOMBRE)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId, idProd, qty, precio, sub, unidadId, cantidadPorUnidad, unidadNombre]
        );
      } else {
        [detRes] = await conn.query(
          `INSERT INTO COTIZACION_DETALLES (ID_COTIZACION, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL)
           VALUES (?, ?, ?, ?, ?)`,
          [newId, idProd, qty, precio, sub]
        );
      }
      if (detRes?.affectedRows) detallesInsertados += detRes.affectedRows;
      insertedItems.push({
        ID_PRODUCT: idProd,
        cantidad: qty,
        unitPrice: precio,
        subtotal: sub,
        cantidad_por_unidad: hasUnidadCols ? cantidadPorUnidad : 1,
        unidad_id: hasUnidadCols ? (unidadId || null) : null,
        unidad_nombre: hasUnidadCols ? (unidadNombre || null) : null,
      });
    }

    // Enriquecer productos con nombre y código para respuesta inmediata
    let enriched = [];
    if (insertedItems.length) {
      const ids = insertedItems.map(i => i.ID_PRODUCT);
      const placeholders = ids.map(() => '?').join(',');
      try {
        const [rowsProd] = await conn.query(
          `SELECT p.ID_PRODUCT, p.PRODUCT_NAME, p.CODIGO_PRODUCTO, um.NOMBRE_UNIDAD
           FROM productos p
           LEFT JOIN unidades_medidas um ON um.ID_UNIDAD = p.ID_UNIDAD
           WHERE p.ID_PRODUCT IN (${placeholders})`, ids
        );
        enriched = insertedItems.map(it => {
          const meta = rowsProd.find(r => r.ID_PRODUCT === it.ID_PRODUCT) || {};
          return {
            producto_id: it.ID_PRODUCT,
            productName: meta.PRODUCT_NAME || null,
            productCode: meta.CODIGO_PRODUCTO || null,
            cantidad: it.cantidad,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
            measureUnit: meta.NOMBRE_UNIDAD || null,
          };
        });
      } catch { }
    }

    // ---- Descontar stock de la sucursal (nuevo requisito) ----
    if (!sucursalId) {
      throw new Error('Sucursal no determinada: no se puede descontar stock');
    }

    // Agrupar cantidades por producto (por si llegan repetidos)
    // Calcular cantidad real por producto teniendo en cuenta cantidad_por_unidad
    const qtyByProduct = insertedItems.reduce((acc, it) => {
      const factor = Number(it.cantidad_por_unidad || 1) || 1;
      acc[it.ID_PRODUCT] = (acc[it.ID_PRODUCT] || 0) + Number(it.cantidad || 0) * factor;
      return acc;
    }, {});

    const allowedTipos = await getAllowedTipoMovimiento(conn);
    const tipoMovimiento = chooseTipo(allowedTipos, 'reservado', 'salida');
    let movimientosRegistrados = 0;

    for (const [prodId, qtyNeeded] of Object.entries(qtyByProduct)) {
      const idProd = Number(prodId);
      if (!idProd || qtyNeeded <= 0) continue;
      // Bloquear fila de stock
      const [stockRows] = await conn.query(
        'SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE',
        [idProd, sucursalId]
      );
      if (!stockRows.length) {
        throw new Error(`Producto ${idProd} sin stock registrado en la sucursal`);
      }
      const actual = Number(stockRows[0].CANTIDAD || 0);
      if (actual < qtyNeeded) {
        throw new Error(`Stock insuficiente para el producto ${idProd}. Disponible: ${actual}, requerido: ${qtyNeeded}`);
      }
      const nuevo = actual - qtyNeeded;
      await conn.query(
        'UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?',
        [nuevo, idProd, sucursalId]
      );
      // Registrar movimiento (best-effort)
      try {
        await conn.query(
          `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [idProd, sucursalId, usuarioId || null, tipoMovimiento, qtyNeeded, `Cotizacion ${newId}`, newId, actual, nuevo]
        );
        movimientosRegistrados++;
      } catch {/* ignore movement errors */ }
    }

    await conn.commit();

    return Response.json({
      ok: true,
      id: newId,
      total: totalOk,
      subtotal: subtotalOk,
      descuento: descuentoOk,
      products: enriched,
      detallesInsertados,
      stockMovimientos: movimientosRegistrados,
      warning: detallesInsertados === 0 ? 'No se insertaron detalles: verifique que la tabla COTIZACION_DETALLES tenga ID_COTIZACION VARCHAR(30)' : undefined,
    });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    return Response.json({ error: e?.message || 'Error al crear la cotización' }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      // Detalle
      const [rows] = await pool.query(
        `SELECT c.ID_COTIZACION, c.FECHA_CREACION, c.FECHA_VENCIMIENTO, c.SUBTOTAL, c.DESCUENTO, c.SERVICIO_TRANSPORTE, c.TOTAL, c.ESTADO,
                c.ID_CLIENTES, cli.NOMBRE_CLIENTE, cli.TELEFONO_CLIENTE,
                c.ID_SUCURSAL, s.NOMBRE_SUCURSAL,
                c.ID_USUARIO, COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS USUARIO
         FROM cotizacion c
         LEFT JOIN clientes cli ON cli.ID_CLIENTES = c.ID_CLIENTES
         LEFT JOIN sucursal s ON s.ID_SUCURSAL = c.ID_SUCURSAL
         LEFT JOIN usuarios u ON u.ID = c.ID_USUARIO
         WHERE c.ID_COTIZACION = ?
        `, [id]
      );
      if (!rows?.length) return Response.json({ error: 'Cotización no encontrada' }, { status: 404 });
      const c = rows[0];

      // Auto-expirar y devolver stock si corresponde (inclusive <= hoy)
      try {
        if (c.ESTADO === 'activa' && c.FECHA_VENCIMIENTO) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const expDate = new Date(c.FECHA_VENCIMIENTO); expDate.setHours(0, 0, 0, 0);
          if (expDate <= today) {
            await expireCotizacionAndReturnStock(id);
            c.ESTADO = 'expirada';
          }
        }
      } catch { }

      // Detectar columnas de unidad en COTIZACION_DETALLES para seleccionar si existen
      let hasUnidadColsLocal = false;
      try {
        const [colRows] = await pool.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES'`);
        const present = new Set((colRows || []).map(r => String(r.COLUMN_NAME)));
        hasUnidadColsLocal = present.has('UNIDAD_ID') || present.has('CANTIDAD_POR_UNIDAD') || present.has('UNIDAD_NOMBRE');
      } catch { hasUnidadColsLocal = false; }

      // Intento principal: unimos contra cabecera para evitar discrepancias de tipos
      const selectItemsSql = `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, d.PRECIO_UNIT AS precio_unit, d.SUB_TOTAL AS subtotal,
              ${hasUnidadColsLocal ? 'd.UNIDAD_ID AS unidad_id, d.CANTIDAD_POR_UNIDAD AS cantidad_por_unidad, d.UNIDAD_NOMBRE AS unidad_nombre,' : ''}
              p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
         FROM cotizacion c
         LEFT JOIN COTIZACION_DETALLES d ON d.ID_COTIZACION = c.ID_COTIZACION
         LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
         WHERE c.ID_COTIZACION = ?
         ORDER BY d.ID_DETALLE_COTIZACION ASC`;

      let [items] = await pool.query(selectItemsSql, [id]);
      // Fallbacks (legacy schemas)
      if (!items || items.length === 0) {
        const numericId = Number(id);
        if (!Number.isNaN(numericId)) {
          const [retryNum] = await pool.query(
            `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, d.PRECIO_UNIT AS precio_unit, d.SUB_TOTAL AS subtotal,
                    p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
             FROM cotizacion c
             LEFT JOIN COTIZACION_DETALLES d ON d.ID_COTIZACION = c.ID_COTIZACION
             LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
             WHERE c.ID_COTIZACION = ?`, [numericId]
          );
          items = retryNum;
        }
        if (!items || items.length === 0) {
          const [retryCast] = await pool.query(
            `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, d.PRECIO_UNIT AS precio_unit, d.SUB_TOTAL AS subtotal,
                    p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
             FROM COTIZACION_DETALLES d
             LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
             WHERE CAST(d.ID_COTIZACION AS CHAR) = ?`, [id]
          );
          items = retryCast;
        }
        if ((!items || items.length === 0) && /^COT-\d{8}-/.test(id)) {
          const core = id.split('-')[1];
          const [retryCore] = await pool.query(
            `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, d.PRECIO_UNIT AS precio_unit, d.SUB_TOTAL AS subtotal,
                    p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
             FROM COTIZACION_DETALLES d
             LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
             WHERE d.ID_COTIZACION = ?`, [core]
          );
          if (retryCore?.length) items = retryCore;
        }
        if (!items || items.length === 0) {
          const [direct] = await pool.query(
            `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, d.PRECIO_UNIT AS precio_unit, d.SUB_TOTAL AS subtotal,
                    p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
             FROM COTIZACION_DETALLES d
             LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
             WHERE d.ID_COTIZACION = ? OR TRIM(d.ID_COTIZACION) = TRIM(?) OR BINARY d.ID_COTIZACION = BINARY ?`, [id, id, id]
          );
          if (direct?.length) items = direct;
        }
      }

      return Response.json({
        cotizacion: {
          id: c.ID_COTIZACION,
          fecha: c.FECHA_CREACION,
          fechaExp: c.FECHA_VENCIMIENTO,
          subtotal: Number(c.SUBTOTAL || 0),
          descuento: Number(c.DESCUENTO || 0),
          transporte: Number(c.SERVICIO_TRANSPORTE || 0),
          total: Number(c.TOTAL || 0),
          estado: c.ESTADO,
          cliente: c.NOMBRE_CLIENTE || '',
          telefono: c.TELEFONO_CLIENTE || '',
          sucursal: c.ID_SUCURSAL ? { id: c.ID_SUCURSAL, name: c.NOMBRE_SUCURSAL } : null,
          creadaPor: c.USUARIO || '',
          products: (items || []).map(it => ({
            producto_id: it.ID_PRODUCT,
            productName: it.producto_nombre,
            productCode: it.producto_codigo,
            cantidad: Number(it.cantidad || 0),
            unitPrice: Number(it.precio_unit || 0),
            subtotal: Number(it.subtotal || 0),
            measureUnit: it.unidad_nombre || it.unidad_medida || null,
            unidad_id: it.unidad_id || null,
            cantidad_por_unidad: Number(it.cantidad_por_unidad || it.CANTIDAD_POR_UNIDAD || 1) || 1,
          }))
        }
      });
    }

    // Listado con filtro sucursal para no admin
    const { getUserSucursalContext } = await import('@/lib/auth/getUserSucursal');
    const { isAdmin, sucursalId } = await getUserSucursalContext(req);
    const where = !isAdmin && sucursalId ? 'WHERE c.ID_SUCURSAL = ?' : '';
    const params = !isAdmin && sucursalId ? [sucursalId] : [];
    const [rows] = await pool.query(
      `SELECT c.ID_COTIZACION AS id,
              DATE_FORMAT(c.FECHA_CREACION, '%Y-%m-%d') AS fecha,
              c.TOTAL AS total,
              DATE_FORMAT(c.FECHA_VENCIMIENTO, '%Y-%m-%d') AS fechaExp,
              c.ESTADO AS estado,
              cli.NOMBRE_CLIENTE AS cliente,
              cli.TELEFONO_CLIENTE AS telefono,
              (SELECT COUNT(1) FROM COTIZACION_DETALLES d WHERE d.ID_COTIZACION = c.ID_COTIZACION) AS items,
              COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS creadaPor,
              s.ID_SUCURSAL, s.NOMBRE_SUCURSAL
       FROM cotizacion c
       LEFT JOIN clientes cli ON cli.ID_CLIENTES = c.ID_CLIENTES
       LEFT JOIN usuarios u ON u.ID = c.ID_USUARIO
       LEFT JOIN sucursal s ON s.ID_SUCURSAL = c.ID_SUCURSAL
       ${where}
       ORDER BY c.FECHA_CREACION DESC
       LIMIT 1000`,
      params
    );
    // Batch auto-expirar activas y devolver stock
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const updates = [];
    for (const r of rows || []) {
      if (r.estado === 'activa' && r.fechaExp) {
        try {
          // Parse 'YYYY-MM-DD' as a local date to avoid UTC off-by-one
          const m = String(r.fechaExp).match(/^(\d{4})-(\d{2})-(\d{2})$/);
          const exp = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(r.fechaExp);
          exp.setHours(0, 0, 0, 0);
          if (exp <= today) updates.push(r.id);
        } catch { }
      }
    }
    // Map final including updated estado
    const mapped = (rows || []).map(r => ({
      id: r.id,
      fecha: r.fecha,
      cliente: r.cliente || 'Consumidor Final',
      telefono: r.telefono || '',
      items: Number(r.items || 0),
      total: Number(r.total || 0),
      fechaExp: r.fechaExp,
      estado: (updates.includes(r.id) ? 'expirada' : r.estado),
      creadaPor: r.creadaPor || '',
      sucursal: r.ID_SUCURSAL ? { id: r.ID_SUCURSAL, name: r.NOMBRE_SUCURSAL } : null,
    }));
    return Response.json({ cotizaciones: mapped });
  } catch (e) {
    return Response.json({ error: e?.message || 'Error al obtener cotizaciones' }, { status: 500 });
  }
}

export async function PUT(req) {
  const conn = await pool.getConnection();
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    let id = searchParams.get('id');
    const action = (searchParams.get('action') || '').toString().toLowerCase();
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!id && last && last !== 'api' && last !== 'cotizaciones') id = last;
    if (!id) return Response.json({ error: 'ID de cotización requerido' }, { status: 400 });

    const body = await req.json();
    const { items, subtotal, descuento = 0, total, cliente = {}, fecha_vencimiento, notas, estado } = body || {};

    // Procesar venta desde cotización (convertir a factura) sin tocar stock (ya reservado al crear cotización)
    if (action === 'procesar' || action === 'procesar-venta') {
      try {
        await conn.beginTransaction();
        // Cargar cotización
        const [cRows] = await conn.query(
          `SELECT ID_COTIZACION, FECHA_VENCIMIENTO, SUBTOTAL, DESCUENTO, TOTAL, ESTADO, ID_CLIENTES, ID_SUCURSAL, ID_USUARIO
           FROM cotizacion WHERE ID_COTIZACION = ? FOR UPDATE`, [id]
        );
        if (!cRows?.length) {
          await conn.rollback();
          return Response.json({ error: 'Cotización no encontrada' }, { status: 404 });
        }
        const c = cRows[0];
        // Validaciones de estado/fecha
        if (c.ESTADO === 'procesada') {
          await conn.rollback();
          return Response.json({ error: 'La cotización ya fue procesada' }, { status: 400 });
        }
        // No permitir procesar si expirada
        if (c.FECHA_VENCIMIENTO) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const exp = new Date(c.FECHA_VENCIMIENTO); exp.setHours(0, 0, 0, 0);
          if (exp <= today) {
            await conn.rollback();
            return Response.json({ error: 'La cotización está expirada' }, { status: 400 });
          }
        }
        // Items desde detalles (incluir metadata de unidad si existe)
        const [dRows] = await conn.query(
          `SELECT d.ID_PRODUCT, d.AMOUNT AS cantidad, d.PRECIO_UNIT AS precio_unit, d.SUB_TOTAL AS subtotal,
                  COALESCE(d.CANTIDAD_POR_UNIDAD,1) AS cantidad_por_unidad, d.UNIDAD_ID AS unidad_id, d.UNIDAD_NOMBRE AS unidad_nombre
           FROM COTIZACION_DETALLES d WHERE d.ID_COTIZACION = ?`, [id]
        );
        if (!dRows?.length) {
          await conn.rollback();
          return Response.json({ error: 'La cotización no tiene items' }, { status: 400 });
        }
        // Insertar factura (con ID_SUCURSAL si existe)
        const fecha = new Date();
        const subOk = Number(c.SUBTOTAL || 0);
        const descOk = Number(c.DESCUENTO || 0);
        const totalOk = Number(c.TOTAL || 0);
        // detectar columnas opcionales
        let hasFacturaSucursal = false;
        let hasFacturaNumero = false;
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

        // Generar número público de factura (FAC-YYYYMMDD-HHMMSS) sin sufijo aleatorio
        const pad = (n) => String(n).padStart(2, '0');
        const y = fecha.getFullYear();
        const mo = pad(fecha.getMonth() + 1);
        const da = pad(fecha.getDate());
        const hh = pad(fecha.getHours());
        const mi = pad(fecha.getMinutes());
        const ss = pad(fecha.getSeconds());
        let numeroFactura = `FAC-${y}${mo}${da}-${hh}${mi}${ss}`;
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
          ? [numeroFactura, fecha, subOk, descOk, totalOk, c.ID_CLIENTES || null]
          : [fecha, subOk, descOk, totalOk, c.ID_CLIENTES || null];
        if (hasFacturaSucursal) {
          facturaSql = hasFacturaNumero
            ? 'INSERT INTO factura (NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES, ID_SUCURSAL) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)'
            : 'INSERT INTO factura (FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES, ID_SUCURSAL) VALUES (?, ?, ?, ?, NULL, ?, ?)';
          facturaParams = hasFacturaNumero
            ? [numeroFactura, fecha, subOk, descOk, totalOk, c.ID_CLIENTES || null, c.ID_SUCURSAL || null]
            : [fecha, subOk, descOk, totalOk, c.ID_CLIENTES || null, c.ID_SUCURSAL || null];
        }
        const [factRes] = await conn.query(facturaSql, facturaParams);
        const facturaId = factRes.insertId;

        // Detectar si factura_detalles soporta columnas de unidad y propagar si es posible
        const fdCols = await (async () => {
          try {
            const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles'`);
            const present = new Set((cols || []).map(r => String(r.COLUMN_NAME)));
            return {
              UNIDAD_ID: present.has('UNIDAD_ID'),
              CANTIDAD_POR_UNIDAD: present.has('CANTIDAD_POR_UNIDAD'),
              UNIDAD_NOMBRE: present.has('UNIDAD_NOMBRE')
            };
          } catch { return { UNIDAD_ID: false, CANTIDAD_POR_UNIDAD: false, UNIDAD_NOMBRE: false }; }
        })();

        for (const it of dRows) {
          const idProd = Number(it.ID_PRODUCT);
          const qty = Number(it.cantidad || 0);
          const precio = Number(it.precio_unit || 0);
          const sub = Number((precio * qty).toFixed(2));
          // declarar variables de unidad en el scope del bucle
          let unidadId = null;
          let cantidadPorUnidad = 1;
          let unidadNombre = null;
          if (fdCols.UNIDAD_ID || fdCols.CANTIDAD_POR_UNIDAD || fdCols.UNIDAD_NOMBRE) {
            unidadId = it.unidad_id || it.UNIDAD_ID || it.unit_id || it.unit || null;
            cantidadPorUnidad = Number((it.cantidad_por_unidad ?? it.cantidadPorUnidad ?? it.CANTIDAD_POR_UNIDAD ?? 1)) || 1;
            unidadNombre = it.unidad_nombre || it.UNIDAD_NOMBRE || it.unit_name || it.unit || null;
            await conn.query(
              `INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL${fdCols.UNIDAD_ID ? ', UNIDAD_ID' : ''}${fdCols.CANTIDAD_POR_UNIDAD ? ', CANTIDAD_POR_UNIDAD' : ''}${fdCols.UNIDAD_NOMBRE ? ', UNIDAD_NOMBRE' : ''}, ID_USUARIO)
               VALUES (?, ?, ?, ?, ?${fdCols.UNIDAD_ID ? ', ?' : ''}${fdCols.CANTIDAD_POR_UNIDAD ? ', ?' : ''}${fdCols.UNIDAD_NOMBRE ? ', ?' : ''}, ?)`,
              [facturaId, idProd, qty, precio, sub]
                .concat(fdCols.UNIDAD_ID ? [unidadId] : [])
                .concat(fdCols.CANTIDAD_POR_UNIDAD ? [cantidadPorUnidad] : [])
                .concat(fdCols.UNIDAD_NOMBRE ? [unidadNombre] : [])
                .concat([c.ID_USUARIO || null])
            );
          } else {
            await conn.query(
              'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)',
              [facturaId, idProd, qty, precio, sub, c.ID_USUARIO || null]
            );
          }
        }

        // Marcar cotización como procesada (no le afecta fecha de vencimiento)
        await conn.query('UPDATE cotizacion SET ESTADO = ? WHERE ID_COTIZACION = ?', ['procesada', id]);

        await conn.commit();
        return Response.json({ ok: true, facturaId, numero: hasFacturaNumero ? numeroFactura : null });
      } catch (e) {
        try { await conn.rollback(); } catch { }
        return Response.json({ error: e?.message || 'Error al procesar la cotización' }, { status: 400 });
      }
    }

    await conn.beginTransaction();

    // Validar cabecera existente
    const [cRows] = await conn.query('SELECT * FROM cotizacion WHERE ID_COTIZACION = ? FOR UPDATE', [id]);
    if (!cRows?.length) {
      await conn.rollback();
      return Response.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Validar fecha vencimiento si se envía
    let fechaV = cRows[0].FECHA_VENCIMIENTO;
    if (fecha_vencimiento) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const expStr = toYMDString(fecha_vencimiento);
      const exp = expStr ? new Date(expStr + 'T00:00:00') : null;
      if (!expStr || isNaN(exp?.getTime()) || exp < today) {
        await conn.rollback();
        return Response.json({ error: 'La fecha de vencimiento no puede ser anterior a hoy' }, { status: 400 });
      }
      // store as normalized 'YYYY-MM-DD'
      fechaV = expStr;
    }

    // Cliente
    const clienteNombre = (cliente?.nombre || body?.cliente_nombre || '').toString().trim();
    const clienteTelefono = (cliente?.telefono || body?.telefono_cliente || '').toString().trim();
    const clienteId = (clienteNombre || clienteTelefono)
      ? await getOrCreateCliente(conn, clienteNombre, clienteTelefono)
      : cRows[0].ID_CLIENTES;

    // Detalles (si envían items se reemplaza todo)
    let subtotalOk = cRows[0].SUBTOTAL;
    let descuentoOk = Number(descuento || cRows[0].DESCUENTO || 0);
    let totalOk = cRows[0].TOTAL;
    if (Array.isArray(items) && items.length > 0) {
      await conn.query('DELETE FROM COTIZACION_DETALLES WHERE ID_COTIZACION = ?', [id]);
      let computedSubtotal = 0;
      // detectar columnas de unidad para esta tabla
      let hasUnidadColsUpdate = false;
      try {
        const [colRows2] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'COTIZACION_DETALLES'`);
        const present2 = new Set((colRows2 || []).map(r => String(r.COLUMN_NAME)));
        hasUnidadColsUpdate = present2.has('UNIDAD_ID') || present2.has('CANTIDAD_POR_UNIDAD') || present2.has('UNIDAD_NOMBRE');
      } catch { hasUnidadColsUpdate = false; }
      for (const it of items) {
        const prodId = Number(it.ID_PRODUCT || it.producto_id || it.id);
        const qty = Number(it.quantity || it.cantidad || 0);
        const precio = Number(it.PRECIO || it.precio_unit || it.precio || it.unitPrice || 0);
        if (!prodId || qty <= 0) {
          await conn.rollback();
          return Response.json({ error: 'Item inválido' }, { status: 400 });
        }
        const sub = Number((precio * qty).toFixed(2));
        computedSubtotal += sub;
        // declarar variables de unidad para evitar problemas de alcance
        let unidadId = null;
        let cantidadPorUnidad = 1;
        let unidadNombre = null;
        if (hasUnidadColsUpdate) {
          unidadId = it.UNIDAD_ID || it.unidad_id || it.unit_id || it.unit || null;
          cantidadPorUnidad = Number((it.cantidad_por_unidad ?? it.cantidadPorUnidad ?? it.CANTIDAD_POR_UNIDAD ?? 1)) || 1;
          unidadNombre = it.UNIDAD_NOMBRE || it.unidad_nombre || it.unit_name || it.unit || null;
          await conn.query(
            `INSERT INTO COTIZACION_DETALLES (ID_COTIZACION, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, UNIDAD_ID, CANTIDAD_POR_UNIDAD, UNIDAD_NOMBRE)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, prodId, qty, precio, sub, unidadId, cantidadPorUnidad, unidadNombre]
          );
        } else {
          await conn.query(
            `INSERT INTO COTIZACION_DETALLES (ID_COTIZACION, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL)
             VALUES (?, ?, ?, ?, ?)`,
            [id, prodId, qty, precio, sub]
          );
        }
      }
      subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : computedSubtotal;
      totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk);
    } else {
      if (subtotal !== undefined) subtotalOk = Number(subtotal);
      if (total !== undefined) totalOk = Number(total);
    }

    // Actualizar cabecera
    await conn.query(
      `UPDATE cotizacion SET FECHA_VENCIMIENTO = ?, SUBTOTAL = ?, DESCUENTO = ?, TOTAL = ?, ID_CLIENTES = ?, NOTAS = ?, ESTADO = COALESCE(?, ESTADO)
       WHERE ID_COTIZACION = ?`,
      [fechaV, subtotalOk, descuentoOk, totalOk, clienteId || null, notas || null, estado || null, id]
    );

    await conn.commit();
    return Response.json({ ok: true, id, total: totalOk });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    return Response.json({ error: e?.message || 'Error al actualizar cotización' }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}

export async function DELETE(req) {
  const conn = await pool.getConnection();
  try {
    const url = new URL(req.url);
    const { searchParams, pathname } = url;
    let id = searchParams.get('id');
    const parts = pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!id && last && last !== 'api' && last !== 'cotizaciones') id = last;
    if (!id) return Response.json({ error: 'ID de cotización requerido' }, { status: 400 });

    // Soft delete: marcar cancelada
    const [res] = await conn.query('UPDATE cotizacion SET ESTADO = ? WHERE ID_COTIZACION = ?', ['cancelada', id]);
    if (res.affectedRows === 0) return Response.json({ error: 'Cotización no encontrada' }, { status: 404 });
    return Response.json({ ok: true, id, estado: 'cancelada' });
  } catch (e) {
    return Response.json({ error: e?.message || 'Error al eliminar cotización' }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}
