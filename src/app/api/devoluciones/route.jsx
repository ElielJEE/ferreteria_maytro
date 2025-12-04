import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// Util: extraer usuario y sucursal del token (si existe)
async function getAuthContext(req) {
  let usuarioId = null; let sucursalId = null;
  try {
    const token = req.cookies?.get?.('token')?.value ?? null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      usuarioId = decoded?.id || decoded?.sub || decoded?.userId || decoded?.user_id || null;
      sucursalId = decoded?.ID_SUCURSAL || decoded?.sucursal_id || null;
    }
  } catch { /* ignorar */ }
  return { usuarioId, sucursalId };
}

// Util: resolver un ID de sucursal válido, según exista en la tabla sucursal, tolerando formatos 'S1' o '1'
async function resolveSucursalId(conn, ...candidates) {
  // candidates: posibles valores desde token, factura, último movimiento, etc.
  const tryFormats = (val) => {
    if (val == null) return [];
    const s = String(val).trim();
    const digits = (s.match(/\d+/g) || []).join('');
    const out = new Set();
    // tal cual
    out.add(s);
    // solo dígitos
    if (digits) out.add(digits);
    // con prefijo S
    if (digits) out.add(`S${digits}`);
    // mayúsculas
    out.add(s.toUpperCase());
    // minúsculas
    out.add(s.toLowerCase());
    return Array.from(out).filter(Boolean);
  };
  for (const cand of candidates) {
    const forms = tryFormats(cand);
    for (const f of forms) {
      const [r] = await conn.query('SELECT ID_SUCURSAL FROM sucursal WHERE ID_SUCURSAL = ? LIMIT 1', [f]);
      if (r?.length) return r[0].ID_SUCURSAL;
    }
  }
  return null;
}

// Util: obtener tipo de dato de una columna
async function getColumnDataType(conn, tableName, columnName) {
  try {
    const [rows] = await conn.query(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [tableName, columnName]
    );
    return (rows?.[0]?.DATA_TYPE || '').toString().toLowerCase();
  } catch {
    return '';
  }
}

// Util: coercionar el ID de sucursal al tipo de una columna destino
async function coerceSucursalFor(conn, tableName, columnName, canonicalId) {
  const dataType = await getColumnDataType(conn, tableName, columnName);
  if (canonicalId == null) return null;
  const s = String(canonicalId).trim();
  if (!dataType) return s; // por defecto devolver string
  const isNumeric = ['int','bigint','smallint','mediumint','tinyint','decimal','numeric','float','double'].includes(dataType);
  if (isNumeric) {
    const m = s.match(/\d+/);
    return m ? Number(m[0]) : (Number(s) || null);
  }
  return s;
}

