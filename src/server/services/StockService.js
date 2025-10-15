import pool from '@/lib/db';

// Utilities
const mapTipoMovimiento = (label) => {
  const t = (label || '').toString().toLowerCase();
  if (/entrada/.test(t)) return 'entrada';
  if (/salid/.test(t)) return 'salida';
  if (/(da[nñ]ad|dañado|danado)/.test(t)) return 'danado';
  if (/reserv/.test(t)) return 'reservado';
  if (/transfer/.test(t)) return 'transferencia';
  return null;
};

const getAllowedTipoMovimiento = async (conn) => {
  const [rows] = await conn.query(`
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MOVIMIENTOS_INVENTARIO' AND COLUMN_NAME = 'tipo_movimiento'
  `);
  const ct = rows?.[0]?.COLUMN_TYPE || '';
  const matches = ct.match(/'([^']+)'/g);
  return matches ? matches.map(m => m.replace(/'/g, '')) : [];
};

const chooseTipo = (allowed, requested, fallback) => {
  if (allowed.includes(requested)) return requested;
  if (allowed.includes(fallback)) return fallback;
  return allowed[0] || fallback || requested || 'entrada';
};

// Ensure RESERVAS table and optional client column
const ensureReservasTable = async (connOrPool) => {
  await connOrPool.query(`
    CREATE TABLE IF NOT EXISTS RESERVAS (
      ID_RESERVA INT AUTO_INCREMENT PRIMARY KEY,
      ID_PRODUCT INT NOT NULL,
      ID_SUCURSAL VARCHAR(10) NOT NULL,
      ID_CLIENTES INT NULL,
      RESERVADO_POR INT NULL,
      CANTIDAD INT NOT NULL,
      FECHA_RESERVA DATE NOT NULL,
      FECHA_ENTREGA DATE NULL,
      ESTADO ENUM('pendiente','parcial','completada','cancelada') NOT NULL DEFAULT 'pendiente',
      TELEFONO_CONTACTO VARCHAR(20) NULL,
      NOTAS VARCHAR(255) NULL,
      CREATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UPDATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_res_prod (ID_PRODUCT),
      INDEX idx_res_suc (ID_SUCURSAL),
      INDEX idx_res_cli (ID_CLIENTES),
      INDEX idx_res_estado (ESTADO),
      CONSTRAINT fk_res_product  FOREIGN KEY (ID_PRODUCT) REFERENCES PRODUCTOS(ID_PRODUCT) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_res_sucursal FOREIGN KEY (ID_SUCURSAL) REFERENCES SUCURSAL(ID_SUCURSAL) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_res_cliente FOREIGN KEY (ID_CLIENTES) REFERENCES CLIENTES(ID_CLIENTES) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_res_user     FOREIGN KEY (RESERVADO_POR) REFERENCES USUARIOS(ID) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  const [cliCol] = await connOrPool.query(`
    SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'RESERVAS' AND COLUMN_NAME = 'ID_CLIENTES'
  `);
  if (!cliCol?.[0] || Number(cliCol[0].CNT || 0) === 0) {
    try { await connOrPool.query(`ALTER TABLE RESERVAS ADD COLUMN ID_CLIENTES INT NULL`); } catch {}
  }
};

export const StockService = {
  async getMovimientos({ sucursal }) {
    const where = (sucursal && sucursal !== 'Todas') ? 'WHERE s.NOMBRE_SUCURSAL = ?' : '';
    const params = (sucursal && sucursal !== 'Todas') ? [sucursal] : [];
    const [rows] = await pool.query(`
      SELECT
        mi.id,
        DATE_FORMAT(mi.fecha, '%Y-%m-%d') AS fecha,
        DATE_FORMAT(mi.fecha, '%H:%i') AS hora,
        mi.tipo_movimiento AS tipo,
        s.NOMBRE_SUCURSAL AS sucursal,
        p.PRODUCT_NAME AS producto_nombre,
        p.CODIGO_PRODUCTO AS producto_codigo,
        mi.cantidad,
        mi.stock_anterior,
        mi.stock_nuevo,
        mi.motivo,
        COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS usuario,
        mi.referencia_id AS referencia
      FROM MOVIMIENTOS_INVENTARIO mi
      LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = mi.producto_id
      LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = mi.sucursal_id
      LEFT JOIN USUARIOS u ON u.ID = mi.usuario_id
      ${where}
      ORDER BY mi.fecha DESC
      LIMIT 500
    `, params);
    return rows;
  },

  async getResumen({ sucursal }) {
    const [totales] = await pool.query(`
      SELECT ID_PRODUCT, SUM(CANTIDAD) AS TOTAL_SUCURSALES
      FROM STOCK_SUCURSAL GROUP BY ID_PRODUCT
    `);
    const totalMap = Object.fromEntries(totales.map(t => [t.ID_PRODUCT, Number(t.TOTAL_SUCURSALES)]));
    const [colCheck] = await pool.query(`
      SELECT COUNT(*) AS CNT FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_SUCURSAL' AND COLUMN_NAME = 'STATUS'
    `);
    const hasStatus = colCheck?.[0] && Number(colCheck[0].CNT || 0) > 0;
    const statusSelect = hasStatus ? "IFNULL(st.STATUS, 'ACTIVO') AS STATUS" : "'ACTIVO' AS STATUS";
    const where = (sucursal && sucursal !== 'Todas') ? 'WHERE s.NOMBRE_SUCURSAL = ?' : '';
    const params = (sucursal && sucursal !== 'Todas') ? [sucursal] : [];
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
          SELECT IFNULL(SUM(sd.CANTIDAD), 0) FROM STOCK_DANADOS sd
          WHERE sd.ID_PRODUCT = p.ID_PRODUCT AND sd.ID_SUCURSAL = s.ID_SUCURSAL
        ) AS DANADOS,
        (
          SELECT IFNULL(SUM(mi.cantidad), 0) FROM MOVIMIENTOS_INVENTARIO mi
          WHERE mi.producto_id = p.ID_PRODUCT AND mi.sucursal_id = s.ID_SUCURSAL AND mi.tipo_movimiento = 'reservado'
        ) AS RESERVADOS,
        '' AS CRITICOS,
        '' AS AGOTADOS,
        '' AS VALOR_TOTAL
      FROM PRODUCTOS p
      CROSS JOIN SUCURSAL s
      LEFT JOIN STOCK_SUCURSAL st ON st.ID_PRODUCT = p.ID_PRODUCT AND st.ID_SUCURSAL = s.ID_SUCURSAL
      LEFT JOIN SUBCATEGORIAS sc ON sc.ID_SUBCATEGORIAS = p.ID_SUBCATEGORIAS
      ${where}
    `, params);
    return rows.map(r => ({ ...r, FISICO_TOTAL: Number(r.STOCK_BODEGA) + (totalMap[r.ID_PRODUCT] || 0) }));
  },

  async getDanados({ sucursal }) {
    const params = [];
    const whereSucursal = (sucursal && sucursal !== 'Todas') ? `WHERE s.NOMBRE_SUCURSAL = ?` : '';
    if (whereSucursal) params.push(sucursal);
    const [rows] = await pool.query(
      `SELECT
         sd.ID_DANADO AS id,
         p.CODIGO_PRODUCTO AS codigo,
         p.PRODUCT_NAME AS producto,
         s.NOMBRE_SUCURSAL AS sucursal,
         sd.CANTIDAD AS cantidad,
         sd.TIPO_DANO AS tipo_dano,
         DATE_FORMAT(sd.CREATED_AT, '%Y-%m-%d') AS fecha,
         COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS reportado_por,
         sd.PERDIDA AS perdida,
         sd.ESTADO AS estado,
         sd.DESCRIPCION AS descripcion
       FROM STOCK_DANADOS sd
       LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = sd.ID_PRODUCT
       LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = sd.ID_SUCURSAL
       LEFT JOIN USUARIOS u ON u.ID = sd.USUARIO_ID
       ${whereSucursal}
       ORDER BY sd.CREATED_AT DESC
       LIMIT 2000`,
      params
    );
    const [aggRows] = await pool.query(
      `SELECT COUNT(*) AS registros, IFNULL(SUM(sd.CANTIDAD), 0) AS cantidad_total, IFNULL(SUM(sd.PERDIDA), 0) AS perdida_total
       FROM STOCK_DANADOS sd LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = sd.ID_SUCURSAL ${whereSucursal}`,
      params
    );
    const summary = aggRows?.[0] ? {
      registros: Number(aggRows[0].registros || 0),
      cantidad_total: Number(aggRows[0].cantidad_total || 0),
      perdida_total: Number(aggRows[0].perdida_total || 0)
    } : { registros: 0, cantidad_total: 0, perdida_total: 0 };
    return { rows, summary };
  },

  async getReservados({ sucursal }) {
    const params = [];
    const whereSucursal = (sucursal && sucursal !== 'Todas') ? `WHERE s.NOMBRE_SUCURSAL = ?` : '';
    if (whereSucursal) params.push(sucursal);
    await ensureReservasTable(pool);
    const [rows] = await pool.query(
      `SELECT
         r.ID_RESERVA AS id,
         p.CODIGO_PRODUCTO AS codigo,
         p.PRODUCT_NAME AS producto,
         s.NOMBRE_SUCURSAL AS sucursal,
         r.CANTIDAD AS cantidad,
         DATE_FORMAT(r.FECHA_RESERVA, '%Y-%m-%d') AS fecha_reserva,
         DATE_FORMAT(r.FECHA_ENTREGA, '%Y-%m-%d') AS fecha_entrega,
         r.ESTADO AS estado,
         COALESCE(u.NOMBRE, u.NOMBRE_USUARIO, '') AS reservado_por,
         COALESCE(r.TELEFONO_CONTACTO, c.TELEFONO_CLIENTE) AS telefono,
         c.NOMBRE_CLIENTE AS cliente_nombre,
         c.ID_CLIENTES AS cliente_id,
         r.NOTAS AS notas
       FROM RESERVAS r
       JOIN PRODUCTOS p ON p.ID_PRODUCT = r.ID_PRODUCT
       JOIN SUCURSAL s ON s.ID_SUCURSAL = r.ID_SUCURSAL
       LEFT JOIN USUARIOS u ON u.ID = r.RESERVADO_POR
       LEFT JOIN CLIENTES c ON c.ID_CLIENTES = r.ID_CLIENTES
       ${whereSucursal}
       ORDER BY r.FECHA_RESERVA DESC, r.ID_RESERVA DESC
       LIMIT 1000`, params);
    return rows;
  },

  async reservar({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, cliente, telefono, fecha_entrega, notas }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await ensureReservasTable(conn);
      // Producto
      let idProduct = producto_id;
      if (!idProduct) {
        const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
        idProduct = prodRows[0].ID_PRODUCT;
      } else {
        const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
      }
      // Sucursal
      let idSucursal = sucursal_id;
      if (!idSucursal) {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
        idSucursal = sucRows[0].ID_SUCURSAL;
      } else {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ?', [idSucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
      }
      // Stock sucursal
      const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      if (Number(cantidad) <= 0) throw new Error('Cantidad inválida');
      if (Number(cantidad) > cantidadEnSucursal) throw new Error('Stock en sucursal insuficiente');
      const stockAnterior = cantidadEnSucursal;
      const stockNuevo = cantidadEnSucursal - Number(cantidad);
      await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProduct, idSucursal]);

      // Cliente (upsert simple por nombre exacto o teléfono)
      let idCliente = null;
      const nombreCliente = (cliente || '').toString().trim();
      const tel = (telefono || '').toString().trim() || null;
      if (nombreCliente || tel) {
        const clauses = []; const values = [];
        if (nombreCliente) { clauses.push('NOMBRE_CLIENTE = ?'); values.push(nombreCliente); }
        if (tel) { clauses.push('TELEFONO_CLIENTE = ?'); values.push(tel); }
        const [cliRows] = await conn.query(`SELECT ID_CLIENTES FROM CLIENTES WHERE ${clauses.join(' OR ')} LIMIT 1`, values);
        if (cliRows?.length) {
          idCliente = cliRows[0].ID_CLIENTES;
        } else if (nombreCliente) {
          const [ins] = await conn.query(`INSERT INTO CLIENTES (NOMBRE_CLIENTE, DIRECCION_CLIENTE, TELEFONO_CLIENTE) VALUES (?, '', ?)`, [nombreCliente, tel]);
          idCliente = ins.insertId || null;
        }
      }

      // Insert reserva
      const fechaReserva = new Date();
      const fechaEntrega = fecha_entrega ? new Date(fecha_entrega) : null;
      await conn.query(
        `INSERT INTO RESERVAS (ID_PRODUCT, ID_SUCURSAL, ID_CLIENTES, RESERVADO_POR, CANTIDAD, FECHA_RESERVA, FECHA_ENTREGA, ESTADO, TELEFONO_CONTACTO, NOTAS)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`,
        [idProduct, idSucursal, idCliente, usuario_id ?? null, Number(cantidad), fechaReserva, fechaEntrega, tel, (notas || null)]
      );

      // Movimiento inventario
      try {
        const allowed = await getAllowedTipoMovimiento(conn);
        const tipoMov = chooseTipo(allowed, 'reservado', 'salida');
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [idProduct, idSucursal, usuario_id ?? null, tipoMov, Number(cantidad), (notas || ''), null, stockAnterior, stockNuevo]
        );
      } catch {}

      await conn.commit();
      conn.release();
      return { stock_sucursal: stockNuevo };
    } catch (err) {
      try { await conn.rollback(); } catch {}
      try { conn.release(); } catch {}
      throw err;
    }
  },

  async entrada({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, motivo, referencia, descripcion }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Producto
      let idProduct = producto_id;
      let cantidadBodega = 0;
      if (!idProduct) {
        const [prodRows] = await conn.query('SELECT ID_PRODUCT, CANTIDAD FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
        idProduct = prodRows[0].ID_PRODUCT;
        cantidadBodega = Number(prodRows[0].CANTIDAD || 0);
      } else {
        const [prodRows] = await conn.query('SELECT CANTIDAD FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
        cantidadBodega = Number(prodRows[0].CANTIDAD || 0);
      }
      // Sucursal
      let idSucursal = sucursal_id;
      if (!idSucursal) {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
        idSucursal = sucRows[0].ID_SUCURSAL;
      } else {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ?', [idSucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
      }
      // Validación bodega
      if (Number(cantidad) > cantidadBodega) throw new Error('Stock en bodega insuficiente');
      const nuevaBodega = cantidadBodega - Number(cantidad);
      await conn.query('UPDATE PRODUCTOS SET CANTIDAD = ? WHERE ID_PRODUCT = ?', [nuevaBodega, idProduct]);
      // Stock previo sucursal
      const [prevStockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [idProduct, idSucursal]);
      const stockAnterior = prevStockRows.length ? Number(prevStockRows[0].CANTIDAD || 0) : 0;
      await conn.query(`
        INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE CANTIDAD = CANTIDAD + VALUES(CANTIDAD)
      `, [idProduct, idSucursal, cantidad]);
      const stockNuevo = stockAnterior + Number(cantidad);
      // Movimiento
      try {
        const allowed = await getAllowedTipoMovimiento(conn);
        const tipoMov = chooseTipo(allowed, 'entrada', 'entrada');
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [idProduct, idSucursal, usuario_id, tipoMov, cantidad, motivo || descripcion || '', referencia || null, stockAnterior, stockNuevo]
        );
      } catch {}
      await conn.commit();
      conn.release();
      return { nuevaBodega };
    } catch (err) {
      try { await conn.rollback(); } catch {}
      try { conn.release(); } catch {}
      throw err;
    }
  },

  async salida({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, motivo, referencia, descripcion }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Producto
      let idProduct = producto_id;
      if (!idProduct) {
        const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
        idProduct = prodRows[0].ID_PRODUCT;
      } else {
        const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
      }
      // Sucursal
      let idSucursal = sucursal_id;
      if (!idSucursal) {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
        idSucursal = sucRows[0].ID_SUCURSAL;
      } else {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE ID_SUCURSAL = ?', [idSucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
      }
      // Stock sucursal
      const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      if (Number(cantidad) > cantidadEnSucursal) throw new Error('Stock en sucursal insuficiente');
      const stockAnteriorSalida = cantidadEnSucursal;
      const nuevaSucursal = cantidadEnSucursal - Number(cantidad);
      if (stockRows.length) {
        await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevaSucursal, idProduct, idSucursal]);
      } else {
        await conn.query('INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [idProduct, idSucursal, 0]);
      }
      // Sumar a bodega
      const [prodRows2] = await conn.query('SELECT CANTIDAD FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
      const cantidadBodegaActual = prodRows2.length ? Number(prodRows2[0].CANTIDAD || 0) : 0;
      const nuevaBodega = cantidadBodegaActual + Number(cantidad);
      await conn.query('UPDATE PRODUCTOS SET CANTIDAD = ? WHERE ID_PRODUCT = ?', [nuevaBodega, idProduct]);
      // Movimiento
      try {
        const allowed = await getAllowedTipoMovimiento(conn);
        const tipoMov = chooseTipo(allowed, 'salida', 'salida');
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [idProduct, idSucursal, usuario_id, tipoMov, cantidad, motivo || descripcion || '', referencia || null, stockAnteriorSalida, nuevaSucursal]
        );
      } catch {}
      await conn.commit();
      conn.release();
      return { nuevaBodega };
    } catch (err) {
      try { await conn.rollback(); } catch {}
      try { conn.release(); } catch {}
      throw err;
    }
  },

  async marcarDanado({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, descripcion, motivo, tipo_dano, estado_dano, referencia }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Producto y sucursal
      let idProduct = producto_id;
      if (!idProduct) {
        const [prodRows] = await conn.query('SELECT ID_PRODUCT FROM PRODUCTOS WHERE PRODUCT_NAME = ?', [producto]);
        if (!prodRows.length) throw new Error('Producto no encontrado');
        idProduct = prodRows[0].ID_PRODUCT;
      }
      let idSucursal = sucursal_id;
      if (!idSucursal) {
        const [sucRows] = await conn.query('SELECT ID_SUCURSAL FROM SUCURSAL WHERE NOMBRE_SUCURSAL = ?', [sucursal]);
        if (!sucRows.length) throw new Error('Sucursal no encontrada');
        idSucursal = sucRows[0].ID_SUCURSAL;
      }
      // Stock sucursal
      const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
      const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
      if (Number(cantidad) > cantidadEnSucursal) throw new Error('Stock en sucursal insuficiente');
      const nuevaSucursal = cantidadEnSucursal - Number(cantidad);
      await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevaSucursal, idProduct, idSucursal]);
      const stockAnteriorDanado = Number(nuevaSucursal) + Number(cantidad);
      const stockNuevoDanado = nuevaSucursal;
      // Movimiento inventario danado
      try {
        const allowed = await getAllowedTipoMovimiento(conn);
        const tipoMov = allowed.includes('danado') ? 'danado' : (allowed.includes('ajuste') ? 'ajuste' : (allowed[0] || 'ajuste'));
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [idProduct, idSucursal, usuario_id, tipoMov, cantidad, descripcion || motivo || '', stockAnteriorDanado, stockNuevoDanado]
        );
      } catch {}

      // Insert en STOCK_DANADOS con columnas dinámicas
      try {
        let precioUnitario = 0;
        try {
          const [prodPriceRows] = await conn.query('SELECT PRECIO FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
          if (prodPriceRows?.length) precioUnitario = Number(prodPriceRows[0].PRECIO || 0);
        } catch {}
        const perdidaCalculada = Number(cantidad || 0) * Number(precioUnitario || 0);
        const [colsRes] = await conn.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS'`
        );
        const available = new Set((colsRes || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
        const insertCols = []; const insertPlaceholders = []; const insertValues = [];
        const pushCol = (colName, val, useNow = false) => {
          insertCols.push(colName);
          if (useNow) { insertPlaceholders.push('NOW()'); } else { insertPlaceholders.push('?'); insertValues.push(val); }
        };
        if (available.has('ID_PRODUCT')) pushCol('ID_PRODUCT', idProduct);
        if (available.has('ID_SUCURSAL')) pushCol('ID_SUCURSAL', idSucursal);
        if (available.has('CANTIDAD')) pushCol('CANTIDAD', cantidad);
        if (available.has('DESCRIPCION')) pushCol('DESCRIPCION', descripcion || motivo || '');
        if (available.has('TIPO_DANO')) pushCol('TIPO_DANO', tipo_dano ?? null);
        if (available.has('ESTADO')) {
          pushCol('ESTADO', estado_dano ?? null);
        } else if (available.has('ESTADO_DANO')) {
          pushCol('ESTADO_DANO', estado_dano ?? null);
        }
        if (available.has('USUARIO_ID')) pushCol('USUARIO_ID', usuario_id ?? null);
        if (available.has('REFERENCIA')) pushCol('REFERENCIA', referencia || null);
        if (available.has('PERDIDA')) pushCol('PERDIDA', perdidaCalculada);
        if (available.has('CREATED_AT')) pushCol('CREATED_AT', null, true);
        if (insertCols.length) {
          const insertSql = `INSERT INTO STOCK_DANADOS (${insertCols.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
          await conn.query(insertSql, insertValues);
        }
      } catch {}

      await conn.commit();
      conn.release();
      return { nuevaSucursal };
    } catch (err) {
      try { await conn.rollback(); } catch {}
      try { conn.release(); } catch {}
      throw err;
    }
  },
};

export default StockService;
