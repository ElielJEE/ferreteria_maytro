import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  try {
    const tab = req.nextUrl.searchParams.get('tab');
    const sucursal = req.nextUrl.searchParams.get('sucursal');

    // Primero, obtener el stock total en sucursales para cada producto
    const [totales] = await pool.query(`
      SELECT ID_PRODUCT, SUM(CANTIDAD) AS TOTAL_SUCURSALES
      FROM STOCK_SUCURSAL
      GROUP BY ID_PRODUCT
    `);
    const totalMap = Object.fromEntries(totales.map(t => [t.ID_PRODUCT, Number(t.TOTAL_SUCURSALES)]));

    // DANADOS and RESERVADOS ahora se calculan por fila mediante subconsultas correlacionadas

      // Consulta original: cada producto x sucursal (incluye subcategoría si existe)
      // Primero verificar si la columna STATUS existe en STOCK_SUCURSAL (compatibilidad con DB sin migración)
      const [colCheck] = await pool.query(`
        SELECT COUNT(*) AS CNT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_SUCURSAL' AND COLUMN_NAME = 'STATUS'
      `);
      const hasStatus = colCheck && colCheck[0] && Number(colCheck[0].CNT || 0) > 0;

      const statusSelect = hasStatus ? "IFNULL(st.STATUS, 'ACTIVO') AS STATUS" : "'ACTIVO' AS STATUS";

      const [rows] = await pool.query(`
        SELECT 
          p.ID_PRODUCT,
          p.CODIGO_PRODUCTO,
          p.PRODUCT_NAME,
          p.ID_SUBCATEGORIAS,
          sc.NOMBRE_SUBCATEGORIA AS SUBCATEGORY,
          s.ID_SUCURSAL,
          s.NOMBRE_SUCURSAL,
          IFNULL(st.CANTIDAD, 0) AS STOCK_SUCURSAL,
          p.CANTIDAD AS STOCK_BODEGA,
          ${statusSelect},
          (
            SELECT IFNULL(SUM(sd.CANTIDAD), 0)
            FROM STOCK_DANADOS sd
            WHERE sd.ID_PRODUCT = p.ID_PRODUCT AND sd.ID_SUCURSAL = s.ID_SUCURSAL
          ) AS DANADOS,
          (
            SELECT IFNULL(SUM(mi.cantidad), 0)
            FROM MOVIMIENTOS_INVENTARIO mi
            WHERE mi.producto_id = p.ID_PRODUCT AND mi.sucursal_id = s.ID_SUCURSAL AND mi.tipo_movimiento = 'reservado'
          ) AS RESERVADOS,
          '' AS CRITICOS,
          '' AS AGOTADOS,
          '' AS VALOR_TOTAL
        FROM PRODUCTOS p
        CROSS JOIN SUCURSAL s
        LEFT JOIN STOCK_SUCURSAL st ON st.ID_PRODUCT = p.ID_PRODUCT AND st.ID_SUCURSAL = s.ID_SUCURSAL
        LEFT JOIN SUBCATEGORIAS sc ON sc.ID_SUBCATEGORIAS = p.ID_SUBCATEGORIAS
        -- danados and reservados are obtained via correlated subqueries per row
        ${sucursal && sucursal !== 'Todas' ? 'WHERE s.NOMBRE_SUCURSAL = ?' : ''}
      `, sucursal && sucursal !== 'Todas' ? [sucursal] : []);

      // Agregar fisico_total a cada fila (bodega + total en sucursales)
      const withFisicoTotal = rows.map(row => ({
        ...row,
        FISICO_TOTAL: Number(row.STOCK_BODEGA) + (totalMap[row.ID_PRODUCT] || 0)
      }));
      return Response.json({ resumen: withFisicoTotal });
    if (tab === 'Movimientos') {
      // Ejemplo: obtener últimos movimientos (ajustar según tu modelo de movimientos)
      const [rows] = await pool.query(
        `SELECT * FROM NIVELACION ORDER BY ID_NIVELACION DESC LIMIT 50`
      );
      return Response.json({ movimientos: rows });
    }
    if (tab === 'Alertas') {
      // Ejemplo: productos críticos o agotados
      const [rows] = await pool.query(
        `SELECT p.ID_PRODUCT, p.PRODUCT_NAME, st.CANTIDAD, s.NOMBRE_SUCURSAL
         FROM STOCK_SUCURSAL st
         JOIN PRODUCTOS p ON p.ID_PRODUCT = st.ID_PRODUCT
         JOIN SUCURSAL s ON s.ID_SUCURSAL = st.ID_SUCURSAL
         WHERE st.CANTIDAD <= 5`
      );
      return Response.json({ alertas: rows });
    }
    if (tab === 'Dañados') {
      // Ejemplo: productos dañados (ajustar según tu modelo)
      const [rows] = await pool.query(
        `SELECT * FROM NIVELACION WHERE DESCRIPCION LIKE '%dañado%' OR DESCRIPCION LIKE '%deteriorado%'`
      );
      return Response.json({ danados: rows });
    }
    if (tab === 'Reservados') {
      // Ejemplo: productos reservados (ajustar según tu modelo)
      const [rows] = await pool.query(
        `SELECT * FROM NIVELACION WHERE DESCRIPCION LIKE '%reservado%'`
      );
      return Response.json({ reservados: rows });
    }
    return Response.json({ error: 'Parámetro tab inválido' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
  const { tipo, producto, sucursal, producto_id, sucursal_id, cantidad, motivo, referencia, descripcion, tipo_dano, estado_dano } = body;

    if (tipo === 'Entrada (Aumentar Stock)') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Buscar el producto (incluye cantidad en bodega) - preferir ID si se pasa
        let idProduct = producto_id;
        let cantidadBodega = 0;
        if (!idProduct) {
          const [prodRows] = await conn.query('SELECT ID_PRODUCT, CANTIDAD FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
          if (!prodRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
          }
          idProduct = prodRows[0].ID_PRODUCT;
          cantidadBodega = Number(prodRows[0].CANTIDAD || 0);
        } else {
          const [prodRows] = await conn.query('SELECT CANTIDAD FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
          if (!prodRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
          }
          cantidadBodega = Number(prodRows[0].CANTIDAD || 0);
        }

        // Verificar sucursal - preferir ID si se pasa
        let idSucursal = sucursal_id;
        if (!idSucursal) {
          const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
          if (!sucRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Sucursal no encontrada' }, { status: 400 });
          }
          idSucursal = sucRows[0].ID_SUCURSAL;
        } else {
          const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ?', [idSucursal]);
          if (!sucRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Sucursal no encontrada' }, { status: 400 });
          }
        }

        // Verificar que haya suficiente stock en bodega
        if (Number(cantidad) > cantidadBodega) {
          await conn.rollback();
          return Response.json({ error: 'Stock en bodega insuficiente' }, { status: 400 });
        }

        // Restar de bodega
        const nuevaBodega = cantidadBodega - Number(cantidad);
        await conn.query('UPDATE PRODUCTOS SET CANTIDAD = ? WHERE ID_PRODUCT = ?', [nuevaBodega, idProduct]);

        // Actualizar o insertar el stock en STOCK_SUCURSAL
        await conn.query(`
          INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE CANTIDAD = CANTIDAD + VALUES(CANTIDAD)
        `, [idProduct, idSucursal, cantidad]);

        // Actualizar la sucursal asignada al producto (si existe la columna)
        try {
          await conn.query(`UPDATE PRODUCTOS SET ID_SUCURSAL = ? WHERE ID_PRODUCT = ?`, [idSucursal, idProduct]);
        } catch (err) {
          console.warn('No se pudo actualizar PRODUCTOS.ID_SUCURSAL:', err.message);
        }

        // Registrar movimiento en MOVIMIENTOS_INVENTARIO si existe
        const usuario_id = 1; // TODO: obtener usuario real
        try {
          await conn.query(
            `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idProduct, idSucursal, usuario_id, 'entrada', cantidad, motivo || descripcion || '', referencia || null]
          );
        } catch (err) {
          console.warn('No se pudo registrar en MOVIMIENTOS_INVENTARIO:', err.message);
        }

        // Registrar en NIVELACION
        await conn.query(
          `INSERT INTO NIVELACION (CANTIDAD, DESCRIPCION, ID_PRODUCT) VALUES (?, ?, ?)`,
          [cantidad, `${tipo}: ${motivo || descripcion || ''}`, idProduct]
        );

        await conn.commit();
        conn.release();

        return Response.json({ ok: true, nuevaBodega });
      } catch (err) {
        try { await conn.rollback(); } catch (e) {}
        try { conn.release(); } catch (e) {}
        console.error('Error transacción entrada stock:', err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (tipo === 'Salida (Reducir Stock)') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Buscar el producto (necesitamos el ID) - preferir ID si se pasa
        let idProduct = producto_id;
        if (!idProduct) {
          const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
          if (!prodRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
          }
          idProduct = prodRows[0].ID_PRODUCT;
        } else {
          const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
          if (!prodRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
          }
        }

        // Verificar sucursal - preferir ID si se pasa
        let idSucursal = sucursal_id;
        if (!idSucursal) {
          const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
          if (!sucRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Sucursal no encontrada' }, { status: 400 });
          }
          idSucursal = sucRows[0].ID_SUCURSAL;
        } else {
          const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ?', [idSucursal]);
          if (!sucRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Sucursal no encontrada' }, { status: 400 });
          }
        }

        // Verificar que haya suficiente stock en STOCK_SUCURSAL
        const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [idProduct, idSucursal]);
        const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;

        if (Number(cantidad) > cantidadEnSucursal) {
          await conn.rollback();
          return Response.json({ error: 'Stock en sucursal insuficiente' }, { status: 400 });
        }

        // Restar de la sucursal
        const nuevaSucursal = cantidadEnSucursal - Number(cantidad);
        if (stockRows.length) {
          await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevaSucursal, idProduct, idSucursal]);
        } else {
          // Este caso no debería ocurrir por la verificación anterior, pero lo manejamos
          await conn.query('INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [idProduct, idSucursal, 0]);
        }

        // Sumar a bodega (PRODUCTOS.CANTIDAD)
        // Obtener cantidad actual en bodega
        const [prodRows2] = await conn.query('SELECT CANTIDAD FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
        const cantidadBodegaActual = prodRows2.length ? Number(prodRows2[0].CANTIDAD || 0) : 0;
        const nuevaBodega = cantidadBodegaActual + Number(cantidad);
        await conn.query('UPDATE PRODUCTOS SET CANTIDAD = ? WHERE ID_PRODUCT = ?', [nuevaBodega, idProduct]);

        // Registrar movimiento en MOVIMIENTOS_INVENTARIO si existe
        const usuario_id = 1; // TODO: obtener usuario real
        try {
          await conn.query(
            `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idProduct, idSucursal, usuario_id, 'salida', cantidad, motivo || descripcion || '', referencia || null]
          );
        } catch (err) {
          console.warn('No se pudo registrar en MOVIMIENTOS_INVENTARIO:', err.message);
        }

        // Registrar en NIVELACION
        await conn.query(
          `INSERT INTO NIVELACION (CANTIDAD, DESCRIPCION, ID_PRODUCT) VALUES (?, ?, ?)`,
          [cantidad * -1, `${tipo}: ${motivo || descripcion || ''}`, idProduct]
        );

        await conn.commit();
        conn.release();

        return Response.json({ ok: true, nuevaBodega });
      } catch (err) {
        try { await conn.rollback(); } catch (e) {}
        try { conn.release(); } catch (e) {}
        console.error('Error transacción salida stock:', err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Otros tipos de movimiento (puedes agregar lógica similar para Salida, etc.)
    if (tipo === 'Marcar como Dañado') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Resolver producto ID
        let idProduct = producto_id;
        if (!idProduct) {
          const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
          if (!prodRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Producto no encontrado' }, { status: 400 });
          }
          idProduct = prodRows[0].ID_PRODUCT;
        }

        // Resolver sucursal ID
        let idSucursal = sucursal_id;
        if (!idSucursal) {
          const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
          if (!sucRows.length) {
            await conn.rollback();
            return Response.json({ error: 'Sucursal no encontrada' }, { status: 400 });
          }
          idSucursal = sucRows[0].ID_SUCURSAL;
        }

        // Obtener stock actual en sucursal
        const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
        const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;

        if (Number(cantidad) > cantidadEnSucursal) {
          // No hay suficiente stock en sucursal
          await conn.rollback();
          return Response.json({ error: 'Stock en sucursal insuficiente' }, { status: 400 });
        }

        // Restar stock en sucursal
        const nuevaSucursal = cantidadEnSucursal - Number(cantidad);
        await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevaSucursal, idProduct, idSucursal]);

        // Nota: no restamos del stock en bodega cuando se marca como dañado. Solo se afecta STOCK_SUCURSAL.

        // Registrar en NIVELACION (registro histórico negativo)
        await conn.query(
          `INSERT INTO NIVELACION (CANTIDAD, DESCRIPCION, ID_PRODUCT) VALUES (?, ?, ?)`,
          [Number(cantidad) * -1, `${tipo}: ${motivo || descripcion || ''}`, idProduct]
        );

        // Intentar insertar en STOCK_DANADOS de forma segura: detectar columnas existentes
        try {
          // Normalizar posibles variaciones de nombres desde el frontend
          const tipoDanoVal = tipo_dano ?? body.tipoDano ?? body.tipoDanoLabel ?? null;
          // Accept different payload field names; prefer 'estado' then 'estado_dano' variants
          const estadoVal = body.estado ?? estado_dano ?? body.estadoDano ?? body.estado_dano ?? null;
          // Obtener usuario desde JWT en cookies si está presente
          let usuario_id = 1;
          try {
            const token = req.cookies?.get?.('token')?.value ?? null;
            if (token) {
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              // distintos payloads pueden usar id, sub, userId, user_id
              usuario_id = decoded.id ?? decoded.sub ?? decoded.userId ?? decoded.user_id ?? usuario_id;
            }
          } catch (err) {
            // No hay token válido; usar usuario_id del body si se pasó
            usuario_id = body.usuario_id ?? usuario_id;
          }

          // Log breve para ayudar en debugging en entornos de desarrollo
          console.debug('STOCK_DANADOS insert attempt values:', { idProduct, idSucursal, cantidad, descripcion: descripcion || motivo || '', tipoDanoVal, estadoVal });

          // Obtener columnas disponibles en la tabla STOCK_DANADOS
          const [colsRes] = await conn.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS'`
          );
          const available = new Set((colsRes || []).map(r => String(r.COLUMN_NAME).toUpperCase()));

          const insertCols = [];
          const insertPlaceholders = [];
          const insertValues = [];

          const pushCol = (colName, val, useNow = false) => {
            insertCols.push(colName);
            if (useNow) {
              insertPlaceholders.push('NOW()');
            } else {
              insertPlaceholders.push('?');
              insertValues.push(val);
            }
          };

          if (available.has('ID_PRODUCT')) pushCol('ID_PRODUCT', idProduct);
          if (available.has('ID_SUCURSAL')) pushCol('ID_SUCURSAL', idSucursal);
          if (available.has('CANTIDAD')) pushCol('CANTIDAD', cantidad);
          // DESCRIPCION vs MOTIVO: preferimos DESCRIPCION
          if (available.has('DESCRIPCION')) pushCol('DESCRIPCION', descripcion || motivo || '');
          // Campos opcionales añadidos por la migración. Insertarlos solo si existen
          if (available.has('TIPO_DANO')) pushCol('TIPO_DANO', tipoDanoVal);
          // Priorizar columna 'ESTADO' (según tu captura). Si no existe, usar ESTADO_DANO si está disponible.
          if (available.has('ESTADO')) {
            pushCol('ESTADO', estadoVal);
          } else if (available.has('ESTADO_DANO')) {
            pushCol('ESTADO_DANO', estadoVal);
          }
          // Incluir USUARIO_ID y REFERENCIA si existen
          if (available.has('USUARIO_ID')) pushCol('USUARIO_ID', usuario_id);
          if (available.has('REFERENCIA')) pushCol('REFERENCIA', referencia || null);
          // Usar CREATED_AT si existe, con NOW()
          if (available.has('CREATED_AT')) pushCol('CREATED_AT', null, true);

          if (insertCols.length) {
            const insertSql = `INSERT INTO STOCK_DANADOS (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
            await conn.query(insertSql, insertValues);
          } else {
            console.warn('STOCK_DANADOS exists but no known insertable columns found; skipping insert');
          }
        } catch (err) {
          console.warn('STOCK_DANADOS insert skipped or failed (non-fatal):', err.message);
        }

        await conn.commit();
        conn.release();

        return Response.json({ ok: true, nuevaSucursal });
      } catch (err) {
        try { await conn.rollback(); } catch (e) {}
        try { conn.release(); } catch (e) {}
        console.error('Error transacción marcado como dañado:', err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    return Response.json({ ok: false, message: 'Tipo de movimiento no implementado' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