// Util: obtener longitud máxima de una columna de tipo cadena
async function getColumnMaxLength(conn, tableName, columnName) {
  try {
    const [rows] = await conn.query(
      `SELECT CHARACTER_MAXIMUM_LENGTH AS L FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [tableName, columnName]
    );
    const L = rows?.[0]?.L;
    return (typeof L === 'number') ? L : null;
  } catch { return null; }
}

// Util: ajustar una cadena base a un largo máximo, preservando sufijo si se pasa
function fitWithSuffix(base, maxLen, suffix = '') {
  if (!maxLen || maxLen <= 0) return base;
  const room = maxLen - (suffix ? suffix.length + 1 : 0);
  const head = room > 0 ? base.slice(0, room) : base.slice(0, maxLen);
  return suffix ? `${head}-${suffix}`.slice(0, maxLen) : head.slice(0, maxLen);
}

// Util: redondear a 2 decimales y convertir a número
const toMoney = (value) => Number(Number(value || 0).toFixed(2));

// Util: detectar columnas existentes en una tabla
async function detectColumns(conn, table, cols) {
  try {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    const present = new Set(rows.map(r => r.COLUMN_NAME));
    return cols.reduce((acc, c) => { acc[c] = present.has(c); return acc; }, {});
  } catch {
    return cols.reduce((acc, c) => { acc[c] = false; return acc; }, {});
  }
}

// POST: crear devolución
export async function POST(req) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const { factura_id, detalle_id, producto_id, cantidad, estado, motivo, reemplazo } = body || {};
    if (!producto_id || !cantidad || Number(cantidad) <= 0) {
      return Response.json({ error: 'Producto y cantidad válidos requeridos' }, { status: 400 });
    }
  const { usuarioId, sucursalId: tokenSucursal } = await getAuthContext(req);
    let sucursalId = tokenSucursal;
  let clienteId = null;
    let facturaSucursal = null;
    let facturaSubtotalAntes = null;
    let facturaTotalAntes = null;
    let facturaSubtotalDespues = null;
    let facturaTotalDespues = null;
    let facturaDescuento = 0;
    let replacementSubtotal = 0;
    let subtotalAntesDetalles = null;
    let descuentoDevuelto = 0;
    let lineaBrutaDevuelta = 0;

    // Detectar columnas opcionales para compatibilidad con esquemas antiguos
    const devCols = await detectColumns(conn, 'devolucion', [
      'FECHA_DEVOLUCION','ID_SUCURSAL','ID_CLIENTES','ID_USUARIO_DEVOLUCION','MOTIVO','ESTADO','CANTIDAD','ID_DETALLES_FACTURA','ID_PRODUCT','ID_DEVOLUCION'
    ]);

    await conn.beginTransaction();

    // Monto de reembolso (solo aplica cuando NO hay reemplazo)
    let refundAmount = 0;

    // Validar que la cantidad solicitada no exceda lo vendido en el detalle (acumulado)
    // Además obtener el detalle de factura (FOR UPDATE) para leer CANTIDAD_POR_UNIDAD cuando exista
    let detalleRow = null;
    if (detalle_id) {
      const [dRows] = await conn.query(
        `SELECT ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT,
                COALESCE(CANTIDAD_POR_UNIDAD, 1) AS CANTIDAD_POR_UNIDAD,
                UNIDAD_ID, UNIDAD_NOMBRE
           FROM factura_detalles
          WHERE ID_DETALLES_FACTURA = ?
          LIMIT 1 FOR UPDATE`,
        [detalle_id]
      );
      if (!dRows?.length) return Response.json({ error: 'Detalle de factura no encontrado' }, { status: 404 });
      detalleRow = dRows[0];
      const cantVendida = Math.max(0, Number(detalleRow.AMOUNT || 0));
      const [sumRows] = await conn.query('SELECT COALESCE(SUM(CANTIDAD),0) AS sum_dev FROM devolucion WHERE ID_DETALLES_FACTURA = ?', [detalle_id]);
      const sumPrev = Math.max(0, Number(sumRows?.[0]?.sum_dev || 0));
      const disponible = Math.max(0, cantVendida - sumPrev);
      if (Number(cantidad) > disponible) {
        return Response.json({ error: `Cantidad excede lo disponible para devolver. Disponible: ${disponible}` }, { status: 400 });
      }
    }

    // Intentar obtener sucursal y cliente desde la factura del detalle si es posible
    if (detalle_id && detalleRow) {
      // Usar ID_FACTURA obtenido al leer el detalle
      try {
        const [frows] = await conn.query('SELECT ID_SUCURSAL, ID_CLIENTES, SUBTOTAL, TOTAL, DESCUENTO FROM factura WHERE ID_FACTURA = ? LIMIT 1 FOR UPDATE', [detalleRow.ID_FACTURA]);
        if (frows?.length) {
          facturaSucursal = frows[0].ID_SUCURSAL || null;
          sucursalId = sucursalId || facturaSucursal || null;
          clienteId = frows[0].ID_CLIENTES || null;
          facturaSubtotalAntes = toMoney(frows[0].SUBTOTAL || 0);
          facturaTotalAntes = toMoney(frows[0].TOTAL || 0);
          facturaDescuento = toMoney(frows[0].DESCUENTO || 0);
        }
      } catch {}
    }
    // Fallback: última sucursal con movimiento para este producto
    let lastMovSucursal = null;
    if (!sucursalId) {
      const [mov] = await conn.query('SELECT sucursal_id FROM movimientos_inventario WHERE producto_id = ? ORDER BY id DESC LIMIT 1', [producto_id]);
      if (mov?.length) lastMovSucursal = mov[0].sucursal_id;
    }

    // Resolver sucursal válida existente en sucursal
    // Regla: si viene de detalle/factura, esa sucursal manda.
    let resolvedSucursalId = null;
    if (facturaSucursal) {
      resolvedSucursalId = await resolveSucursalId(conn, facturaSucursal);
    } else {
      resolvedSucursalId = await resolveSucursalId(conn, sucursalId, lastMovSucursal);
    }
    // Si el esquema no tiene columna ID_SUCURSAL ignoramos la sucursal (compatibilidad)
    if (devCols.ID_SUCURSAL && !resolvedSucursalId) {
      return Response.json({ error: 'Sucursal no encontrada o inválida para la devolución' }, { status: 400 });
    }

    // Coercionar ID por tabla/columna para evitar errores de tipo y FK
    const devSucursalId   = await coerceSucursalFor(conn, 'devolucion', 'ID_SUCURSAL', resolvedSucursalId);
    const stockSucursalId = await coerceSucursalFor(conn, 'stock_sucursal', 'ID_SUCURSAL', resolvedSucursalId);
    const movSucursalId   = await coerceSucursalFor(conn, 'movimientos_inventario', 'sucursal_id', resolvedSucursalId);

    // Actualizar stock o registrar daños según estado de producto
    if (devCols.ID_SUCURSAL && stockSucursalId != null) {
      const isDaniado = (estado || '').toString().toUpperCase() === 'DANIADO';

      // Determinar factor CANTIDAD_POR_UNIDAD: preferir el almacenado en factura_detalles si existe,
      // si no, intentar la unidad por defecto en producto_unidades, sino 1.
      let cantidadPorUnidad = 1;
      if (detalleRow && detalleRow.CANTIDAD_POR_UNIDAD != null) {
        cantidadPorUnidad = Number(detalleRow.CANTIDAD_POR_UNIDAD || 1) || 1;
      } else {
        try {
          const [pu] = await conn.query('SELECT CANTIDAD_POR_UNIDAD FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [producto_id]);
          if (pu?.length) cantidadPorUnidad = Number(pu[0].CANTIDAD_POR_UNIDAD || 1) || 1;
        } catch {}
      }

      const cantidadReal = Number(cantidad || 0) * Number(cantidadPorUnidad || 1);

      if (!isDaniado) {
        // En buen estado: sumar al stock de la sucursal y registrar movimiento de entrada (usar cantidad real)
        const [stockRows] = await conn.query('SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [producto_id, stockSucursalId]);
        const anterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
        const nuevo = anterior + cantidadReal;
        if (stockRows.length) {
          await conn.query('UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevo, producto_id, stockSucursalId]);
        } else {
          await conn.query('INSERT INTO stock_sucursal (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [producto_id, stockSucursalId, nuevo]);
        }
        try {
          await conn.query(
            `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'entrada', ?, ?, ?, ?, ?)`,
            [producto_id, movSucursalId, usuarioId || null, cantidadReal, 'Devolución', factura_id || null, anterior, nuevo]
          );
        } catch {}
      } else {
        // Dañado: no se suma al stock vendible. Registrar movimiento como 'danado' y guardar en stock_danados.
        try {
          await conn.query(
            `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'danado', ?, ?, ?, NULL, NULL)`,
            [producto_id, movSucursalId, usuarioId || null, cantidadReal, 'Devolución dañada', factura_id || null]
          );
        } catch {}
        // Insertar registro en stock_danados si existe la tabla/columnas (tolerante)
        try {
          // Obtener precio para calcular pérdida
          let precioUnitario = 0;
          try {
            const [pp] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [producto_id]);
            if (pp?.length) { precioUnitario = Number(pp[0].PRECIO || 0); }
            else {
              const [pp2] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? LIMIT 1', [producto_id]);
              if (pp2?.length) precioUnitario = Number(pp2[0].PRECIO || 0);
            }
          } catch {}
          const perdida = Number(cantidadReal || 0) * Number(precioUnitario || 0);
          const [colsRes] = await conn.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_danados'`
          );
          const hasTable = Array.isArray(colsRes) && colsRes.length > 0;
          if (hasTable) {
            const available = new Set((colsRes || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
            const cols = []; const ph = []; const vals = [];
            const push = (c, v, now = false) => { cols.push(c); if (now) ph.push('NOW()'); else { ph.push('?'); vals.push(v); } };
            if (available.has('ID_PRODUCT')) push('ID_PRODUCT', producto_id);
            if (available.has('ID_SUCURSAL')) push('ID_SUCURSAL', stockSucursalId);
            if (available.has('CANTIDAD')) push('CANTIDAD', cantidadReal);
            if (available.has('DESCRIPCION')) push('DESCRIPCION', motivo || 'Devolución dañada');
            if (available.has('TIPO_DANO')) push('TIPO_DANO', 'Defectuoso');
            if (available.has('USUARIO_ID')) push('USUARIO_ID', usuarioId || null);
            if (available.has('REFERENCIA')) push('REFERENCIA', factura_id || null);
            if (available.has('PERDIDA')) push('PERDIDA', perdida);
            if (available.has('CREATED_AT')) push('CREATED_AT', null, true);
            if (cols.length) {
              const sql = `INSERT INTO stock_danados (${cols.join(', ')}) VALUES (${ph.join(', ')})`;
              await conn.query(sql, vals);
            }
          }
        } catch {}
      }
    }

    // Crear registro de devolución
  // Generar ID con patrón DEV-HHmmssYYYYMMDD y adaptarlo a la longitud real de la columna ID_DEVOLUCION
  let devId = null;
  try {
    const [[tsRow]] = await conn.query("SELECT DATE_FORMAT(NOW(), '%H%i%s%Y%m%d') AS TS");
    const base = `DEV-${tsRow?.TS || Date.now().toString()}`;
    const maxLen = await getColumnMaxLength(conn, 'devolucion', 'ID_DEVOLUCION');
    let candidate = fitWithSuffix(base, maxLen || 24);
    // Verificar colisión y ajustar si existe
    let [exists] = await conn.query('SELECT 1 FROM devolucion WHERE ID_DEVOLUCION = ? LIMIT 1', [candidate]);
    if (exists.length) {
      const rand = Math.floor(Math.random()*100).toString().padStart(2,'0');
      candidate = fitWithSuffix(base, maxLen || 24, rand);
      [exists] = await conn.query('SELECT 1 FROM devolucion WHERE ID_DEVOLUCION = ? LIMIT 1', [candidate]);
      if (exists.length) {
        const rand2 = Math.floor(Math.random()*1000).toString().padStart(3,'0');
        candidate = fitWithSuffix(base, maxLen || 24, rand2);
      }
    }
    devId = candidate;
  } catch {
    // Fallback simple si falla la generación basada en MySQL
    const d = new Date();
    const pad = (v) => v.toString().padStart(2,'0');
    const stamp = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    devId = `DEV-${stamp}`.slice(0,24);
  }
  // Construir inserción dinámica según columnas presentes
  const insertCols = ['ID_DEVOLUCION','CANTIDAD'];
  const values = [devId, cantidad];
  if (devCols.ESTADO) { insertCols.push('ESTADO'); values.push(estado || 'BUENO'); }
  if (devCols.MOTIVO) { insertCols.push('MOTIVO'); values.push(motivo || null); }
  if (devCols.ID_USUARIO_DEVOLUCION) { insertCols.push('ID_USUARIO_DEVOLUCION'); values.push(usuarioId || null); }
  if (devCols.FECHA_DEVOLUCION) { insertCols.push('FECHA_DEVOLUCION'); values.push(new Date()); }
  if (devCols.ID_SUCURSAL) { insertCols.push('ID_SUCURSAL'); values.push(devSucursalId || null); }
  if (devCols.ID_CLIENTES) { insertCols.push('ID_CLIENTES'); values.push(clienteId || null); }
  if (devCols.ID_DETALLES_FACTURA) { insertCols.push('ID_DETALLES_FACTURA'); values.push(detalle_id || null); }
  if (devCols.ID_PRODUCT) { insertCols.push('ID_PRODUCT'); values.push(producto_id); }
  const placeholders = insertCols.map(()=>'?').join(',');
  const sqlInsert = `INSERT INTO devolucion (${insertCols.join(',')}) VALUES (${placeholders})`;
  await conn.query(sqlInsert, values);

    // Si se envía reemplazo, actualizar detalles de factura y stock del producto nuevo.
    // Nueva lógica: validar que el producto de reemplazo comparte el mismo conjunto de unidades
    // que el producto original y permitir especificar unidad concreta para el reemplazo.
    if (reemplazo && (reemplazo.producto_id || reemplazo.productoId)) {
      const nuevoProdId = Number(reemplazo.producto_id || reemplazo.productoId);
      // La cantidad del reemplazo debe ser exactamente la cantidad devuelta (ignoramos reemplazo.cantidad si difiere)
      const qtyReemp = Number(cantidad);
      // Unidad seleccionada para el producto nuevo (puede venir como unidad_id / unidadId)
      const unidadReemplazoId = reemplazo.unidad_id || reemplazo.unidadId || null;
      if (!nuevoProdId || qtyReemp <= 0) {
        await conn.rollback();
        return Response.json({ error: 'Datos de reemplazo inválidos' }, { status: 400 });
      }

      if (detalleRow) {
        const precioUnitOriginal = Number(detalleRow.PRECIO_UNIT ?? detalleRow.precio_unit ?? 0);
        lineaBrutaDevuelta = toMoney(Number(cantidad) * precioUnitOriginal);
        if (facturaSubtotalAntes == null && detalleRow.ID_FACTURA) {
          try {
            const [[sumPrev]] = await conn.query('SELECT COALESCE(SUM(SUB_TOTAL),0) AS SUBT FROM factura_detalles WHERE ID_FACTURA = ?', [detalleRow.ID_FACTURA]);
            facturaSubtotalAntes = toMoney(sumPrev?.SUBT || 0);
          } catch {}
        }
        if (facturaTotalAntes == null && facturaSubtotalAntes != null) {
          facturaTotalAntes = toMoney(facturaSubtotalAntes - facturaDescuento);
        }
        if ((facturaSubtotalAntes || 0) > 0 && facturaDescuento > 0) {
          descuentoDevuelto = toMoney((lineaBrutaDevuelta / facturaSubtotalAntes) * facturaDescuento);
        }
      }

      // 0) Validar set de unidades iguales entre producto original y nuevo
      try {
        const [unidadesOriginalRows] = await conn.query('SELECT UNIDAD_ID FROM producto_unidades WHERE PRODUCT_ID = ?', [producto_id]);
        const [unidadesNuevoRows] = await conn.query('SELECT UNIDAD_ID FROM producto_unidades WHERE PRODUCT_ID = ?', [nuevoProdId]);
        const setOriginal = new Set(unidadesOriginalRows.map(r => r.UNIDAD_ID));
        const setNuevo = new Set(unidadesNuevoRows.map(r => r.UNIDAD_ID));
        // Condición: ambos conjuntos deben ser exactamente iguales (mismo tamaño y mismos elementos)
        const conjuntosIguales = setOriginal.size === setNuevo.size && [...setOriginal].every(u => setNuevo.has(u));
        if (!conjuntosIguales) {
          await conn.rollback();
          return Response.json({ error: 'El producto de reemplazo no posee el mismo conjunto de unidades de medida' }, { status: 400 });
        }
        // Si se especificó unidadReemplazoId, validar que esté en ambos sets
        if (unidadReemplazoId && !setOriginal.has(unidadReemplazoId)) {
          await conn.rollback();
          return Response.json({ error: 'La unidad seleccionada no pertenece al producto original' }, { status: 400 });
        }
        if (unidadReemplazoId && !setNuevo.has(unidadReemplazoId)) {
          await conn.rollback();
          return Response.json({ error: 'La unidad seleccionada no pertenece al producto de reemplazo' }, { status: 400 });
        }
      } catch (e) {
        await conn.rollback();
        return Response.json({ error: 'Error validando unidades de medida para reemplazo' }, { status: 400 });
      }

      // 1) Actualizar detalle original: reducir cantidad o eliminar
      if (detalle_id) {
        const [dRows] = await conn.query('SELECT ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT FROM factura_detalles WHERE ID_DETALLES_FACTURA = ? FOR UPDATE', [detalle_id]);
        if (dRows?.length) {
          const det = dRows[0];
          const nuevaCantidad = Math.max(0, Number(det.AMOUNT || 0) - Number(cantidad));
          if (nuevaCantidad === 0) {
            await conn.query('DELETE FROM factura_detalles WHERE ID_DETALLES_FACTURA = ?', [detalle_id]);
          } else {
            const nuevoSub = Number((nuevaCantidad * Number(det.PRECIO_UNIT || 0)).toFixed(2));
            await conn.query('UPDATE factura_detalles SET AMOUNT = ?, SUB_TOTAL = ? WHERE ID_DETALLES_FACTURA = ?', [nuevaCantidad, nuevoSub, detalle_id]);
          }
        }
      }

      // 2) Insertar nuevo detalle para el producto de reemplazo con su precio
      let facId = factura_id;
      if (!facId && detalle_id) {
        const [d] = await conn.query('SELECT ID_FACTURA FROM factura_detalles WHERE ID_DETALLES_FACTURA = ? LIMIT 1', [detalle_id]);
        if (d?.length) facId = d[0].ID_FACTURA;
      }
      // 1b) Obtener precio y factor de la unidad seleccionada (o default si no se envía)
      let precioNuevo = 0;
      let unidadFactorNuevo = 1;
      let unidadNombreNuevo = null;
      if (unidadReemplazoId) {
        const [rowUn] = await conn.query(
          'SELECT PRECIO, CANTIDAD_POR_UNIDAD, UNIDAD_ID, (SELECT NOMBRE FROM unidades_medidas WHERE ID_UNIDAD = UNIDAD_ID LIMIT 1) AS UNIDAD_NOMBRE FROM producto_unidades WHERE PRODUCT_ID = ? AND UNIDAD_ID = ? LIMIT 1',
          [nuevoProdId, unidadReemplazoId]
        );
        if (!rowUn?.length) {
          await conn.rollback();
          return Response.json({ error: 'Unidad de medida seleccionada inválida para el producto de reemplazo' }, { status: 400 });
        }
        precioNuevo = Number(rowUn[0].PRECIO || 0);
        unidadFactorNuevo = Number(rowUn[0].CANTIDAD_POR_UNIDAD || 1) || 1;
        unidadNombreNuevo = rowUn[0].UNIDAD_NOMBRE || null;
      } else {
        const [ppn] = await conn.query('SELECT PRECIO, CANTIDAD_POR_UNIDAD, UNIDAD_ID, (SELECT NOMBRE FROM unidades_medidas WHERE ID_UNIDAD = UNIDAD_ID LIMIT 1) AS UNIDAD_NOMBRE FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [nuevoProdId]);
        if (ppn?.length) {
          precioNuevo = Number(ppn[0].PRECIO || 0);
          unidadFactorNuevo = Number(ppn[0].CANTIDAD_POR_UNIDAD || 1) || 1;
          unidadNombreNuevo = ppn[0].UNIDAD_NOMBRE || null;
        } else {
          const [ppn2] = await conn.query('SELECT PRECIO, CANTIDAD_POR_UNIDAD, UNIDAD_ID, (SELECT NOMBRE FROM unidades_medidas WHERE ID_UNIDAD = UNIDAD_ID LIMIT 1) AS UNIDAD_NOMBRE FROM producto_unidades WHERE PRODUCT_ID = ? LIMIT 1', [nuevoProdId]);
          if (ppn2?.length) {
            precioNuevo = Number(ppn2[0].PRECIO || 0);
            unidadFactorNuevo = Number(ppn2[0].CANTIDAD_POR_UNIDAD || 1) || 1;
            unidadNombreNuevo = ppn2[0].UNIDAD_NOMBRE || null;
          }
        }
      }
      const subNuevo = Number((precioNuevo * qtyReemp).toFixed(2));
      replacementSubtotal = toMoney(subNuevo);
      if (facId) {
        // Detectar si factura_detalles tiene columnas de unidad para propagar metadata
        const fdCols = await detectColumns(conn, 'factura_detalles', ['UNIDAD_ID','CANTIDAD_POR_UNIDAD','UNIDAD_NOMBRE']);
        const insCols = ['ID_FACTURA','ID_PRODUCT','AMOUNT','PRECIO_UNIT','SUB_TOTAL','ID_USUARIO'];
        const insVals = [facId, nuevoProdId, qtyReemp, precioNuevo, subNuevo, usuarioId || null];
        if (fdCols.UNIDAD_ID || fdCols.CANTIDAD_POR_UNIDAD || fdCols.UNIDAD_NOMBRE) {
          // Si tenemos el detalle original, usar su metadata de unidad; si no, intentar obtener default del nuevo producto
          const unidadIdFromOld = detalleRow ? (detalleRow.UNIDAD_ID ?? detalleRow.unidad_id ?? null) : null;
          const cantidadPorUnidadFromOld = detalleRow ? (detalleRow.CANTIDAD_POR_UNIDAD ?? detalleRow.cantidad_por_unidad ?? 1) : null;
          const unidadNombreFromOld = detalleRow ? (detalleRow.UNIDAD_NOMBRE ?? detalleRow.unidad_nombre ?? null) : null;

          let unidadIdUse = unidadIdFromOld;
          let cantidadPorUnidadUse = cantidadPorUnidadFromOld != null ? Number(cantidadPorUnidadFromOld || 1) : null;
          let unidadNombreUse = unidadNombreFromOld;

          if (!cantidadPorUnidadUse) {
            try {
              const [puDef] = await conn.query('SELECT CANTIDAD_POR_UNIDAD, UNIDAD_ID FROM producto_unidades pu LEFT JOIN unidades_medidas u ON pu.UNIDAD_ID = u.ID_UNIDAD WHERE pu.PRODUCT_ID = ? AND pu.ES_POR_DEFECTO = 1 LIMIT 1', [nuevoProdId]);
              if (puDef?.length) {
                cantidadPorUnidadUse = Number(puDef[0].CANTIDAD_POR_UNIDAD || 1) || 1;
                unidadIdUse = unidadIdUse || (puDef[0].UNIDAD_ID || null);
              }
            } catch {}
          }

          // Overwrite con unidad elegida explícitamente si vino del frontend
          if (unidadReemplazoId) {
            unidadIdUse = unidadReemplazoId;
            cantidadPorUnidadUse = unidadFactorNuevo;
            unidadNombreUse = unidadNombreNuevo || unidadNombreUse;
          }

          if (fdCols.UNIDAD_ID) { insCols.push('UNIDAD_ID'); insVals.push(unidadIdUse); }
          if (fdCols.CANTIDAD_POR_UNIDAD) { insCols.push('CANTIDAD_POR_UNIDAD'); insVals.push(cantidadPorUnidadUse != null ? cantidadPorUnidadUse : 1); }
          if (fdCols.UNIDAD_NOMBRE) { insCols.push('UNIDAD_NOMBRE'); insVals.push(unidadNombreUse); }
        }

        const placeholders = insCols.map(()=>'?').join(',');
        const sql = `INSERT INTO factura_detalles (${insCols.join(',')}) VALUES (${placeholders})`;
        await conn.query(sql, insVals);
      }

      // 3) Descontar stock para el producto de reemplazo (salida)
      if (devCols.ID_SUCURSAL && stockSucursalId != null) {
        // Si el nuevo detalle incluye cantidad_por_unidad tomada del detalle devuelto, usarla para descontar stock real
        let replacementFactor = unidadReemplazoId ? unidadFactorNuevo : 1;
        try {
          // Buscar en factura_detalles recién insertado (último insert id) la CANTIDAD_POR_UNIDAD si existe
          // pero preferir la metadata copiada desde detalleRow si estaba presente
          if (detalleRow && detalleRow.CANTIDAD_POR_UNIDAD != null) replacementFactor = Number(detalleRow.CANTIDAD_POR_UNIDAD || 1) || 1;
          else {
            const [puDef2] = await conn.query('SELECT CANTIDAD_POR_UNIDAD FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [nuevoProdId]);
            if (puDef2?.length) replacementFactor = Number(puDef2[0].CANTIDAD_POR_UNIDAD || 1) || 1;
          }
        } catch {}

        const realQtyReemp = Number(qtyReemp || 0) * Number(replacementFactor || 1);
        const [stock2] = await conn.query('SELECT CANTIDAD FROM stock_sucursal WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [nuevoProdId, stockSucursalId]);
        const ant = stock2.length ? Number(stock2[0].CANTIDAD || 0) : 0;
        if (realQtyReemp > ant) {
          await conn.rollback();
          return Response.json({ error: 'Stock insuficiente para producto de reemplazo' }, { status: 400 });
        }
        const neu = ant - realQtyReemp;
        await conn.query('UPDATE stock_sucursal SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [neu, nuevoProdId, stockSucursalId]);
        try {
          await conn.query(
            `INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
            [nuevoProdId, movSucursalId, usuarioId || null, realQtyReemp, 'Reemplazo devolución', facId || null, ant, neu]
          );
        } catch {}
      }

      // 4) Recalcular totales de la factura
      if (facId) {
        const [[sumRow]] = await conn.query('SELECT COALESCE(SUM(SUB_TOTAL),0) AS SUBT FROM factura_detalles WHERE ID_FACTURA = ?', [facId]);
        const nuevoSubtotal = Number(sumRow?.SUBT || 0);
        const [[descRow]] = await conn.query('SELECT DESCUENTO FROM factura WHERE ID_FACTURA = ?', [facId]);
        const desc = Number(descRow?.DESCUENTO || 0);
        const nuevoTotal = Math.max(0, Number((nuevoSubtotal - desc).toFixed(2)));
        await conn.query('UPDATE factura SET SUBTOTAL = ?, TOTAL = ? WHERE ID_FACTURA = ?', [nuevoSubtotal, nuevoTotal, facId]);
        facturaSubtotalDespues = toMoney(nuevoSubtotal);
        facturaTotalDespues = toMoney(nuevoTotal);
        facturaDescuento = toMoney(desc);
      }
    } else if (detalle_id) {
      // No hay reemplazo: calcular reembolso y luego reducir/eliminar detalle y recalcular factura
      const [dRows] = await conn.query('SELECT ID_FACTURA, AMOUNT, PRECIO_UNIT, SUB_TOTAL FROM factura_detalles WHERE ID_DETALLES_FACTURA = ? FOR UPDATE', [detalle_id]);
      if (dRows?.length) {
        const det = dRows[0];
        const facId = det.ID_FACTURA;
        const cantidadDevuelta = Number(cantidad);
        const precioUnit = Number(det.PRECIO_UNIT || 0);
        const brutoLinea = Number((cantidadDevuelta * precioUnit).toFixed(2));
        lineaBrutaDevuelta = toMoney(brutoLinea);
        // Obtener subtotal actual completo de la factura (antes de modificar) y descuento para prorrateo
        let subtotalAntes = 0; let descuentoFactura = 0;
        if (facId) {
          try {
            const [[sumRowAntes]] = await conn.query('SELECT COALESCE(SUM(SUB_TOTAL),0) AS SUBT FROM factura_detalles WHERE ID_FACTURA = ?', [facId]);
            subtotalAntes = Number(sumRowAntes?.SUBT || 0);
            const [[descRow]] = await conn.query('SELECT DESCUENTO FROM factura WHERE ID_FACTURA = ?', [facId]);
            descuentoFactura = Number(descRow?.DESCUENTO || 0);
          } catch {}
        }
        subtotalAntesDetalles = toMoney(subtotalAntes);
        if (facturaSubtotalAntes == null) facturaSubtotalAntes = subtotalAntesDetalles;
        facturaDescuento = toMoney(descuentoFactura);
        if (facturaTotalAntes == null && facturaSubtotalAntes != null) {
          facturaTotalAntes = toMoney(facturaSubtotalAntes - facturaDescuento);
        }
        // Prorratear descuento sobre la porción devuelta
        let descuentoProporcional = 0;
        if (subtotalAntes > 0 && descuentoFactura > 0) {
          descuentoProporcional = Number(((brutoLinea / subtotalAntes) * descuentoFactura).toFixed(2));
        }
        descuentoDevuelto = toMoney(descuentoProporcional);
        refundAmount = Math.max(0, Number((brutoLinea - descuentoProporcional).toFixed(2)));
        refundAmount = toMoney(refundAmount);

        // Ajustar detalle
        const nuevaCantidad = Math.max(0, Number(det.AMOUNT || 0) - cantidadDevuelta);
        if (nuevaCantidad === 0) {
          await conn.query('DELETE FROM factura_detalles WHERE ID_DETALLES_FACTURA = ?', [detalle_id]);
        } else {
          const nuevoSub = Number((nuevaCantidad * precioUnit).toFixed(2));
          await conn.query('UPDATE factura_detalles SET AMOUNT = ?, SUB_TOTAL = ? WHERE ID_DETALLES_FACTURA = ?', [nuevaCantidad, nuevoSub, detalle_id]);
        }
        // Recalcular factura usando nuevos detalles
        if (facId) {
          const [[sumRow]] = await conn.query('SELECT COALESCE(SUM(SUB_TOTAL),0) AS SUBT FROM factura_detalles WHERE ID_FACTURA = ?', [facId]);
          const nuevoSubtotal = Number(sumRow?.SUBT || 0);
          const nuevoTotal = Math.max(0, Number((nuevoSubtotal - descuentoFactura).toFixed(2)));
          await conn.query('UPDATE factura SET SUBTOTAL = ?, TOTAL = ? WHERE ID_FACTURA = ?', [nuevoSubtotal, nuevoTotal, facId]);
          facturaSubtotalDespues = toMoney(nuevoSubtotal);
          facturaTotalDespues = toMoney(nuevoTotal);
        }
      }
    }

    await conn.commit();

    const subtotalOriginal = facturaSubtotalAntes != null ? toMoney(facturaSubtotalAntes) : toMoney(subtotalAntesDetalles);
    const descuentoFacturaTotal = toMoney(facturaDescuento);
    const totalOriginal = facturaTotalAntes != null
      ? toMoney(facturaTotalAntes)
      : toMoney(subtotalOriginal - descuentoFacturaTotal);
    const subtotalNuevo = facturaSubtotalDespues != null ? toMoney(facturaSubtotalDespues) : subtotalOriginal;
    const totalNuevo = facturaTotalDespues != null
      ? toMoney(facturaTotalDespues)
      : toMoney(subtotalNuevo - descuentoFacturaTotal);
    const refundRounded = toMoney(refundAmount);

    const diffTotals = toMoney(totalNuevo - totalOriginal);
    let totalAPagar = 0;
    let totalADevolver = refundRounded;
    if (diffTotals > 0) {
      totalAPagar = diffTotals;
      totalADevolver = 0;
    } else if (diffTotals < 0) {
      const absDiff = Math.abs(diffTotals);
      if (absDiff > totalADevolver) totalADevolver = absDiff;
      totalAPagar = 0;
    }

    const totals = {
      subtotal_original: subtotalOriginal,
      subtotal_nuevo: subtotalNuevo,
      descuento: descuentoFacturaTotal,
      total_original: totalOriginal,
      total_nuevo: totalNuevo,
      total_a_pagar: toMoney(totalAPagar),
      total_a_devolver: toMoney(totalADevolver),
      linea_bruta_devuelta: toMoney(lineaBrutaDevuelta),
      descuento_prorrateado: toMoney(descuentoDevuelto),
      subtotal_reemplazo: toMoney(replacementSubtotal),
    };

    return Response.json({ ok: true, devolucion_id: devId, refund: refundRounded, totals });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    return Response.json({ error: e.message || 'Error al crear devolución' }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
  }
}

// GET: lista o detalle
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Compatibilidad: detectar si existe FECHA_DEVOLUCION
    let hasFechaDev = false;
    try {
      const [colRows] = await pool.query(`SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='devolucion' AND COLUMN_NAME='FECHA_DEVOLUCION'`);
      hasFechaDev = (colRows?.[0]?.CNT || 0) > 0;
    } catch { hasFechaDev = false; }

    // Detectar si factura_detalles tiene columnas de unidad (para devolver metadata de unidad)
    let hasFacturaDetallesUnidad = false;
    try {
      const [fdCols] = await pool.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalles'`);
      const presentFd = new Set((fdCols || []).map(r => String(r.COLUMN_NAME)));
      hasFacturaDetallesUnidad = presentFd.has('UNIDAD_ID') || presentFd.has('CANTIDAD_POR_UNIDAD') || presentFd.has('UNIDAD_NOMBRE');
    } catch { hasFacturaDetallesUnidad = false; }

   if (id) {
    // construir selectDetalle incluyendo posibles columnas de unidad en factura_detalles
    const extraFdSelect = hasFacturaDetallesUnidad ? 'fd.UNIDAD_ID AS unidad_id, fd.CANTIDAD_POR_UNIDAD AS cantidad_por_unidad, fd.UNIDAD_NOMBRE AS unidad_nombre,' : '';
    const selectDetalle = hasFechaDev ?
  `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_DETALLES_FACTURA, d.ID_PRODUCT,
   d.ID_USUARIO_DEVOLUCION, p.PRODUCT_NAME, p.CODIGO_PRODUCTO,
   ${extraFdSelect}
   fd.ID_FACTURA, f.TOTAL AS factura_total, f.FECHA AS factura_fecha,
   COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
   COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
   COALESCE(s.NOMBRE_SUCURSAL,
     (SELECT s2.NOMBRE_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.NOMBRE_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_nombre,
   COALESCE(s.ID_SUCURSAL,
     (SELECT s2.ID_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.ID_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_id_real,
   u.NOMBRE AS usuario_nombre
  FROM devolucion d
  LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
  LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
  LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
  LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
  LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
  LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
  LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
  WHERE d.ID_DEVOLUCION = ? LIMIT 1` :
  `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.ID_SUCURSAL, d.ID_DETALLES_FACTURA, d.ID_PRODUCT,
   d.ID_USUARIO_DEVOLUCION, p.PRODUCT_NAME, p.CODIGO_PRODUCTO,
   ${extraFdSelect}
   fd.ID_FACTURA, f.TOTAL AS factura_total, f.FECHA AS factura_fecha,
   COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
   COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
   COALESCE(s.NOMBRE_SUCURSAL,
     (SELECT s2.NOMBRE_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.NOMBRE_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_nombre,
   COALESCE(s.ID_SUCURSAL,
     (SELECT s2.ID_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.ID_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_id_real,
   u.NOMBRE AS usuario_nombre
  FROM devolucion d
  LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
  LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
  LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
  LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
  LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
  LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
  LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
  WHERE d.ID_DEVOLUCION = ? LIMIT 1`;
      let rows;
      try {
        [rows] = await pool.query(selectDetalle, [id]);
      } catch (err) {
        // Fallback simple sin subconsultas de sucursal
        const fallbackDetalle = hasFechaDev ?
          `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_DETALLES_FACTURA, d.ID_PRODUCT,
                  d.ID_USUARIO_DEVOLUCION, p.PRODUCT_NAME, p.CODIGO_PRODUCTO,
                  fd.ID_FACTURA, f.TOTAL AS factura_total, f.FECHA AS factura_fecha,
                  COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
                  COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
                  s.NOMBRE_SUCURSAL AS sucursal_nombre,
                  s.ID_SUCURSAL AS sucursal_id_real,
                  u.NOMBRE AS usuario_nombre
           FROM devolucion d
           LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
           LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
           LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
           LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
           LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
           LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
           LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
           WHERE d.ID_DEVOLUCION = ? LIMIT 1`
          :
          `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.ID_SUCURSAL, d.ID_DETALLES_FACTURA, d.ID_PRODUCT,
                  d.ID_USUARIO_DEVOLUCION, p.PRODUCT_NAME, p.CODIGO_PRODUCTO,
                  fd.ID_FACTURA, f.TOTAL AS factura_total, f.FECHA AS factura_fecha,
                  COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
                  COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
                  s.NOMBRE_SUCURSAL AS sucursal_nombre,
                  s.ID_SUCURSAL AS sucursal_id_real,
                  u.NOMBRE AS usuario_nombre
           FROM devolucion d
           LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
           LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
           LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
           LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
           LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
           LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
           LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
           WHERE d.ID_DEVOLUCION = ? LIMIT 1`;
        [rows] = await pool.query(fallbackDetalle, [id]);
      }
      if (!rows?.length) return Response.json({ error: 'Devolución no encontrada' }, { status: 404 });
      const r = rows[0];
      return Response.json({
        devolucion: {
          id: r.ID_DEVOLUCION,
          cantidad: Number(r.CANTIDAD || 0),
          estado: r.ESTADO,
          motivo: r.MOTIVO,
          producto: {
            id: r.ID_PRODUCT,
            nombre: r.PRODUCT_NAME,
            codigo: r.CODIGO_PRODUCTO,
            unidad_nombre: r.unidad_nombre || null,
            cantidad_por_unidad: Number(r.cantidad_por_unidad || r.CANTIDAD_POR_UNIDAD || 1) || 1,
          },
          factura: { id: r.ID_FACTURA, total: Number(r.factura_total || 0), fecha: r.factura_fecha },
          fecha_devolucion: hasFechaDev ? r.FECHA_DEVOLUCION : null,
          cliente: { nombre: r.cliente_nombre || 'Consumidor Final', telefono: r.cliente_telefono || '' },
          sucursal: r.sucursal_nombre ? { nombre: r.sucursal_nombre, id: r.sucursal_id_real || r.ID_SUCURSAL } : null,
          usuario: r.usuario_nombre ? { nombre: r.usuario_nombre, id: r.ID_USUARIO_DEVOLUCION } : null
        }
      });
    }

    const { getUserSucursalContext } = await import('@/lib/auth/getUserSucursal');
    const { isAdmin, sucursalId } = await getUserSucursalContext(req);
    const sucursalFilterClause = !isAdmin && sucursalId ? 'WHERE d.ID_SUCURSAL = ?' : '';
    const filterParams = !isAdmin && sucursalId ? [sucursalId] : [];

    const selectLista = hasFechaDev ?
      `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_PRODUCT,
        p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
        COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
        COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
        COALESCE(s.NOMBRE_SUCURSAL,
           (SELECT s2.NOMBRE_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.NOMBRE_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_nombre,
        COALESCE(s.ID_SUCURSAL,
           (SELECT s2.ID_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.ID_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_id_real,
        u.NOMBRE AS usuario_nombre
       FROM devolucion d
       LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
       LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
       LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
       LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
       LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
       LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
       LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
        ${sucursalFilterClause}
       ORDER BY d.FECHA_DEVOLUCION DESC, d.ID_DEVOLUCION DESC
       LIMIT 500` :
      `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.ID_SUCURSAL, d.ID_PRODUCT,
        p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
        COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
        COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
        COALESCE(s.NOMBRE_SUCURSAL,
           (SELECT s2.NOMBRE_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.NOMBRE_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_nombre,
        COALESCE(s.ID_SUCURSAL,
           (SELECT s2.ID_SUCURSAL FROM sucursal s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.ID_SUCURSAL FROM sucursal s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_id_real,
        u.NOMBRE AS usuario_nombre
       FROM devolucion d
       LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
       LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
       LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
       LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
       LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
       LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
       LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
        ${sucursalFilterClause}
       ORDER BY f.FECHA DESC, d.ID_DEVOLUCION DESC
       LIMIT 500`;
    let rows;
    try {
      [rows] = await pool.query(selectLista, filterParams);
    } catch (err) {
      const fallbackLista = hasFechaDev ?
        `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_PRODUCT,
                p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
                COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
                COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
                s.NOMBRE_SUCURSAL AS sucursal_nombre,
                s.ID_SUCURSAL AS sucursal_id_real,
                u.NOMBRE AS usuario_nombre
         FROM devolucion d
         LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
         LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
         LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
         LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
         LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
         LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
         LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
          ${sucursalFilterClause}
         ORDER BY d.FECHA_DEVOLUCION DESC, d.ID_DEVOLUCION DESC
         LIMIT 500`
        :
        `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.ID_SUCURSAL, d.ID_PRODUCT,
                p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
                COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
                COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
                s.NOMBRE_SUCURSAL AS sucursal_nombre,
                s.ID_SUCURSAL AS sucursal_id_real,
                u.NOMBRE AS usuario_nombre
         FROM devolucion d
         LEFT JOIN productos p ON p.ID_PRODUCT = d.ID_PRODUCT
         LEFT JOIN factura_detalles fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
         LEFT JOIN factura f ON f.ID_FACTURA = fd.ID_FACTURA
         LEFT JOIN clientes c ON c.ID_CLIENTES = f.ID_CLIENTES
         LEFT JOIN clientes c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
         LEFT JOIN sucursal s ON s.ID_SUCURSAL = d.ID_SUCURSAL
         LEFT JOIN usuarios u ON u.ID = d.ID_USUARIO_DEVOLUCION
          ${sucursalFilterClause}
         ORDER BY f.FECHA DESC, d.ID_DEVOLUCION DESC
         LIMIT 500`;
      [rows] = await pool.query(fallbackLista, filterParams);
    }
    const devoluciones = (rows || []).map(r => ({
      id: r.ID_DEVOLUCION,
      cantidad: Number(r.CANTIDAD || 0),
      estado: r.ESTADO,
      motivo: r.MOTIVO,
      fecha: hasFechaDev ? r.FECHA_DEVOLUCION : r.FECHA,
      producto_nombre: r.PRODUCT_NAME,
      producto_codigo: r.CODIGO_PRODUCTO,
      factura_id: r.ID_FACTURA,
      total_factura: Number(r.TOTAL || 0),
      cliente: r.cliente_nombre || 'Consumidor Final',
      telefono: r.cliente_telefono,
  sucursal: r.sucursal_nombre ? { nombre: r.sucursal_nombre, id: r.sucursal_id_real || r.ID_SUCURSAL } : null,
      usuario: r.usuario_nombre || null
    }));
    return Response.json({ devoluciones });
  } catch (e) {
    return Response.json({ error: e.message || 'Error al obtener devoluciones' }, { status: 500 });
  }
}

// PUT: actualizar motivo / estado
export async function PUT(req) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });
    const body = await req.json();
    const { estado, motivo } = body || {};
    await conn.query('UPDATE devolucion SET ESTADO = COALESCE(?, ESTADO), MOTIVO = COALESCE(?, MOTIVO) WHERE ID_DEVOLUCION = ?', [estado || null, motivo || null, id]);
    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ error: e.message || 'Error al actualizar devolución' }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
  }
}

// DELETE: eliminar devolución (no siempre recomendado)
export async function DELETE(req) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });
    await conn.query('DELETE FROM devolucion WHERE ID_DEVOLUCION = ?', [id]);
    return Response.json({ ok: true, deleted: id });
  } catch (e) {
    return Response.json({ error: e.message || 'Error al eliminar devolución' }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
  }
}
