import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import enableCaseMapping from '@/lib/tableCaseMapper';

const wrapConnection = enableCaseMapping(pool, [
  'factura',
  'factura_detalles',
  'factura_pagos',
  'factura_descuento',
  'config_tasa_cambio',
  'stock_sucursal',
  'movimientos_inventario',
  'productos',
  'producto_unidades',
  'clientes',
  'usuarios',
  'sucursal',
  'descuentos'
]);

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

async function decrementStockForFactura(conn, facturaId, sucursalId, usuarioId = null, motivo = 'Venta confirmada') {
  if (!facturaId) throw new Error('Factura no definida para descontar stock');
  if (!sucursalId) throw new Error('Sucursal no definida para descontar stock');

  const [detalles] = await conn.query(`
    SELECT ID_PRODUCT, AMOUNT, IFNULL(CANTIDAD_POR_UNIDAD, 1) AS CANTIDAD_POR_UNIDAD
    FROM factura_detalles
    WHERE ID_FACTURA = ?
  `, [facturaId]);

  if (!Array.isArray(detalles) || detalles.length === 0) return;

  for (const detalle of detalles) {
    const prodId = Number(detalle.ID_PRODUCT);
    const qty = Number(detalle.AMOUNT || 0);
    const cantidadPorUnidad = Number(detalle.CANTIDAD_POR_UNIDAD || 1) || 1;
    const totalARestar = qty * cantidadPorUnidad;
    if (!prodId || totalARestar <= 0) continue;

    const [stockRows] = await conn.query(
      'SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE',
      [prodId, sucursalId]
    );
    const stockAnterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
    if (totalARestar > stockAnterior) {
      throw new Error(`Stock insuficiente para el producto ${prodId} en sucursal ${sucursalId}`);
    }
    const stockNuevo = stockAnterior - totalARestar;
    await conn.query('UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, prodId, sucursalId]);
    try {
      await conn.query(
        `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
         VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
        [prodId, sucursalId, usuarioId || null, totalARestar, motivo, facturaId, stockAnterior, stockNuevo]
      );
    } catch { }
  }
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
        usuarioId = decoded?.id || decoded?.ID || decoded?.sub || decoded?.userId || decoded?.user_id || null;
        sucursalId = decoded?.ID_SUCURSAL || decoded?.sucursal_id || null;
      }
    } catch { /* ignore */ }

    // allow override from payload with normalized values
    const payloadSucursalId = body?.sucursal_id ?? body?.sucursalId ?? null;
    if (payloadSucursalId !== null && payloadSucursalId !== undefined) {
      const payloadSucursalIdString = String(payloadSucursalId).trim();
      if (payloadSucursalIdString !== '') {
        sucursalId = payloadSucursalIdString;
      }
    }

    const payloadSucursalName = body?.sucursal ?? body?.sucursal_name ?? body?.sucursalNombre ?? body?.sucursal_nombre ?? null;

    // Fallback: derive sucursal from the usuario if not present in token/payload
    try {
      if (!sucursalId && usuarioId) {
        const [uRows] = await conn.query('SELECT ID_SUCURSAL FROM usuarios WHERE ID = ? LIMIT 1', [usuarioId]);
        if (uRows && uRows[0] && uRows[0].ID_SUCURSAL) sucursalId = uRows[0].ID_SUCURSAL;
      }
      // As an additional fallback, try by sucursal name in payload
      if (!sucursalId && payloadSucursalName) {
        const [suc] = await conn.query('SELECT ID_SUCURSAL FROM sucursal WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [payloadSucursalName]);
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
    }

    if (!sucursalId && body.sucursal) {
      const [suc] = await conn.query('SELECT ID_SUCURSAL FROM sucursal WHERE NOMBRE_SUCURSAL = ? LIMIT 1', [body.sucursal]);
      if (suc?.length) sucursalId = suc[0].ID_SUCURSAL;
    }
    if (!sucursalId) throw new Error('Sucursal no definida');

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
    let hasFacturaEstado = false;
    try {
      const [colRows] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND UPPER(COLUMN_NAME) = 'ID_SUCURSAL'
      `);
      hasFacturaSucursal = (colRows?.[0] && Number(colRows[0].CNT || 0) > 0) || false;
    } catch { hasFacturaSucursal = false; }
    try {
      const [colNum] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND UPPER(COLUMN_NAME) = 'NUMERO_FACTURA'
      `);
      hasFacturaNumero = (colNum?.[0] && Number(colNum[0].CNT || 0) > 0) || false;
    } catch { hasFacturaNumero = false; }
    try {
      const [colServ] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND UPPER(COLUMN_NAME) = 'SERVICIO_TRANSPORTE'
      `);
      hasFacturaServicio = (colServ?.[0] && Number(colServ[0].CNT || 0) > 0) || false;
    } catch { hasFacturaServicio = false; }
    try {
      const [colEst] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND UPPER(COLUMN_NAME) = 'ESTADO'
      `);
      hasFacturaEstado = (colEst?.[0] && Number(colEst[0].CNT || 0) > 0) || false;
    } catch { hasFacturaEstado = false; }

    const facturaEstado = (body?.estado || 'Pendiente').toString();

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

    let facturaSql = '';
    let facturaParams = [];

    // Construir el INSERT de forma clara y segura
    // Armar las columnas dinámicamente
    const cols = [];
    const vals = [];
    const params = [];

    // Columnas siempre presentes
    if (hasFacturaNumero) {
      cols.push('NUMERO_FACTURA');
      vals.push('?');
      params.push(numeroFactura);
    }
    cols.push('FECHA', 'SUBTOTAL', 'DESCUENTO', 'SERVICIO_TRANSPORTE', 'TOTAL', 'ID_CLIENTES');
    vals.push('?', '?', '?', '?', '?', '?');
    params.push(fecha, subtotalOk, descuentoOk, servicioTrans, totalOk, clienteId || null);

    // Sucursal (si existe la columna)
    if (hasFacturaSucursal) {
      cols.push('ID_SUCURSAL');
      vals.push('?');
      params.push(sucursalId || null);
    }

    facturaSql = `INSERT INTO factura (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
    facturaParams = params;
    const [factRes] = await conn.query(facturaSql, facturaParams);
    const facturaId = factRes.insertId;

    // Ensure branch ID is persisted if the column exists but insert path missed it.
    if (sucursalId) {
      try {
        await conn.query('UPDATE factura SET ID_SUCURSAL = ? WHERE ID_FACTURA = ?', [sucursalId, facturaId]);
      } catch { /* ignore if column is absent or update fails */ }
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

      let unidadId = it.unit_id ?? it.unidad_id ?? it.UNIDAD_ID ?? null;
      if (unidadId !== null) unidadId = Number(unidadId) || null;
      
      let unidadNombre = it.unit_name ?? it.unidad_nombre ?? it.UNIDAD_NOMBRE ?? null;
      if (unidadNombre) unidadNombre = String(unidadNombre).trim() || null;
      
      console.log(`[POST VENTAS] ANTES Producto ${idProd}: unidadId=${unidadId}, unidadNombre=${unidadNombre}, qty=${qty}`);
      
      // Si no hay unidad, buscar la unidad principal del producto en producto_unidades
      if (!unidadId || !unidadNombre) {
        try {
          // Primero obtener UNIDAD_ID de producto_unidades directamente
          const [puRows] = await conn.query(
            'SELECT UNIDAD_ID FROM producto_unidades WHERE PRODUCT_ID = ? ORDER BY ES_POR_DEFECTO DESC, ID ASC LIMIT 1',
            [idProd]
          );
          console.log(`[POST VENTAS] Búsqueda en producto_unidades para ${idProd}:`, puRows);
          
          if (Array.isArray(puRows) && puRows.length > 0) {
            // Case mapping puede cambiar el nombre de la columna - revisar ambas formas
            const puRow = puRows[0];
            const colValue = puRow.UNIDAD_ID ?? puRow.unidad_id ?? puRow.unidadId ?? null;
            if (!unidadId && colValue) {
              unidadId = Number(colValue) || null;
              console.log(`[POST VENTAS] UNIDAD_ID encontrado: ${unidadId}`);
            }
            
            // Ahora obtener el NOMBRE de la unidad
            if (unidadId && !unidadNombre) {
              try {
                const [nameRows] = await conn.query(
                  'SELECT NOMBRE FROM unidades_medidas WHERE ID_UNIDAD = ? LIMIT 1',
                  [unidadId]
                );
                if (Array.isArray(nameRows) && nameRows.length > 0) {
                  const nameRow = nameRows[0];
                  const nameValue = nameRow.NOMBRE ?? nameRow.nombre ?? null;
                  if (nameValue) {
                    unidadNombre = String(nameValue).trim() || null;
                    console.log(`[POST VENTAS] NOMBRE encontrado: ${unidadNombre}`);
                  }
                }
              } catch (nameErr) {
                console.error(`[POST VENTAS] Error buscando nombre unidad ${unidadId}:`, nameErr?.message);
              }
            }
          } else {
            console.warn(`[POST VENTAS] No hay producto_unidades para producto ${idProd}`);
          }
        } catch (e) {
          console.error('[POST VENTAS] Error buscando unidad:', e?.message, e?.stack);
        }
      }
      console.log(`[POST VENTAS] DESPUÉS Producto ${idProd}: unidadId=${unidadId}, unidadNombre=${unidadNombre}`);      
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? it.cantidadPorUnidad ?? 1) || 1;
      const totalARestar = qty * cantidadPorUnidad;

      // Insert details con UNIDAD_ID, CANTIDAD_POR_UNIDAD, UNIDAD_NOMBRE
      await conn.query(
        'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, UNIDAD_ID, CANTIDAD_POR_UNIDAD, UNIDAD_NOMBRE, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [facturaId, idProd, qty, precio, sub, unidadId || null, cantidadPorUnidad, unidadNombre || null, usuarioId || null]
      );
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
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND UPPER(COLUMN_NAME) = 'NUMERO_FACTURA'
      `);
      hasFacturaNumero = (colRows?.[0] && Number(colRows[0].CNT || 0) > 0) || false;
    } catch { hasFacturaNumero = false; }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    let hasFacturaServicio = false;
    try {
      const [colServ] = await pool.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND UPPER(COLUMN_NAME) = 'SERVICIO_TRANSPORTE'
      `);
      hasFacturaServicio = (colServ?.[0] && Number(colServ[0].CNT || 0) > 0) || false;
    } catch {
      hasFacturaServicio = false;
    }
    
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
          ? `SELECT ID_FACTURA, NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, IFNULL(SERVICIO_TRANSPORTE, 0) AS SERVICIO_TRANSPORTE, ID_CLIENTES, IFNULL(ID_SUCURSAL, NULL) AS ID_SUCURSAL, IFNULL(ESTADO, 'Pendiente') AS ESTADO FROM factura WHERE ID_FACTURA = ?`
          : `SELECT ID_FACTURA, NULL AS NUMERO_FACTURA, FECHA, SUBTOTAL, DESCUENTO, TOTAL, IFNULL(SERVICIO_TRANSPORTE, 0) AS SERVICIO_TRANSPORTE, ID_CLIENTES, IFNULL(ID_SUCURSAL, NULL) AS ID_SUCURSAL, IFNULL(ESTADO, 'Pendiente') AS ESTADO FROM factura WHERE ID_FACTURA = ?`;
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
        const transporteValue = Number(
          (f.SERVICIO_TRANSPORTE ?? f.servicio_transporte ?? f.servicioTransporte ?? f.transporte ?? 0)
        );
        const facturaObj = {
          id: f.ID_FACTURA,
          numero: f.NUMERO_FACTURA || null,
          fecha: f.FECHA,
          subtotal: Number(f.SUBTOTAL || f.subtotal || 0),
          descuento: Number(f.DESCUENTO || f.descuento || 0),
          total: Number(f.TOTAL || f.total || 0),
          // Servicio transporte: soportar distintas formas de clave devueltas por el driver
          servicio_transporte: transporteValue,
          transporte: transporteValue,
          estado: f.ESTADO || 'Pendiente',
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
            unidad_id: it.unidad_id ?? it.UNIDAD_ID ?? null,
            cantidad_por_unidad: Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? 1),
            unidad_nombre: it.unidad_nombre ?? it.UNIDAD_NOMBRE ?? null
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
      let estado = (searchParams.get('estado') || '').toString().trim();
      if (usuarioSucursalId) {
        // Usuario no admin: ignorar sucursal enviada y usar la suya
        sucursal = usuarioSucursalId;
      }

      const whereClauses = [];
      const params = [];
      if (sucursal) {
        whereClauses.push('f.ID_SUCURSAL = ?');
        params.push(sucursal);
      }
      if (estado) {
        whereClauses.push(`IFNULL(f.ESTADO, 'Pendiente') = ?`);
        params.push(estado);
      }

      // Construir SQL con filtro opcional por sucursal y estado
      let sql = `
         SELECT f.ID_FACTURA AS id,
           ${hasFacturaNumero ? 'f.NUMERO_FACTURA' : 'NULL'} AS numero,
           DATE_FORMAT(f.FECHA, '%Y-%m-%d') AS fecha,
           DATE_FORMAT(f.FECHA, '%H:%i:%s') AS hora_sql,
           f.FECHA AS fecha_raw,
           f.TOTAL AS total,
           c.NOMBRE_CLIENTE AS cliente,
           c.TELEFONO_CLIENTE AS telefono,
           s.NOMBRE_SUCURSAL AS sucursal,
           IFNULL(f.ESTADO, 'Pendiente') AS estado,
           (SELECT COUNT(*) FROM factura_detalles fd WHERE fd.ID_FACTURA = f.ID_FACTURA) AS items,
           (SELECT COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') FROM factura_detalles fd LEFT JOIN usuarios u ON u.ID = fd.ID_USUARIO WHERE fd.ID_FACTURA = f.ID_FACTURA LIMIT 1) AS hecho_por
         FROM factura f
         LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
         LEFT JOIN sucursal s ON s.ID_SUCURSAL = f.ID_SUCURSAL`;
      if (whereClauses.length) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
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
          items: Number(r.items || 0),
          estado: r.estado || 'Pendiente',
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
    const { items, subtotal, descuento = 0, total, cliente = {}, pago, estado } = body || {};

    // LOG: Mostrar exactamente qué se recibe del cliente
    console.log('[PUT VENTAS] ========== REQUEST RECIBIDO ==========');
    console.log('[PUT VENTAS] ID factura:', id);
    console.log('[PUT VENTAS] Body completo:', JSON.stringify(body, null, 2));
    console.log('[PUT VENTAS] Items recibidos:', JSON.stringify(items, null, 2));
    if (items && items.length > 0) {
      console.log('[PUT VENTAS] Primer item detallado:', JSON.stringify(items[0], null, 2));
    }
    console.log('[PUT VENTAS] =====================================');

    if ((!Array.isArray(items) || items.length === 0) && pago) {
      await conn.beginTransaction();
      const [factRows] = await conn.query('SELECT * FROM factura WHERE ID_FACTURA = ? FOR UPDATE', [id]);
      if (!factRows || !factRows.length) {
        await conn.rollback();
        return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
      }
      const factura = factRows[0];
      const facturaEstadoActual = (factura.ESTADO || factura.estado || 'Pendiente').toString();
      let tasaCambio = Number(pago?.tasaCambio || 0);
      try {
        if (!tasaCambio || isNaN(tasaCambio) || tasaCambio <= 0) {
          const [cfg] = await conn.query('SELECT TASA FROM config_tasa_cambio WHERE ID = 1 LIMIT 1');
          if (cfg?.length && cfg[0].TASA) tasaCambio = Number(cfg[0].TASA);
        }
      } catch { }
      if (!tasaCambio || isNaN(tasaCambio) || tasaCambio <= 0) tasaCambio = 36.55;
      const recibidoCordobas = Number(pago?.cordobas || 0);
      const recibidoDolares = Number(pago?.dolares || 0);
      const totalFactura = Number(factura.TOTAL || total || 0);
      const cambio = Math.max(0, Number((recibidoCordobas + recibidoDolares * tasaCambio - totalFactura).toFixed(2)));
      try {
        await conn.query(
          'INSERT INTO factura_pagos (ID_FACTURA, MONTO_CORDOBAS, MONTO_DOLARES, TASA_CAMBIO, METODO) VALUES (?, ?, ?, ?, ?)',
          [id, recibidoCordobas, recibidoDolares, tasaCambio, pago?.metodo || 'efectivo']
        );
      } catch (err) { }
      if (estado) {
        const nuevoEstado = String(estado).trim();
        if (nuevoEstado.toLowerCase() === 'confirmado' && facturaEstadoActual.toLowerCase() !== 'confirmado') {
          await decrementStockForFactura(conn, id, factura.ID_SUCURSAL || null, factura.ID_USUARIO || null, 'Venta confirmada');
        }
        try {
          await conn.query('UPDATE factura SET ESTADO = ? WHERE ID_FACTURA = ?', [nuevoEstado, id]);
        } catch (err) { }
      }
      await conn.commit();
      return Response.json({ ok: true, facturaId: id, total: totalFactura, cambio });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No hay items en la venta' }, { status: 400 });
    }

    await conn.beginTransaction();

    // Load existing factura and su sucursal
    const [factRows] = await conn.query('SELECT * FROM factura WHERE ID_FACTURA = ? FOR UPDATE', [id]);
    if (!factRows || !factRows.length) {
      await conn.rollback();
      return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    const factura = factRows[0];
    const sucursalId = factura.ID_SUCURSAL || null;
    const facturaEstadoActual = (factura.ESTADO || factura.estado || 'Pendiente').toString();
    const wasConfirmed = facturaEstadoActual.toLowerCase() === 'confirmado';
    const nuevoEstado = typeof estado === 'string' ? estado.trim() : null;
    const willConfirm = nuevoEstado && nuevoEstado.toLowerCase() === 'confirmado';

    // Detectar si FACTURA_DETALLES tiene columna CANTIDAD_POR_UNIDAD para revertir correctamente
    let detalleHasCantidadPorUnidad = false;
    try {
      const [cols] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles' AND COLUMN_NAME = 'CANTIDAD_POR_UNIDAD'`);
      detalleHasCantidadPorUnidad = (cols && cols.length > 0);
    } catch { detalleHasCantidadPorUnidad = false; }

    // Revert previous detalles only if la factura ya estaba confirmada
    const selectPrevCols = detalleHasCantidadPorUnidad
      ? 'SELECT ID_PRODUCT, AMOUNT, IFNULL(CANTIDAD_POR_UNIDAD,1) AS CANTIDAD_POR_UNIDAD, ID_USUARIO FROM factura_detalles WHERE ID_FACTURA = ?'
      : 'SELECT ID_PRODUCT, AMOUNT, ID_USUARIO FROM factura_detalles WHERE ID_FACTURA = ?';
    const [prevDetalles] = await conn.query(selectPrevCols, [id]);
    const defaultUsuarioId = prevDetalles && prevDetalles[0] ? (prevDetalles[0].ID_USUARIO || null) : null;
    if (wasConfirmed) {
      for (const pd of (prevDetalles || [])) {
        const prodId = Number(pd.ID_PRODUCT);
        const prevQty = Number(pd.AMOUNT || 0);
        const mult = Number(pd.CANTIDAD_POR_UNIDAD ?? 1) || 1;
        const restoreQty = prevQty * mult;
        if (!prodId) continue;
        await conn.query('UPDATE stock_sucursal SET CANTIDAD = CANTIDAD + ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [restoreQty, prodId, sucursalId]);
        try {
          await conn.query(
            `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'entrada', ?, ?, ?, NULL, NULL)`,
            [prodId, sucursalId, defaultUsuarioId, restoreQty, 'Reversión por edición de venta', id]
          );
        } catch { }
      }
    }

    // Remove old detalles
    await conn.query('DELETE FROM factura_detalles WHERE ID_FACTURA = ?', [id]);

    let computedSubtotal = 0;
    for (const it of items) {
      const prodId = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      if (!prodId || qty <= 0) {
        await conn.rollback();
        return Response.json({ error: 'Item inválido en nuevos items' }, { status: 400 });
      }
      if (wasConfirmed || willConfirm) {
        const [stockRows] = await conn.query(
          `SELECT ss.CANTIDAD, s.NOMBRE_SUCURSAL
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
      }
      computedSubtotal += precio * qty;
    }

    const subtotalOk = Number.isFinite(Number(subtotal)) ? Number(subtotal) : computedSubtotal;
    const descuentoOk = Number(descuento || 0);
    const totalOk = Number.isFinite(Number(total)) ? Number(total) : Math.max(0, subtotalOk - descuentoOk);

    for (const it of items) {
      const prodId = Number(it.ID_PRODUCT || it.producto_id || it.id);
      const qty = Number(it.quantity || it.cantidad || 0);
      const precio = Number(it.PRECIO || it.precio_unit || it.precio || 0);
      const sub = Number((precio * qty).toFixed(2));

      let unidadId = it.unit_id ?? it.unidad_id ?? it.UNIDAD_ID ?? it.Unit_id ?? it.Unidad_id ?? null;
      if (unidadId !== null) unidadId = Number(unidadId) || null;
      let unidadNombre = it.unit_name ?? it.unidad_nombre ?? it.UNIDAD_NOMBRE ?? it.Unit_name ?? it.Unidad_nombre ?? null;
      if (unidadNombre) unidadNombre = String(unidadNombre).trim() || null;
      const cantidadPorUnidad = Number(it.cantidad_por_unidad ?? it.CANTIDAD_POR_UNIDAD ?? it.cantidadPorUnidad ?? it.Cantidad_por_unidad ?? it.CantidadPorUnidad ?? 1) || 1;

      if ((!unidadId || !unidadNombre) && prodId) {
        try {
          const [unitRows] = await conn.query(
            `SELECT pu.UNIDAD_ID, um.NOMBRE
             FROM producto_unidades pu
             LEFT JOIN unidades_medidas um ON um.ID_UNIDAD = pu.UNIDAD_ID
             WHERE pu.PRODUCT_ID = ? AND pu.ES_POR_DEFECTO = 1
             LIMIT 1`,
            [prodId]
          );
          if (unitRows && unitRows[0]) {
            if (!unidadId) unidadId = unitRows[0].UNIDAD_ID;
            if (!unidadNombre) unidadNombre = unitRows[0].NOMBRE;
          }
        } catch (e) { }
      }

      let insertSql = `INSERT INTO factura_detalles (
        ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO, UNIDAD_ID, CANTIDAD_POR_UNIDAD, UNIDAD_NOMBRE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      let insertValues = [id, prodId, qty, precio, sub, defaultUsuarioId, unidadId, cantidadPorUnidad, unidadNombre];
      try {
        await conn.query(insertSql, insertValues);
      } catch (insertErr) {
        insertSql = 'INSERT INTO factura_detalles (ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT, SUB_TOTAL, ID_USUARIO) VALUES (?, ?, ?, ?, ?, ?)';
        insertValues = [id, prodId, qty, precio, sub, defaultUsuarioId];
        await conn.query(insertSql, insertValues);
      }
    }

    if (wasConfirmed || willConfirm) {
      await decrementStockForFactura(conn, id, sucursalId, defaultUsuarioId, wasConfirmed ? 'Edición venta' : 'Venta confirmada');
    }

    const clienteNombre = (cliente?.nombre || cliente?.cliente_nombre || body?.cliente_nombre || '').toString().trim();
    const clienteTelefono = (cliente?.telefono || cliente?.telefono_cliente || body?.telefono_cliente || '').toString().trim();
    let clienteId = factura.ID_CLIENTES || null;
    if (clienteNombre || clienteTelefono) {
      clienteId = await getOrCreateCliente(conn, clienteNombre, clienteTelefono);
    }
    let hasFacturaServicio = false;
    try {
      const [colServ] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'SERVICIO_TRANSPORTE'
      `);
      hasFacturaServicio = (colServ?.[0] && Number(colServ[0].CNT || 0) > 0) || false;
    } catch { hasFacturaServicio = false; }
    const servicioTrans = Number((body?.servicio_transporte ?? body?.servicioTransporte) || 0) || 0;

    let hasFacturaEstado = false;
    try {
      const [colEst] = await conn.query(`
        SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura' AND COLUMN_NAME = 'ESTADO'
      `);
      hasFacturaEstado = (colEst?.[0] && Number(colEst[0].CNT || 0) > 0) || false;
    } catch { hasFacturaEstado = false; }

    const updateFields = ['SUBTOTAL = ?', 'DESCUENTO = ?', 'SERVICIO_TRANSPORTE = ?', 'TOTAL = ?', 'ID_CLIENTES = ?'];
    const updateParams = [subtotalOk, descuentoOk, servicioTrans, totalOk, clienteId || null];
    if (nuevoEstado && hasFacturaEstado) {
      updateFields.push('ESTADO = ?');
      updateParams.push(nuevoEstado);
    }
    updateParams.push(id);
    await conn.query(`UPDATE factura SET ${updateFields.join(', ')} WHERE ID_FACTURA = ?`, updateParams);

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
        await conn.query('DELETE FROM factura_descuento WHERE ID_FACTURA = ?', [id]);
        await conn.query('INSERT INTO factura_descuento (ID_FACTURA, ID_DESCUENTO, PERCENT, AMOUNT) VALUES (?, ?, ?, ?)', [id, discId, percent, amount]);
      } else {
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

export async function PATCH(req) {
  const conn = await pool.getConnection();
  wrapConnection(conn);
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    
    if (!id) return Response.json({ error: 'ID de factura requerido' }, { status: 400 });

    // Verificar que la factura existe
    const [factRows] = await conn.query('SELECT ID_FACTURA, ESTADO FROM factura WHERE ID_FACTURA = ?', [id]);
    if (!factRows || !factRows.length) {
      return Response.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    const factura = factRows[0];
    const estadoActual = (factura.ESTADO || factura.estado || 'Pendiente').toString();

    // Actualizar el estado a Cancelado
    const [updateResult] = await conn.query('UPDATE factura SET ESTADO = ? WHERE ID_FACTURA = ?', ['Cancelado', id]);

    return Response.json({ 
      success: true,
      ok: true, 
      id, 
      message: 'Factura cancelada correctamente',
      estadoAnterior: estadoActual,
      estadoNuevo: 'Cancelado'
    });
  } catch (e) {
    const message = e && e.message ? e.message : 'Error al cancelar la venta';
    console.error('[PATCH VENTAS] Error:', message);
    return Response.json({ error: message, success: false }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}
