import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// Helper: find or create client by name/phone; returns client ID or null
async function getOrCreateCliente(conn, nombre, telefono) {
  const name = (nombre || '').toString().trim();
  const tel = (telefono || '').toString().trim();
  if (!name && !tel) return null;
  const clauses = []; const values = [];
  if (name) { clauses.push('NOMBRE_CLIENTE = ?'); values.push(name); }
  if (tel) { clauses.push('TELEFONO_CLIENTE = ?'); values.push(tel); }
  const [rows] = await conn.query(`SELECT ID_CLIENTES FROM CLIENTES WHERE ${clauses.join(' OR ')} LIMIT 1`, values);
  if (rows?.length) return rows[0].ID_CLIENTES;
  if (!name) return null;
  const [ins] = await conn.query(
    `INSERT INTO CLIENTES (NOMBRE_CLIENTE, DIRECCION_CLIENTE, TELEFONO_CLIENTE) VALUES (?, '', ?)`,
    [name, tel || null]
  );
  return ins.insertId || null;
}

export async function POST(req) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const { items, subtotal, descuento = 0, total, pago = {}, cliente = {} } = body || {};
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

    await conn.beginTransaction();

    // Validate and compute
    let computedSubtotal = 0;
    for (const it of items) {
      const idProd = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      if (!idProd || qty <= 0) throw new Error('Item inválido');
      computedSubtotal += precio * qty;
      // Ensure stock exists in STOCK_SUCURSAL and lock it
      if (!sucursalId && body.sucursal) {
        const [suc] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [body.sucursal]);
        if (suc?.length) sucursalId = suc[0].ID_SUCURSAL;
      }
      if (!sucursalId) throw new Error('Sucursal no definida');
      const [stockRows] = await conn.query(
        'SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE',
        [idProd, sucursalId]
      );
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      if (qty > cantidadEnSucursal) throw new Error('Stock insuficiente para el producto ' + idProd);
    }

  const subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : computedSubtotal;
  const descuentoOk = Number(descuento || 0);
  const totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk);

    // Create invoice (FACTURA and FACTURA_DETALLES)
    const clienteId = await getOrCreateCliente(conn, cliente?.nombre, cliente?.telefono);
    const fecha = new Date();
    // Detectar si FACTURA tiene columna ID_SUCURSAL (compatibilidad con esquemas previos)
    let hasFacturaSucursal = false;
    try {
      const [colRows] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FACTURA' AND COLUMN_NAME = 'ID_SUCURSAL'
      `);
      hasFacturaSucursal = (colRows?.[0] && Number(colRows[0].CNT || 0) > 0) || false;
    } catch { hasFacturaSucursal = false; }

    let facturaSql = 'INSERT INTO FACTURA (FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES) VALUES (?, ?, ?, ?, NULL, ?)';
    let facturaParams = [fecha, subtotalOk, descuentoOk, totalOk, clienteId || null];
    if (hasFacturaSucursal) {
      facturaSql = 'INSERT INTO FACTURA (FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES, ID_SUCURSAL) VALUES (?, ?, ?, ?, NULL, ?, ?)';
      facturaParams = [fecha, subtotalOk, descuentoOk, totalOk, clienteId || null, sucursalId || null];
    }
    const [factRes] = await conn.query(facturaSql, facturaParams);
    const facturaId = factRes.insertId;

    // Insert details and update stocks per item
    for (const it of items) {
      const idProd = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      const sub = Number((precio * qty).toFixed(2));

      await conn.query(
        'INSERT INTO FACTURA_DETALLES (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)',
        [facturaId, idProd, qty, precio, sub, usuarioId || null]
      );

      // Update stock in sucursal
      const [stockRows] = await conn.query(
        'SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE',
        [idProd, sucursalId]
      );
      const stockAnterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      const stockNuevo = stockAnterior - qty;
      await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProd, sucursalId]);

      // Log movement as 'salida'
      try {
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
          [idProd, sucursalId, usuarioId || null, qty, 'Venta', facturaId, stockAnterior, stockNuevo]
        );
      } catch {}
    }

    // Registrar pago (si existe tabla FACTURA_PAGOS)
    const tasaCambio = Number(pago?.tasaCambio || 36.55);
    const recibidoCordobas = Number(pago?.cordobas || 0);
    const recibidoDolares = Number(pago?.dolares || 0);
    const recibidoTotalC = recibidoCordobas + recibidoDolares * tasaCambio;
    const cambio = Math.max(0, Number((recibidoTotalC - totalOk).toFixed(2)));
    try {
      await conn.query(
        'INSERT INTO FACTURA_PAGOS (ID_FACTURA, MONTO_CORDOBAS, MONTO_DOLARES, TASA_CAMBIO, METODO) VALUES (?, ?, ?, ?, ?)',
        [facturaId, recibidoCordobas, recibidoDolares, tasaCambio, pago?.metodo || 'efectivo']
      );
    } catch { /* Tabla no existe aún; ignorar para compatibilidad */ }

    await conn.commit();

    return Response.json({ ok: true, facturaId, total: totalOk, cambio });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    return Response.json({ error: e.message || 'Error al procesar la venta' }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // If id provided, return detailed sale
    if (id) {
      try {
        const [factRows] = await pool.query('SELECT ID_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, ID_CLIENTES, IFNULL(ID_SUCURSAL, NULL) AS ID_SUCURSAL FROM FACTURA WHERE ID_FACTURA = ?', [id]);
        if (!factRows || !factRows.length) return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
        const f = factRows[0];

        // client
        const [clientRows] = await pool.query('SELECT ID_CLIENTES, NOMBRE_CLIENTE, TELEFONO_CLIENTE FROM CLIENTES WHERE ID_CLIENTES = ?', [f.ID_CLIENTES || null]);
        const cliente = clientRows && clientRows[0] ? { id: clientRows[0].ID_CLIENTES, nombre: clientRows[0].NOMBRE_CLIENTE, telefono: clientRows[0].TELEFONO_CLIENTE } : null;

        // sucursal
        let sucursal = null;
        if (f.ID_SUCURSAL) {
          const [sucRows] = await pool.query('SELECT ID_SUCURSAL, NOMBRE_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ?', [f.ID_SUCURSAL]);
          if (sucRows && sucRows[0]) sucursal = { id: sucRows[0].ID_SUCURSAL, nombre: sucRows[0].NOMBRE_SUCURSAL };
        }

        // usuario who made the sale (take first user from detalles or from movimientos)
        const [userRows] = await pool.query(`
          SELECT COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS usuario, u.ID
          FROM FACTURA_DETALLES fd
          LEFT JOIN USUARIOS u ON u.ID = fd.ID_USUARIO
          WHERE fd.ID_FACTURA = ? LIMIT 1
        `, [id]);
        const usuario = userRows && userRows[0] ? { id: userRows[0].ID, nombre: userRows[0].usuario } : null;

        // items
        const [itemsRows] = await pool.query(`
          SELECT fd.ID_PRODUCT, fd.AMOUNT AS cantidad, fd.PRECIO_UNIT AS precio_unit, fd.SUB_TOTAL AS subtotal,
                 p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
          FROM FACTURA_DETALLES fd
          LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = fd.ID_PRODUCT
          WHERE fd.ID_FACTURA = ?
        `, [id]);

        return Response.json({ factura: {
          id: f.ID_FACTURA,
          fecha: f.FECHA,
          subtotal: Number(f.SUBTOTAL || 0),
          descuento: Number(f.DESCUENTO || 0),
          total: Number(f.TOTAL || 0),
          cliente,
          sucursal,
          usuario,
          items: (itemsRows || []).map(it => ({
            producto_id: it.ID_PRODUCT,
            producto_nombre: it.producto_nombre,
            producto_codigo: it.producto_codigo,
            cantidad: Number(it.cantidad || 0),
            precio_unit: Number(it.precio_unit || 0),
            subtotal: Number(it.subtotal || 0)
          }))
        }});
      } catch (e) {
        return Response.json({ error: e.message || 'Error al obtener detalle' }, { status: 500 });
      }
    }

    // Otherwise return list of ventas (general view)
    try {
      const [rows] = await pool.query(`
        SELECT f.ID_FACTURA AS id,
               DATE_FORMAT(f.FECHA, '%Y-%m-%d') AS fecha,
               DATE_FORMAT(f.FECHA, '%H:%i') AS hora,
               f.TOTAL AS total,
               c.NOMBRE_CLIENTE AS cliente,
               s.NOMBRE_SUCURSAL AS sucursal,
               (SELECT COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') FROM FACTURA_DETALLES fd LEFT JOIN USUARIOS u ON u.ID = fd.ID_USUARIO WHERE fd.ID_FACTURA = f.ID_FACTURA LIMIT 1) AS hecho_por
        FROM FACTURA f
        LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
        LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = f.ID_SUCURSAL
        ORDER BY f.FECHA DESC
        LIMIT 1000
      `);
      const mapped = (rows || []).map(r => ({ id: r.id, fecha: r.fecha, hora: r.hora, sucursal: r.sucursal || 'Sin sucursal', cliente: r.cliente || '', total: Number(r.total || 0), hecho_por: r.hecho_por || '' }));
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
    const [factRows] = await conn.query('SELECT * FROM FACTURA WHERE ID_FACTURA = ? FOR UPDATE', [id]);
    if (!factRows || !factRows.length) {
      await conn.rollback();
      return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    const factura = factRows[0];
    const sucursalId = factura.ID_SUCURSAL || null;

    // Revert previous detalles: add back quantities to stock
    const [prevDetalles] = await conn.query('SELECT ID_PRODUCT, AMOUNT, ID_USUARIO FROM FACTURA_DETALLES WHERE ID_FACTURA = ?', [id]);
    const defaultUsuarioId = prevDetalles && prevDetalles[0] ? (prevDetalles[0].ID_USUARIO || null) : null;
    for (const pd of (prevDetalles || [])) {
      const prodId = Number(pd.ID_PRODUCT);
      const prevQty = Number(pd.AMOUNT || 0);
      if (!prodId) continue;
      // Increase stock
      await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = CANTIDAD + ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [prevQty, prodId, sucursalId]);
      // Log movimento as entrada (restock due to edit) and preserve usuario if available
      try {
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'entrada', ?, ?, ?, NULL, NULL)`,
          [prodId, sucursalId, defaultUsuarioId, prevQty, 'Reversión por edición de venta', id]
        );
      } catch {}
    }

    // Remove old detalles
    await conn.query('DELETE FROM FACTURA_DETALLES WHERE ID_FACTURA = ?', [id]);

    // Prepare new detalles: validate stock availability (after revert)
    let computedSubtotal = 0;
    for (const it of items) {
      const prodId = Number(it.ID_PRODUCT || it.producto_id || it.producto_id || it.producto_id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      if (!prodId || qty <= 0) {
        await conn.rollback();
        return Response.json({ error: 'Item inválido en nuevos items' }, { status: 400 });
      }
      // check stock
      const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [prodId, sucursalId]);
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      if (qty > cantidadEnSucursal) {
        await conn.rollback();
        return Response.json({ error: `Stock insuficiente para producto ${prodId}` }, { status: 400 });
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


      await conn.query(
        'INSERT INTO FACTURA_DETALLES (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)',
        [id, prodId, qty, precio, sub, defaultUsuarioId]
      );

      const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [prodId, sucursalId]);
      const stockAnterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      const stockNuevo = stockAnterior - qty;
      await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, prodId, sucursalId]);
      try {
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
          [prodId, sucursalId, defaultUsuarioId, qty, 'Edición venta', id, stockAnterior, stockNuevo]
        );
      } catch {}
    }

    // Update factura (subtotal, descuento, total, cliente)
    const clienteId = await getOrCreateCliente(conn, cliente?.nombre || cliente?.cliente_nombre, cliente?.telefono || cliente?.telefono_cliente);
    await conn.query('UPDATE FACTURA SET SUBTOTAL = ?, DESCUENTO = ?, TOTAL = ?, ID_CLIENTES = ? WHERE ID_FACTURA = ?', [subtotalOk, descuentoOk, totalOk, clienteId || null, id]);

    await conn.commit();
    return Response.json({ ok: true, facturaId: id, total: totalOk });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    const message = e && e.message ? e.message : 'Error al editar la venta';
    return Response.json({ error: message }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
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
    if (!id && last && last !== 'api' && last !== 'ventas') id = last;

    if (!id) return Response.json({ error: 'ID de factura requerido' }, { status: 400 });

    await conn.beginTransaction();

    const [factRows] = await conn.query('SELECT * FROM FACTURA WHERE ID_FACTURA = ? FOR UPDATE', [id]);
    if (!factRows || !factRows.length) {
      await conn.rollback();
      return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    const factura = factRows[0];
    const sucursalId = factura.ID_SUCURSAL || null;

    // Restore stock from detalles
    const [detalles] = await conn.query('SELECT ID_PRODUCT, AMOUNT FROM FACTURA_DETALLES WHERE ID_FACTURA = ?', [id]);
    for (const d of (detalles || [])) {
      const prodId = Number(d.ID_PRODUCT);
      const qty = Number(d.AMOUNT || 0);
      await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = CANTIDAD + ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [qty, prodId, sucursalId]);
      try {
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, NULL, 'entrada', ?, ?, ?, NULL, NULL)`,
          [prodId, sucursalId, qty, 'Reversión por eliminación de venta', id]
        );
      } catch {}
    }

    // Delete detalles, pagos, factura
    try { await conn.query('DELETE FROM FACTURA_PAGOS WHERE ID_FACTURA = ?', [id]); } catch {}
    await conn.query('DELETE FROM FACTURA_DETALLES WHERE ID_FACTURA = ?', [id]);
    await conn.query('DELETE FROM FACTURA WHERE ID_FACTURA = ?', [id]);

    await conn.commit();
    return Response.json({ ok: true, deleted: id });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    const message = e && e.message ? e.message : 'Error al eliminar la venta';
    return Response.json({ error: message }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
  }
}
