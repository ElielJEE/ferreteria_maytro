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
