import pool from '@/lib/db';

export async function GET(req) {
  const tab = req.nextUrl.searchParams.get('tab');
  const sucursal = req.nextUrl.searchParams.get('sucursal');
  try {
    if (tab === 'Resumen') {
      // Resumen detallado: todos los productos, código, sucursal, stock en sucursal, stock en bodega, fisico total, otros campos vacíos
      // Primero, obtener el stock total en sucursales para cada producto
      const [totales] = await pool.query(`
        SELECT ID_PRODUCT, SUM(CANTIDAD) AS TOTAL_SUCURSALES
        FROM STOCK_SUCURSAL
        GROUP BY ID_PRODUCT
      `);
  const totalMap = Object.fromEntries(totales.map(t => [t.ID_PRODUCT, Number(t.TOTAL_SUCURSALES)]));

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
          '' AS DANADOS,
          '' AS RESERVADOS,
          '' AS CRITICOS,
          '' AS AGOTADOS,
          '' AS VALOR_TOTAL
        FROM PRODUCTOS p
        CROSS JOIN SUCURSAL s
        LEFT JOIN STOCK_SUCURSAL st ON st.ID_PRODUCT = p.ID_PRODUCT AND st.ID_SUCURSAL = s.ID_SUCURSAL
        LEFT JOIN SUBCATEGORIAS sc ON sc.ID_SUBCATEGORIAS = p.ID_SUBCATEGORIAS
        ${sucursal && sucursal !== 'Todas' ? 'WHERE s.NOMBRE_SUCURSAL = ?' : ''}
      `, sucursal && sucursal !== 'Todas' ? [sucursal] : []);

      // Agregar fisico_total a cada fila (bodega + total en sucursales)
      const withFisicoTotal = rows.map(row => ({
        ...row,
        FISICO_TOTAL: Number(row.STOCK_BODEGA) + (totalMap[row.ID_PRODUCT] || 0)
      }));
      return Response.json({ resumen: withFisicoTotal });
    }
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
  const { tipo, producto, sucursal, producto_id, sucursal_id, cantidad, motivo, referencia, descripcion } = body;

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
    return Response.json({ ok: false, message: 'Tipo de movimiento no implementado' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
