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

// Util: resolver un ID de sucursal válido, según exista en la tabla SUCURSAL, tolerando formatos 'S1' o '1'
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
      const [r] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ? LIMIT 1', [f]);
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

    // Detectar columnas opcionales para compatibilidad con esquemas antiguos
    const devCols = await detectColumns(conn, 'DEVOLUCION', [
      'FECHA_DEVOLUCION','ID_SUCURSAL','ID_CLIENTES','ID_USUARIO_DEVOLUCION','MOTIVO','ESTADO','CANTIDAD','ID_DETALLES_FACTURA','ID_PRODUCT','ID_DEVOLUCION'
    ]);

    await conn.beginTransaction();

    // Validar que la cantidad solicitada no exceda lo vendido en el detalle (acumulado)
    // Además obtener el detalle de factura (FOR UPDATE) para leer CANTIDAD_POR_UNIDAD cuando exista
    let detalleRow = null;
    if (detalle_id) {
      const [dRows] = await conn.query(
        `SELECT ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT,
                COALESCE(CANTIDAD_POR_UNIDAD, 1) AS CANTIDAD_POR_UNIDAD,
                UNIDAD_ID, UNIDAD_NOMBRE
           FROM FACTURA_DETALLES
          WHERE ID_DETALLES_FACTURA = ?
          LIMIT 1 FOR UPDATE`,
        [detalle_id]
      );
      if (!dRows?.length) return Response.json({ error: 'Detalle de factura no encontrado' }, { status: 404 });
      detalleRow = dRows[0];
      const cantVendida = Math.max(0, Number(detalleRow.AMOUNT || 0));
      const [sumRows] = await conn.query('SELECT COALESCE(SUM(CANTIDAD),0) AS sum_dev FROM DEVOLUCION WHERE ID_DETALLES_FACTURA = ?', [detalle_id]);
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
        const [frows] = await conn.query('SELECT ID_SUCURSAL, ID_CLIENTES FROM FACTURA WHERE ID_FACTURA = ? LIMIT 1', [detalleRow.ID_FACTURA]);
        if (frows?.length) {
          facturaSucursal = frows[0].ID_SUCURSAL || null;
          sucursalId = sucursalId || facturaSucursal || null;
          clienteId = frows[0].ID_CLIENTES || null;
        }
      } catch {}
    }
    // Fallback: última sucursal con movimiento para este producto
    let lastMovSucursal = null;
    if (!sucursalId) {
      const [mov] = await conn.query('SELECT sucursal_id FROM MOVIMIENTOS_INVENTARIO WHERE producto_id = ? ORDER BY id DESC LIMIT 1', [producto_id]);
      if (mov?.length) lastMovSucursal = mov[0].sucursal_id;
    }

    // Resolver sucursal válida existente en SUCURSAL
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
    const devSucursalId   = await coerceSucursalFor(conn, 'DEVOLUCION', 'ID_SUCURSAL', resolvedSucursalId);
    const stockSucursalId = await coerceSucursalFor(conn, 'STOCK_SUCURSAL', 'ID_SUCURSAL', resolvedSucursalId);
    const movSucursalId   = await coerceSucursalFor(conn, 'MOVIMIENTOS_INVENTARIO', 'sucursal_id', resolvedSucursalId);

    // Actualizar stock o registrar daños según estado de producto
    if (devCols.ID_SUCURSAL && stockSucursalId != null) {
      const isDaniado = (estado || '').toString().toUpperCase() === 'DANIADO';

      // Determinar factor CANTIDAD_POR_UNIDAD: preferir el almacenado en FACTURA_DETALLES si existe,
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
        const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [producto_id, stockSucursalId]);
        const anterior = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
        const nuevo = anterior + cantidadReal;
        if (stockRows.length) {
          await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevo, producto_id, stockSucursalId]);
        } else {
          await conn.query('INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [producto_id, stockSucursalId, nuevo]);
        }
        try {
          await conn.query(
            `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'entrada', ?, ?, ?, ?, ?)`,
            [producto_id, movSucursalId, usuarioId || null, cantidadReal, 'Devolución', factura_id || null, anterior, nuevo]
          );
        } catch {}
      } else {
        // Dañado: no se suma al stock vendible. Registrar movimiento como 'danado' y guardar en STOCK_DANADOS.
        try {
          await conn.query(
            `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'danado', ?, ?, ?, NULL, NULL)`,
            [producto_id, movSucursalId, usuarioId || null, cantidadReal, 'Devolución dañada', factura_id || null]
          );
        } catch {}
        // Insertar registro en STOCK_DANADOS si existe la tabla/columnas (tolerante)
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
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS'`
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
            if (available.has('TIPO_DANO')) push('TIPO_DANO', 'devolucion');
            if (available.has('USUARIO_ID')) push('USUARIO_ID', usuarioId || null);
            if (available.has('REFERENCIA')) push('REFERENCIA', factura_id || null);
            if (available.has('PERDIDA')) push('PERDIDA', perdida);
            if (available.has('CREATED_AT')) push('CREATED_AT', null, true);
            if (cols.length) {
              const sql = `INSERT INTO STOCK_DANADOS (${cols.join(', ')}) VALUES (${ph.join(', ')})`;
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
    const maxLen = await getColumnMaxLength(conn, 'DEVOLUCION', 'ID_DEVOLUCION');
    let candidate = fitWithSuffix(base, maxLen || 24);
    // Verificar colisión y ajustar si existe
    let [exists] = await conn.query('SELECT 1 FROM DEVOLUCION WHERE ID_DEVOLUCION = ? LIMIT 1', [candidate]);
    if (exists.length) {
      const rand = Math.floor(Math.random()*100).toString().padStart(2,'0');
      candidate = fitWithSuffix(base, maxLen || 24, rand);
      [exists] = await conn.query('SELECT 1 FROM DEVOLUCION WHERE ID_DEVOLUCION = ? LIMIT 1', [candidate]);
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
  const sqlInsert = `INSERT INTO DEVOLUCION (${insertCols.join(',')}) VALUES (${placeholders})`;
  await conn.query(sqlInsert, values);

  // Si se envía reemplazo, actualizar detalles de factura y stock del producto nuevo
    if (reemplazo && (reemplazo.producto_id || reemplazo.productoId)) {
      const nuevoProdId = Number(reemplazo.producto_id || reemplazo.productoId);
      const qtyReemp = Number(reemplazo.cantidad || cantidad);
      if (!nuevoProdId || qtyReemp <= 0) {
        await conn.rollback();
        return Response.json({ error: 'Datos de reemplazo inválidos' }, { status: 400 });
      }

      // 1) Actualizar detalle original: reducir cantidad o eliminar
      if (detalle_id) {
        const [dRows] = await conn.query('SELECT ID_FACTURA, ID_PRODUCT, AMOUNT, PRECIO_UNIT FROM FACTURA_DETALLES WHERE ID_DETALLES_FACTURA = ? FOR UPDATE', [detalle_id]);
        if (dRows?.length) {
          const det = dRows[0];
          const nuevaCantidad = Math.max(0, Number(det.AMOUNT || 0) - Number(cantidad));
          if (nuevaCantidad === 0) {
            await conn.query('DELETE FROM FACTURA_DETALLES WHERE ID_DETALLES_FACTURA = ?', [detalle_id]);
          } else {
            const nuevoSub = Number((nuevaCantidad * Number(det.PRECIO_UNIT || 0)).toFixed(2));
            await conn.query('UPDATE FACTURA_DETALLES SET AMOUNT = ?, SUB_TOTAL = ? WHERE ID_DETALLES_FACTURA = ?', [nuevaCantidad, nuevoSub, detalle_id]);
          }
        }
      }

      // 2) Insertar nuevo detalle para el producto de reemplazo con su precio
      let facId = factura_id;
      if (!facId && detalle_id) {
        const [d] = await conn.query('SELECT ID_FACTURA FROM FACTURA_DETALLES WHERE ID_DETALLES_FACTURA = ? LIMIT 1', [detalle_id]);
        if (d?.length) facId = d[0].ID_FACTURA;
      }
      const [ppn] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [nuevoProdId]);
      let precioNuevo = 0;
      if (ppn?.length) precioNuevo = Number(ppn[0].PRECIO || 0);
      else {
        const [ppn2] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? LIMIT 1', [nuevoProdId]);
        if (ppn2?.length) precioNuevo = Number(ppn2[0].PRECIO || 0);
      }
      const subNuevo = Number((precioNuevo * qtyReemp).toFixed(2));
      if (facId) {
        // Detectar si FACTURA_DETALLES tiene columnas de unidad para propagar metadata
        const fdCols = await detectColumns(conn, 'FACTURA_DETALLES', ['UNIDAD_ID','CANTIDAD_POR_UNIDAD','UNIDAD_NOMBRE']);
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

          if (fdCols.UNIDAD_ID) { insCols.push('UNIDAD_ID'); insVals.push(unidadIdUse); }
          if (fdCols.CANTIDAD_POR_UNIDAD) { insCols.push('CANTIDAD_POR_UNIDAD'); insVals.push(cantidadPorUnidadUse != null ? cantidadPorUnidadUse : 1); }
          if (fdCols.UNIDAD_NOMBRE) { insCols.push('UNIDAD_NOMBRE'); insVals.push(unidadNombreUse); }
        }

        const placeholders = insCols.map(()=>'?').join(',');
        const sql = `INSERT INTO FACTURA_DETALLES (${insCols.join(',')}) VALUES (${placeholders})`;
        await conn.query(sql, insVals);
      }

      // 3) Descontar stock para el producto de reemplazo (salida)
      if (devCols.ID_SUCURSAL && stockSucursalId != null) {
        // Si el nuevo detalle incluye cantidad_por_unidad tomada del detalle devuelto, usarla para descontar stock real
        let replacementFactor = 1;
        try {
          // Buscar en FACTURA_DETALLES recién insertado (último insert id) la CANTIDAD_POR_UNIDAD si existe
          // pero preferir la metadata copiada desde detalleRow si estaba presente
          if (detalleRow && detalleRow.CANTIDAD_POR_UNIDAD != null) replacementFactor = Number(detalleRow.CANTIDAD_POR_UNIDAD || 1) || 1;
          else {
            const [puDef2] = await conn.query('SELECT CANTIDAD_POR_UNIDAD FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [nuevoProdId]);
            if (puDef2?.length) replacementFactor = Number(puDef2[0].CANTIDAD_POR_UNIDAD || 1) || 1;
          }
        } catch {}

        const realQtyReemp = Number(qtyReemp || 0) * Number(replacementFactor || 1);
        const [stock2] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [nuevoProdId, stockSucursalId]);
        const ant = stock2.length ? Number(stock2[0].CANTIDAD || 0) : 0;
        if (realQtyReemp > ant) {
          await conn.rollback();
          return Response.json({ error: 'Stock insuficiente para producto de reemplazo' }, { status: 400 });
        }
        const neu = ant - realQtyReemp;
        await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [neu, nuevoProdId, stockSucursalId]);
        try {
          await conn.query(
            `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, 'salida', ?, ?, ?, ?, ?)`,
            [nuevoProdId, movSucursalId, usuarioId || null, realQtyReemp, 'Reemplazo devolución', facId || null, ant, neu]
          );
        } catch {}
      }

      // 4) Recalcular totales de la factura
      if (facId) {
        const [[sumRow]] = await conn.query('SELECT COALESCE(SUM(SUB_TOTAL),0) AS SUBT FROM FACTURA_DETALLES WHERE ID_FACTURA = ?', [facId]);
        const nuevoSubtotal = Number(sumRow?.SUBT || 0);
        const [[descRow]] = await conn.query('SELECT DESCUENTO FROM FACTURA WHERE ID_FACTURA = ?', [facId]);
        const desc = Number(descRow?.DESCUENTO || 0);
        const nuevoTotal = Math.max(0, Number((nuevoSubtotal - desc).toFixed(2)));
        await conn.query('UPDATE FACTURA SET SUBTOTAL = ?, TOTAL = ? WHERE ID_FACTURA = ?', [nuevoSubtotal, nuevoTotal, facId]);
      }
    } else if (detalle_id) {
      // No hay reemplazo: reducir cantidad del detalle original y recalcular totales
      const [dRows] = await conn.query('SELECT ID_FACTURA, AMOUNT, PRECIO_UNIT FROM FACTURA_DETALLES WHERE ID_DETALLES_FACTURA = ? FOR UPDATE', [detalle_id]);
      if (dRows?.length) {
        const det = dRows[0];
        const nuevaCantidad = Math.max(0, Number(det.AMOUNT || 0) - Number(cantidad));
        const facId = dRows[0].ID_FACTURA;
        if (nuevaCantidad === 0) {
          await conn.query('DELETE FROM FACTURA_DETALLES WHERE ID_DETALLES_FACTURA = ?', [detalle_id]);
        } else {
          const nuevoSub = Number((nuevaCantidad * Number(det.PRECIO_UNIT || 0)).toFixed(2));
          await conn.query('UPDATE FACTURA_DETALLES SET AMOUNT = ?, SUB_TOTAL = ? WHERE ID_DETALLES_FACTURA = ?', [nuevaCantidad, nuevoSub, detalle_id]);
        }
        // Recalcular totales de la factura
        if (facId) {
          const [[sumRow]] = await conn.query('SELECT COALESCE(SUM(SUB_TOTAL),0) AS SUBT FROM FACTURA_DETALLES WHERE ID_FACTURA = ?', [facId]);
          const nuevoSubtotal = Number(sumRow?.SUBT || 0);
          const [[descRow]] = await conn.query('SELECT DESCUENTO FROM FACTURA WHERE ID_FACTURA = ?', [facId]);
          const desc = Number(descRow?.DESCUENTO || 0);
          const nuevoTotal = Math.max(0, Number((nuevoSubtotal - desc).toFixed(2)));
          await conn.query('UPDATE FACTURA SET SUBTOTAL = ?, TOTAL = ? WHERE ID_FACTURA = ?', [nuevoSubtotal, nuevoTotal, facId]);
        }
      }
    }

    await conn.commit();
  return Response.json({ ok: true, devolucion_id: devId });
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
      const [colRows] = await pool.query(`SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='DEVOLUCION' AND COLUMN_NAME='FECHA_DEVOLUCION'`);
      hasFechaDev = (colRows?.[0]?.CNT || 0) > 0;
    } catch { hasFechaDev = false; }

    // Detectar si FACTURA_DETALLES tiene columnas de unidad (para devolver metadata de unidad)
    let hasFacturaDetallesUnidad = false;
    try {
      const [fdCols] = await pool.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FACTURA_DETALLES'`);
      const presentFd = new Set((fdCols || []).map(r => String(r.COLUMN_NAME)));
      hasFacturaDetallesUnidad = presentFd.has('UNIDAD_ID') || presentFd.has('CANTIDAD_POR_UNIDAD') || presentFd.has('UNIDAD_NOMBRE');
    } catch { hasFacturaDetallesUnidad = false; }

   if (id) {
    // construir selectDetalle incluyendo posibles columnas de unidad en FACTURA_DETALLES
    const extraFdSelect = hasFacturaDetallesUnidad ? 'fd.UNIDAD_ID AS unidad_id, fd.CANTIDAD_POR_UNIDAD AS cantidad_por_unidad, fd.UNIDAD_NOMBRE AS unidad_nombre,' : '';
    const selectDetalle = hasFechaDev ?
  `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_DETALLES_FACTURA, d.ID_PRODUCT,
   d.ID_USUARIO_DEVOLUCION, p.PRODUCT_NAME, p.CODIGO_PRODUCTO,
   ${extraFdSelect}
   fd.ID_FACTURA, f.TOTAL AS factura_total, f.FECHA AS factura_fecha,
   COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
   COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
   COALESCE(s.NOMBRE_SUCURSAL,
     (SELECT s2.NOMBRE_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.NOMBRE_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_nombre,
   COALESCE(s.ID_SUCURSAL,
     (SELECT s2.ID_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.ID_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_id_real,
   u.NOMBRE AS usuario_nombre
  FROM DEVOLUCION d
  LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
  LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
  LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
  LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
  LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
  LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
  LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
  WHERE d.ID_DEVOLUCION = ? LIMIT 1` :
  `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.ID_SUCURSAL, d.ID_DETALLES_FACTURA, d.ID_PRODUCT,
   d.ID_USUARIO_DEVOLUCION, p.PRODUCT_NAME, p.CODIGO_PRODUCTO,
   ${extraFdSelect}
   fd.ID_FACTURA, f.TOTAL AS factura_total, f.FECHA AS factura_fecha,
   COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
   COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
   COALESCE(s.NOMBRE_SUCURSAL,
     (SELECT s2.NOMBRE_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.NOMBRE_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_nombre,
   COALESCE(s.ID_SUCURSAL,
     (SELECT s2.ID_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
     (SELECT s3.ID_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
   ) AS sucursal_id_real,
   u.NOMBRE AS usuario_nombre
  FROM DEVOLUCION d
  LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
  LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
  LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
  LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
  LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
  LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
  LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
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
           FROM DEVOLUCION d
           LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
           LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
           LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
           LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
           LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
           LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
           LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
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
           FROM DEVOLUCION d
           LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
           LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
           LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
           LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
           LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
           LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
           LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
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

    const selectLista = hasFechaDev ?
      `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_PRODUCT,
        p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
        COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
        COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
        COALESCE(s.NOMBRE_SUCURSAL,
           (SELECT s2.NOMBRE_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.NOMBRE_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_nombre,
        COALESCE(s.ID_SUCURSAL,
           (SELECT s2.ID_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.ID_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_id_real,
        u.NOMBRE AS usuario_nombre
       FROM DEVOLUCION d
       LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
       LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
       LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
       LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
       LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
       LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
       LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
       ORDER BY d.FECHA_DEVOLUCION DESC, d.ID_DEVOLUCION DESC
       LIMIT 500` :
      `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.ID_SUCURSAL, d.ID_PRODUCT,
        p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
        COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
        COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
        COALESCE(s.NOMBRE_SUCURSAL,
           (SELECT s2.NOMBRE_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.NOMBRE_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_nombre,
        COALESCE(s.ID_SUCURSAL,
           (SELECT s2.ID_SUCURSAL FROM SUCURSAL s2 WHERE REPLACE(s2.ID_SUCURSAL,'S','') = d.ID_SUCURSAL LIMIT 1),
           (SELECT s3.ID_SUCURSAL FROM SUCURSAL s3 WHERE s3.ID_SUCURSAL = CONCAT('S', d.ID_SUCURSAL) LIMIT 1)
        ) AS sucursal_id_real,
        u.NOMBRE AS usuario_nombre
       FROM DEVOLUCION d
       LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
       LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
       LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
       LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
       LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
       LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
       LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
       ORDER BY f.FECHA DESC, d.ID_DEVOLUCION DESC
       LIMIT 500`;
    let rows;
    try {
      [rows] = await pool.query(selectLista);
    } catch (err) {
      const fallbackLista = hasFechaDev ?
        `SELECT d.ID_DEVOLUCION, d.CANTIDAD, d.ESTADO, d.MOTIVO, d.FECHA_DEVOLUCION, d.ID_SUCURSAL, d.ID_PRODUCT,
                p.PRODUCT_NAME, p.CODIGO_PRODUCTO, fd.ID_FACTURA, f.FECHA, f.TOTAL,
                COALESCE(c2.NOMBRE_CLIENTE, c.NOMBRE_CLIENTE) AS cliente_nombre,
                COALESCE(c2.TELEFONO_CLIENTE, c.TELEFONO_CLIENTE) AS cliente_telefono,
                s.NOMBRE_SUCURSAL AS sucursal_nombre,
                s.ID_SUCURSAL AS sucursal_id_real,
                u.NOMBRE AS usuario_nombre
         FROM DEVOLUCION d
         LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
         LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
         LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
         LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
         LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
         LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
         LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
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
         FROM DEVOLUCION d
         LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = d.ID_PRODUCT
         LEFT JOIN FACTURA_DETALLES fd ON fd.ID_DETALLES_FACTURA = d.ID_DETALLES_FACTURA
         LEFT JOIN FACTURA f ON f.ID_FACTURA = fd.ID_FACTURA
         LEFT JOIN CLIENTES c ON c.ID_CLIENTES = f.ID_CLIENTES
         LEFT JOIN CLIENTES c2 ON c2.ID_CLIENTES = d.ID_CLIENTES
         LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = d.ID_SUCURSAL
         LEFT JOIN USUARIOS u ON u.ID = d.ID_USUARIO_DEVOLUCION
         ORDER BY f.FECHA DESC, d.ID_DEVOLUCION DESC
         LIMIT 500`;
      [rows] = await pool.query(fallbackLista);
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
    await conn.query('UPDATE DEVOLUCION SET ESTADO = COALESCE(?, ESTADO), MOTIVO = COALESCE(?, MOTIVO) WHERE ID_DEVOLUCION = ?', [estado || null, motivo || null, id]);
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
    await conn.query('DELETE FROM DEVOLUCION WHERE ID_DEVOLUCION = ?', [id]);
    return Response.json({ ok: true, deleted: id });
  } catch (e) {
    return Response.json({ error: e.message || 'Error al eliminar devolución' }, { status: 400 });
  } finally {
    try { conn.release(); } catch {}
  }
}
