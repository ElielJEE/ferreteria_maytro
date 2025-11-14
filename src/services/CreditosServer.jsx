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

export async function createCredit(req) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const { items, subtotal, descuento = 0, total, cliente = {} } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No hay items para el crédito');
    }

    // Validar cliente
    const clienteNombre = (cliente?.nombre || cliente?.cliente_nombre || body?.cliente_nombre || '').toString().trim();
    const clienteTelefono = (cliente?.telefono || cliente?.telefono_cliente || body?.telefono_cliente || '').toString().trim();
    if (!clienteNombre || !clienteTelefono) {
      throw new Error('Cliente y teléfono son obligatorios para crear un crédito');
    }

    let { usuarioId, sucursalId } = parseAuth(req);
    if (body.usuario_id) usuarioId = body.usuario_id;
    if (body.sucursal_id) sucursalId = body.sucursal_id;

    try {
      if (!sucursalId && usuarioId) {
        const [uRows] = await conn.query('SELECT ID_SUCURSAL FROM USUARIOS WHERE ID = ? LIMIT 1', [usuarioId]);
        if (uRows && uRows[0] && uRows[0].ID_SUCURSAL) sucursalId = uRows[0].ID_SUCURSAL;
      }
      if (!sucursalId && body.sucursal) {
        const [suc] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [body.sucursal]);
        if (suc && suc[0] && suc[0].ID_SUCURSAL) sucursalId = suc[0].ID_SUCURSAL;
      }
    } catch {}

    await conn.beginTransaction();

    // Calcular subtotal en servidor
    let computedSubtotal = 0;
    for (const it of items) {
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      if (qty <= 0) throw new Error('Item inválido');
      computedSubtotal += precio * qty;
    }
    const subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : Number(computedSubtotal);
    const descuentoOk = Number(descuento || 0);
    const totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk);

    const clienteId = await getOrCreateCliente(conn, clienteNombre, clienteTelefono);
    const fecha = new Date();

    const pad = n => String(n).padStart(2,'0');
    const y = fecha.getFullYear();
    const mo = pad(fecha.getMonth()+1);
    const da = pad(fecha.getDate());
    const hh = pad(fecha.getHours());
    const mi = pad(fecha.getMinutes());
    const ss = pad(fecha.getSeconds());
    let numeroFactura = `FAC-${y}${mo}${da}-${hh}${mi}${ss}`;
    let intentos = 0;
    while (intentos < 3) {
      const [dup] = await conn.query('SELECT 1 FROM FACTURA WHERE NUMERO_FACTURA = ? LIMIT 1', [numeroFactura]);
      if (!dup?.length) break;
      intentos++;
      numeroFactura = `FAC-${y}${mo}${da}-${hh}${mi}${ss}-${intentos}`;
    }

    const facturaSql = 'INSERT INTO FACTURA (NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, D_APERTURA, ID_CLIENTES, ID_SUCURSAL) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)';
    const facturaParams = [numeroFactura, fecha, subtotalOk, descuentoOk, totalOk, clienteId || null, sucursalId || null];
    const [factRes] = await conn.query(facturaSql, facturaParams);
    const facturaId = factRes.insertId;

    // Detectar columnas de unidad en FACTURA_DETALLES para compatibilidad
    let hasUnidadCols = { UNIDAD_ID: false, CANTIDAD_POR_UNIDAD: false, UNIDAD_NOMBRE: false };
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FACTURA_DETALLES'`);
      const colset = new Set((cols || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
      hasUnidadCols.UNIDAD_ID = colset.has('UNIDAD_ID');
      hasUnidadCols.CANTIDAD_POR_UNIDAD = colset.has('CANTIDAD_POR_UNIDAD');
      hasUnidadCols.UNIDAD_NOMBRE = colset.has('UNIDAD_NOMBRE');
    } catch (e) { /* ignore; asumimos esquema mínimo */ }

    for (const it of items) {
      const idProd = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      const unidadId = it.unit_id ?? it.UNIDAD_ID ?? null;
      const unidadNombre = it.unit_name ?? it.UNIDAD_NOMBRE ?? null;
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? 1) || 1;
      const sub = Number((precio * qty).toFixed(2));

      if (hasUnidadCols.UNIDAD_ID || hasUnidadCols.CANTIDAD_POR_UNIDAD || hasUnidadCols.UNIDAD_NOMBRE) {
        await conn.query(
          'INSERT INTO FACTURA_DETALLES (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO'
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
        await conn.query('INSERT INTO FACTURA_DETALLES (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)', [facturaId, idProd, qty, precio, sub, usuarioId || null]);
      }

      try {
        const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProd, sucursalId]);
        const totalARestar = qty * cantidadPorUnidad;
        const stockAnterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
        const stockNuevo = stockAnterior - totalARestar;
        await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProd, sucursalId]);
        try {
          await conn.query(`INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
            VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`, [idProd, sucursalId, usuarioId || null, totalARestar, 'Credito', facturaId, stockAnterior, stockNuevo]);
        } catch {};
      } catch (e) { }
    }

    // Build an ID for the credit that fits the DB column length (some schemas use varchar(10)).
    let idCredito;
    try {
      const [colInfo] = await conn.query(`SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS' AND COLUMN_NAME = 'ID_USUARIOSCRED' LIMIT 1`);
      const maxLen = colInfo && colInfo[0] && colInfo[0].CHARACTER_MAXIMUM_LENGTH ? Number(colInfo[0].CHARACTER_MAXIMUM_LENGTH) : null;
      const rand = Math.floor(Math.random() * 9000) + 1000;
      const fullId = `CRE-${y}${mo}${da}-${hh}${mi}${ss}-${rand}`;
      if (!maxLen || fullId.length <= maxLen) {
        idCredito = fullId;
      } else {
        const yy = String(y).slice(-2);
        const compactBase = `C${yy}${mo}${da}${hh}${mi}`;
        const available = Math.max(0, maxLen - compactBase.length);
        let rnd = '';
        if (available > 0) {
          const maxNum = Math.pow(10, available) - 1;
          rnd = String(Math.floor(Math.random() * Math.min(maxNum, 999999))).padStart(available, '0');
        }
        idCredito = (compactBase + rnd).slice(0, maxLen);
      }
    } catch (e) {
      const rand = Math.floor(Math.random() * 9000) + 1000;
      idCredito = `CRE-${y}${mo}${da}-${hh}${mi}${ss}-${rand}`;
    }
    try {
      const [ucCols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS'`);
      const colset = new Set((ucCols || []).map(r => String(r.COLUMN_NAME).toUpperCase()));

      const cols = [];
      const params = [];

      if (colset.has('ID_USUARIOSCRED')) { cols.push('ID_USUARIOSCRED'); params.push(idCredito); }
      if (colset.has('MONTO_PAGO')) { cols.push('MONTO_PAGO'); params.push('0'); }
      if (colset.has('MONTO_DEUDA')) { cols.push('MONTO_DEUDA'); params.push(totalOk); }
      if (colset.has('ID_FACTURA')) { cols.push('ID_FACTURA'); params.push(facturaId); }
      if (colset.has('DEUDA_INICIAL')) { cols.push('DEUDA_INICIAL'); params.push(totalOk); }
      if (colset.has('DEUDA_ACTUAL')) { cols.push('DEUDA_ACTUAL'); params.push(totalOk); }
      if (colset.has('ID_USUARIO')) { cols.push('ID_USUARIO'); params.push(usuarioId || null); }
      if (colset.has('ESTADO')) { cols.push('ESTADO'); params.push('activa'); }
      if (colset.has('NUMERO_FACTURA')) { cols.push('NUMERO_FACTURA'); params.push(numeroFactura); }
      if (colset.has('ID_SUCURSAL')) { cols.push('ID_SUCURSAL'); params.push(sucursalId || null); }
      if (colset.has('ID_CLIENTE')) { cols.push('ID_CLIENTE'); params.push(clienteId || null); }

      if (cols.length === 0) {
        console.error('USUARIOS_CREDITOS table has no known columns to insert into. Skipping insert.');
      } else {
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT INTO USUARIOS_CREDITOS (${cols.join(', ')}) VALUES (${placeholders})`;
        await conn.query(sql, params);
      }
    } catch (e) {
      console.error('Error insertando en USUARIOS_CREDITOS (fallback):', e?.message || e);
    }

    await conn.commit();
    return { ok: true, id: idCredito, facturaId, numeroFactura, total: totalOk };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

export async function getCredits() {
  try {
    const [rows] = await pool.query(`
      SELECT
        uc.ID_USUARIOSCRED AS id,
        COALESCE(uc.DEUDA_INICIAL, uc.MONTO_DEUDA) AS deuda_inicial,
        COALESCE(uc.DEUDA_ACTUAL, uc.MONTO_DEUDA) AS deuda_actual,
        uc.MONTO_PAGO AS monto_pago,
        uc.ID_FACTURA AS factura_id,
        COALESCE(uc.NUMERO_FACTURA, f.NUMERO_FACTURA) AS numero,
        f.FECHA AS fecha,
        COALESCE(s.NOMBRE_SUCURSAL, '') AS sucursal,
        COALESCE(c.NOMBRE_CLIENTE, '') AS cliente,
        COALESCE(c.TELEFONO_CLIENTE, '') AS telefono,
        COALESCE(u.NOMBRE, '') AS hecho_por,
        COALESCE(uc.ESTADO, 'Activa') AS estado
      FROM USUARIOS_CREDITOS uc
      LEFT JOIN FACTURA f ON f.ID_FACTURA = uc.ID_FACTURA
      LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
      LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = COALESCE(uc.ID_SUCURSAL, f.ID_SUCURSAL)
      LEFT JOIN USUARIOS u ON u.ID = uc.ID_USUARIO
      ORDER BY f.FECHA DESC
      LIMIT 1000
    `);
    const creditos = rows || [];

    const facturaIds = creditos.map(r => r.factura_id).filter(Boolean);
    if (facturaIds.length) {
      const placeholders = facturaIds.map(() => '?').join(',');
      const detalleSql = `
        SELECT fd.ID_FACTURA AS factura_id, fd.ID_DETALLES_FACTURA, fd.ID_PRODUCT, fd.AMOUNT AS cantidad, fd.PRECIO_UNIT AS precio_unit, fd.SUB_TOTAL AS subtotal,
               fd.UNIDAD_ID AS unidad_id, fd.CANTIDAD_POR_UNIDAD AS cantidad_por_unidad, fd.UNIDAD_NOMBRE AS unidad_nombre,
               p.PRODUCT_NAME AS producto_nombre, p.CODIGO_PRODUCTO AS producto_codigo
        FROM FACTURA_DETALLES fd
        LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = fd.ID_PRODUCT
        WHERE fd.ID_FACTURA IN (${placeholders})
      `;
      const [detallesRows] = await pool.query(detalleSql, facturaIds);

      const detallesByFactura = (detallesRows || []).reduce((acc, d) => {
        const fid = d.factura_id;
        if (!acc[fid]) acc[fid] = [];
        acc[fid].push(d);
        return acc;
      }, {});

      for (const c of creditos) {
        const dlist = detallesByFactura[c.factura_id] || [];
        c.items = dlist.map(d => ({
          detalle_id: d.ID_DETALLES_FACTURA,
          producto_id: d.ID_PRODUCT,
          cantidad: Number(d.cantidad || 0),
          qty: Number(d.cantidad || 0),
          productCode: d.producto_codigo || null,
          productName: d.producto_nombre || null,
          unidad: d.unidad_nombre || (d.cantidad_por_unidad ? `x${d.cantidad_por_unidad}` : null),
          unitPrice: Number(d.precio_unit || 0),
          subtotal: Number(d.subtotal || 0)
        }));
      }
    }
    return creditos;
  } catch (e) {
    throw e;
  }
}

export async function updateCredit(payload) {
  const { id, clienteNombre, clienteTelefono } = payload || {};
  if (!id) throw new Error('Missing credit id');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ucRows] = await conn.query('SELECT ID_FACTURA, ID_CLIENTE FROM USUARIOS_CREDITOS WHERE ID_USUARIOSCRED = ? LIMIT 1', [id]);
    if (!ucRows || !ucRows[0]) {
      await conn.rollback();
      throw new Error('Credito no encontrado');
    }
    const uc = ucRows[0];
    let clienteId = uc.ID_CLIENTE || null;
    if (!clienteId && uc.ID_FACTURA) {
      const [fRows] = await conn.query('SELECT ID_CLIENTES FROM FACTURA WHERE ID_FACTURA = ? LIMIT 1', [uc.ID_FACTURA]);
      if (fRows && fRows[0] && fRows[0].ID_CLIENTES) clienteId = fRows[0].ID_CLIENTES;
    }
    if (clienteNombre) {
      if (clienteId) {
        await conn.query('UPDATE CLIENTES SET NOMBRE_CLIENTE = ?, TELEFONO_CLIENTE = ? WHERE ID_CLIENTES = ?', [clienteNombre, clienteTelefono || null, clienteId]);
      } else {
        const [ins] = await conn.query('INSERT INTO CLIENTES (NOMBRE_CLIENTE, DIRECCION_CLIENTE, TELEFONO_CLIENTE) VALUES (?, "", ?)', [clienteNombre, clienteTelefono || null]);
        clienteId = ins.insertId;
        if (uc.ID_FACTURA) {
          try { await conn.query('UPDATE FACTURA SET ID_CLIENTES = ? WHERE ID_FACTURA = ?', [clienteId, uc.ID_FACTURA]); } catch {}
        }
        try { await conn.query('UPDATE USUARIOS_CREDITOS SET ID_CLIENTE = ? WHERE ID_USUARIOSCRED = ?', [clienteId, id]); } catch {}
      }
    }
    await conn.commit();
    return { ok: true, id, clienteId };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

export async function payCredit(payload) {
  const { id, cordobas = 0, dolares = 0, tasaCambio = 0, metodo = 'efectivo' } = payload || {};
  if (!id) throw new Error('Missing credit id');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ucRows] = await conn.query('SELECT ID_FACTURA, DEUDA_ACTUAL, MONTO_PAGO FROM USUARIOS_CREDITOS WHERE ID_USUARIOSCRED = ? LIMIT 1', [id]);
    if (!ucRows || !ucRows[0]) {
      await conn.rollback();
      throw new Error('Credito no encontrado');
    }
    const uc = ucRows[0];
    const facturaId = uc.ID_FACTURA || null;

    let tasa = Number(tasaCambio || 0);
    if (!tasa || tasa <= 0) {
      try {
        const [cfg] = await conn.query('SELECT TASA FROM CONFIG_TASA_CAMBIO WHERE ID = 1 LIMIT 1');
        if (cfg && cfg[0] && cfg[0].TASA) tasa = Number(cfg[0].TASA);
      } catch {}
    }
    if (!tasa || tasa <= 0) tasa = 36.55;

    const recibidoCord = Number(cordobas || 0);
    const recibidoDol = Number(dolares || 0);
    const recibidoTotalC = Number((recibidoCord + recibidoDol * tasa).toFixed(2));

    if (facturaId) {
      try {
        await conn.query('INSERT INTO FACTURA_PAGOS (ID_FACTURA, MONTO_CORDOBAS, MONTO_DOLARES, TASA_CAMBIO, METODO) VALUES (?, ?, ?, ?, ?)', [facturaId, recibidoCord, recibidoDol, tasa, metodo]);
      } catch (e) { /* ignore if table missing */ }
    }

    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'USUARIOS_CREDITOS'`);
      const colset = new Set((cols || []).map(r => String(r.COLUMN_NAME).toUpperCase()));

      const deudaActual = Number(uc.DEUDA_ACTUAL ?? uc.MONTO_DEUDA ?? 0);
      let montoPagoPrev = 0;
      if (uc.MONTO_PAGO) {
        montoPagoPrev = Number((uc.MONTO_PAGO + '').replace(/[^0-9.-]/g, '')) || 0;
      }
      const nuevaDeuda = Math.max(0, Number((deudaActual - recibidoTotalC).toFixed(2)));
      const nuevoMontoPago = Number((montoPagoPrev + recibidoTotalC).toFixed(2));

      const updates = [];
      const params = [];
      if (colset.has('MONTO_PAGO')) { updates.push('MONTO_PAGO = ?'); params.push(String(nuevoMontoPago)); }
      if (colset.has('DEUDA_ACTUAL')) { updates.push('DEUDA_ACTUAL = ?'); params.push(nuevaDeuda); }
      if (colset.has('ESTADO')) {
        const estado = nuevaDeuda <= 0 ? 'pagada' : 'activa';
        updates.push('ESTADO = ?'); params.push(estado);
      }
      if (updates.length) {
        params.push(id);
        await conn.query(`UPDATE USUARIOS_CREDITOS SET ${updates.join(', ')} WHERE ID_USUARIOSCRED = ?`, params);
      }
    } catch (e) {
      console.error('Error actualizando USUARIOS_CREDITOS:', e?.message || e);
    }

    await conn.commit();
    return { ok: true, id, recibidoTotalC };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { conn.release(); } catch {}
  }
}

export default { createCredit, getCredits, updateCredit, payCredit };
