import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// --- Inlined StockService logic (migrated from src/server/services/StockService.js)

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
    try { await connOrPool.query(`ALTER TABLE RESERVAS ADD COLUMN ID_CLIENTES INT NULL`); } catch { }
  }
};

// Service functions inlined
async function getMovimientos({ sucursal }) {
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
}

async function getResumen({ sucursal }) {
  const [totales] = await pool.query(`
    SELECT ID_PRODUCT, SUM(CANTIDAD) AS TOTAL_SUCURSALES
    FROM STOCK_SUCURSAL GROUP BY ID_PRODUCT
  `);
  const totalMap = Object.fromEntries(totales.map(t => [t.ID_PRODUCT, Number(t.TOTAL_SUCURSALES)]));
  // Totales globales de dañados por producto (sum across all sucursales)
  let danadosMap = {};
  try {
    const [totDanados] = await pool.query(`
      SELECT ID_PRODUCT, IFNULL(SUM(CANTIDAD),0) AS TOTAL_DANADOS FROM STOCK_DANADOS GROUP BY ID_PRODUCT
    `);
    danadosMap = Object.fromEntries((totDanados || []).map(t => [t.ID_PRODUCT, Number(t.TOTAL_DANADOS || 0)]));
  } catch (e) {
    // If table missing or query fails, leave danadosMap empty
    danadosMap = {};
  }
  // Totales globales de reservados por producto (use RESERVAS table if present)
  let reservasMap = {};
  try {
    const [totReservas] = await pool.query(`
      SELECT ID_PRODUCT, IFNULL(SUM(CANTIDAD),0) AS TOTAL_RESERVADOS FROM RESERVAS GROUP BY ID_PRODUCT
    `);
    reservasMap = Object.fromEntries((totReservas || []).map(t => [t.ID_PRODUCT, Number(t.TOTAL_RESERVADOS || 0)]));
  } catch (e) {
    reservasMap = {};
  }
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
      p.PRECIO AS PRECIO_UNIT,
      p.ID_SUBCATEGORIAS,
      sc.NOMBRE_SUBCATEGORIA AS SUBCATEGORY,
      s.ID_SUCURSAL,
      s.NOMBRE_SUCURSAL,
      IFNULL(st.CANTIDAD, 0) AS STOCK_SUCURSAL,
      p.CANTIDAD AS STOCK_BODEGA,
      ${statusSelect},
      IFNULL(nv.CANTIDAD, '') AS MINIMO,
      IFNULL(nv.CANTIDAD_MAX, '') AS MAXIMO,
      (IFNULL(st.CANTIDAD, 0) * IFNULL(p.PRECIO, 0)) AS VALOR_TOTAL,
      (
        SELECT IFNULL(SUM(sd.CANTIDAD), 0) FROM STOCK_DANADOS sd
        WHERE sd.ID_PRODUCT = p.ID_PRODUCT AND sd.ID_SUCURSAL = s.ID_SUCURSAL
      ) AS DANADOS,
      (
        SELECT IFNULL(SUM(mi.cantidad), 0) FROM MOVIMIENTOS_INVENTARIO mi
        WHERE mi.producto_id = p.ID_PRODUCT AND mi.sucursal_id = s.ID_SUCURSAL AND mi.tipo_movimiento = 'reservado'
      ) AS RESERVADOS,
      '' AS CRITICOS,
      '' AS AGOTADOS
    FROM PRODUCTOS p
    CROSS JOIN SUCURSAL s
    LEFT JOIN STOCK_SUCURSAL st ON st.ID_PRODUCT = p.ID_PRODUCT AND st.ID_SUCURSAL = s.ID_SUCURSAL
    LEFT JOIN SUBCATEGORIAS sc ON sc.ID_SUBCATEGORIAS = p.ID_SUBCATEGORIAS
    LEFT JOIN NIVELACION nv ON nv.ID_PRODUCT = p.ID_PRODUCT AND nv.ID_SUCURSAL = s.ID_SUCURSAL
    ${where}
  `, params);
  return rows.map(r => ({
    ...r,
    // Use global totals so FISICO_TOTAL is invariant per product (not dependent on the row's sucursal)
    FISICO_TOTAL:
      Number(r.STOCK_BODEGA || 0) +
      Number(totalMap[r.ID_PRODUCT] || 0) +
      Number(danadosMap[r.ID_PRODUCT] || 0) +
      Number(reservasMap[r.ID_PRODUCT] || 0)
  }));
}

async function getDanados({ sucursal }) {
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
}

// Compute alert rows per producto x sucursal based on stock vs min/max
async function getAlertas({ sucursal }) {
  // Precompute global maps used for FISICO_TOTAL like in getResumen
  const [totales] = await pool.query(`
    SELECT ID_PRODUCT, SUM(CANTIDAD) AS TOTAL_SUCURSALES
    FROM STOCK_SUCURSAL GROUP BY ID_PRODUCT
  `);
  const totalMap = Object.fromEntries((totales || []).map(t => [t.ID_PRODUCT, Number(t.TOTAL_SUCURSALES || 0)]));

  let danadosMap = {};
  try {
    const [totDanados] = await pool.query(`SELECT ID_PRODUCT, IFNULL(SUM(CANTIDAD),0) AS TOTAL_DANADOS FROM STOCK_DANADOS GROUP BY ID_PRODUCT`);
    danadosMap = Object.fromEntries((totDanados || []).map(t => [t.ID_PRODUCT, Number(t.TOTAL_DANADOS || 0)]));
  } catch { danadosMap = {}; }

  let reservasMap = {};
  try {
    const [totReservas] = await pool.query(`SELECT ID_PRODUCT, IFNULL(SUM(CANTIDAD),0) AS TOTAL_RESERVADOS FROM RESERVAS GROUP BY ID_PRODUCT`);
    reservasMap = Object.fromEntries((totReservas || []).map(t => [t.ID_PRODUCT, Number(t.TOTAL_RESERVADOS || 0)]));
  } catch { reservasMap = {}; }

  const where = (sucursal && sucursal !== 'Todas') ? 'WHERE s.NOMBRE_SUCURSAL = ?' : '';
  const params = (sucursal && sucursal !== 'Todas') ? [sucursal] : [];
  const [rows] = await pool.query(`
    SELECT 
      p.ID_PRODUCT,
      p.PRODUCT_NAME,
      p.CANTIDAD AS STOCK_BODEGA,
      s.ID_SUCURSAL,
      s.NOMBRE_SUCURSAL,
      IFNULL(st.CANTIDAD, 0) AS STOCK_SUCURSAL,
      nv.CANTIDAD      AS MINIMO,
      nv.CANTIDAD_MAX  AS MAXIMO,
      (SELECT IFNULL(SUM(mi.cantidad), 0) FROM MOVIMIENTOS_INVENTARIO mi
         WHERE mi.producto_id = p.ID_PRODUCT AND mi.sucursal_id = s.ID_SUCURSAL AND mi.tipo_movimiento = 'reservado') AS RESERVADOS,
      (SELECT IFNULL(SUM(sd.CANTIDAD), 0) FROM STOCK_DANADOS sd
         WHERE sd.ID_PRODUCT = p.ID_PRODUCT AND sd.ID_SUCURSAL = s.ID_SUCURSAL) AS DANADOS
    FROM PRODUCTOS p
    CROSS JOIN SUCURSAL s
    LEFT JOIN STOCK_SUCURSAL st ON st.ID_PRODUCT = p.ID_PRODUCT AND st.ID_SUCURSAL = s.ID_SUCURSAL
    LEFT JOIN NIVELACION nv ON nv.ID_PRODUCT = p.ID_PRODUCT AND nv.ID_SUCURSAL = s.ID_SUCURSAL
    ${where}
  `, params);

  const alerts = [];
  for (const r of rows) {
    const stock = Number(r.STOCK_SUCURSAL || 0);
    const min = r.MINIMO == null || r.MINIMO === '' ? null : Number(r.MINIMO);
    const max = r.MAXIMO == null || r.MAXIMO === '' ? null : Number(r.MAXIMO);
    let status = null;
    if (stock === 0) status = 'agotado';
    else if (min != null && stock < min) status = 'bajo';
    else if (max != null && stock > max) status = 'exceso';
    else continue; // no alerta

    alerts.push({
      id: `${r.ID_PRODUCT}-${r.ID_SUCURSAL}`,
      status,
      productName: r.PRODUCT_NAME,
      sucursal: r.NOMBRE_SUCURSAL,
      stock,
      min: min == null ? undefined : min,
      max: max == null ? undefined : max,
      store: Number(r.STOCK_BODEGA || 0),
      reserved: Number(r.RESERVADOS || 0),
      damaged: Number(r.DANADOS || 0),
      totalPhisical:
        Number(r.STOCK_BODEGA || 0) +
        Number(totalMap[r.ID_PRODUCT] || 0) +
        Number(danadosMap[r.ID_PRODUCT] || 0) +
        Number(reservasMap[r.ID_PRODUCT] || 0)
    });
  }
  return alerts;
}

async function getReservados({ sucursal }) {
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
}

async function reservar({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, cliente, telefono, fecha_entrega, notas }) {
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
    } catch { }

    await conn.commit();
    conn.release();
    return { stock_sucursal: stockNuevo };
  } catch (err) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    throw err;
  }
}

async function entrada({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, motivo, referencia, descripcion }) {
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
    } catch { }
    await conn.commit();
    conn.release();
    return { nuevaBodega };
  } catch (err) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    throw err;
  }
}

async function salida({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, motivo, referencia, descripcion }) {
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
    } catch { }
    await conn.commit();
    conn.release();
    return { nuevaBodega };
  } catch (err) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    throw err;
  }
}

async function marcarDanado({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, descripcion, motivo, tipo_dano, estado_dano, referencia }) {
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
    } catch { }

    // Insert en STOCK_DANADOS con columnas dinámicas
    try {
      let precioUnitario = 0;
      try {
        const [prodPriceRows] = await conn.query('SELECT PRECIO FROM PRODUCTOS WHERE ID_PRODUCT = ?', [idProduct]);
        if (prodPriceRows?.length) precioUnitario = Number(prodPriceRows[0].PRECIO || 0);
      } catch { }
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
    } catch { }

    await conn.commit();
    conn.release();
    return { nuevaSucursal };
  } catch (err) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    throw err;
  }
}

// --- End inlined StockService logic

export async function GET(req) {
  try {
    const tab = req.nextUrl.searchParams.get('tab');
    const sucursal = req.nextUrl.searchParams.get('sucursal');

    // Si solicitan la pestaña Movimientos, devolver historial estructurado
    if (tab === 'Movimientos') {
      // Ejecutar lógica local inlined
      const rows = await getMovimientos({ sucursal });

      // Mapear al formato que usa el componente Movements
      const mapTipo = (t) => {
        if (!t) return '';
        const v = t.toString().toLowerCase();
        if (v === 'danado' || v === 'dañado') return 'Dañado';
        if (v === 'reservado' || v === 'reserva') return 'Reserva';
        if (v === 'entrada') return 'Entrada';
        if (v === 'salida') return 'Salida';
        if (v === 'transferencia') return 'Transferencia';
        if (v === 'ajuste' || v === 'ajuste_danado') return 'Ajuste';
        // Fallback: capitalize words
        return (t || '').toString().replace(/_/g, ' ').replace(/(^|\s)\S/g, s => s.toUpperCase());
      };

      const mapped = (rows || []).map(r => ({
        id: r.id,
        fecha: r.fecha,
        hora: r.hora,
        tipo: mapTipo(r.tipo),
        sucursal: r.sucursal || 'Sin Sucursal',
        producto: { nombre: r.producto_nombre || 'Sin nombre', codigo: r.producto_codigo || '' },
        cantidad: Number(r.cantidad || 0),
        stock_anterior: r.stock_anterior == null ? null : Number(r.stock_anterior),
        stock_nuevo: r.stock_nuevo == null ? null : Number(r.stock_nuevo),
        motivo: r.motivo || '',
        usuario: r.usuario || '',
        referencia: r.referencia || null
      }));

      return Response.json({ movimientos: mapped });
    }

    // Si solicitan el resumen, ejecutar la consulta de stock por producto x sucursal
    if (tab === 'Resumen' || !tab) {
      const rows = await getResumen({ sucursal });
      return Response.json({ resumen: rows });
    }
    if (tab === 'Alertas') {
      const rows = await getAlertas({ sucursal });
      return Response.json({ alertas: rows });
    }
    if (tab === 'Dañados') {
      const { rows, summary } = await getDanados({ sucursal });
      const mapped = (rows || []).map(r => ({
        id: r.id,
        codigo: r.codigo || '',
        producto: r.producto || '',
        sucursal: r.sucursal || 'Sin Sucursal',
        cantidad: Number(r.cantidad || 0),
        tipo_dano: r.tipo_dano || '',
        fecha: r.fecha || null,
        reportado_por: r.reportado_por || '',
        perdida: r.perdida == null ? 0 : Number(r.perdida),
        estado: r.estado || '',
        descripcion: r.descripcion || ''
      }));
      return Response.json({ danados: mapped, resumen: summary });
    }
    if (tab === 'Reservados') {
      const rows = await getReservados({ sucursal });
      const mapped = (rows || []).map(r => ({
        id: r.id,
        codigo: r.codigo || '',
        producto: r.producto || '',
        sucursal: r.sucursal || 'Sin Sucursal',
        cantidad: Number(r.cantidad || 0),
        telefono: r.telefono || '',
        cliente: { nombre: r.cliente_nombre || '', id: r.cliente_id || '' },
        fecha_reserva: r.fecha_reserva || null,
        fecha_entrega: r.fecha_entrega || null,
        estado: r.estado || 'pendiente',
        reservado_por: r.reservado_por || '',
        notas: r.notas || ''
      }));
      return Response.json({ reservados: mapped });
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

    // Normalizar el tipo recibido desde la UI a los valores que se almacenan en la BD
    const storedTipo = (() => {
      const t = (tipo || '').toString().toLowerCase();
      if (!t) return null;
      // Normalizar a los valores exactos del ENUM definido en la BD
      if (/entrada/.test(t)) return 'entrada';
      if (/salid/.test(t)) return 'salida';
      // detectar variantes de "dañado"/"danado"/"marcar como dañado"
      if (/(da[nñ]ad|da[nñ]ado|dañado|danado|dañad|marcar como dañ|marcar como danad|marcar como danado)/.test(t)) return 'danado';
      if (/reserv/.test(t)) return 'reservado';
      if (/transfer/.test(t)) return 'transferencia';
      // Si no coincide con ninguno, devolver null para forzar fallback controlado
      return null;
    })();

    // Helper: obtiene valores permitidos por el ENUM tipo_movimiento desde la BD
    const getAllowedTipoMovimiento = async (conn) => {
      try {
        const [rows] = await conn.query(`
        SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'MOVIMIENTOS_INVENTARIO' AND COLUMN_NAME = 'tipo_movimiento'
      `);
        const ct = rows && rows[0] && rows[0].COLUMN_TYPE ? String(rows[0].COLUMN_TYPE) : '';
        // ct tiene la forma: "enum('entrada','salida',...)"
        const matches = ct.match(/'([^']+)'/g);
        if (!matches) return [];
        return matches.map(m => m.replace(/'/g, ''));
      } catch (e) {
        console.warn('No se pudo obtener ENUM tipo_movimiento:', e.message);
        return [];
      }
    };

    // Helper: dado un conjunto de valores permitidos y un valor solicitado,
    // intenta devolver el valor solicitado si está permitido; si no, aplica
    // heurísticas (p.ej. mapear 'danado' -> 'ajuste_danado' si existe) o devuelve null.
    const chooseClosestAllowed = (allowed, requested) => {
      if (!allowed || !allowed.length) return null;
      if (!requested) return null;
      if (allowed.includes(requested)) return requested;
      // si pedimos 'reservado' y no existe, quizá 'reserva' no está en enum; fallback null
      // como último recurso, devolver el primer valor permitido (pero llamador puede elegir fallback más específico)
      return null;
    };

    // Obtener usuario desde token o payload (fallback a 1)
    let usuario_id = body.usuario_id ?? 1;
    try {
      const token = req.cookies?.get?.('token')?.value ?? null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        usuario_id = decoded.id ?? decoded.sub ?? decoded.userId ?? decoded.user_id ?? usuario_id;
      }
    } catch (err) {
      // ignore, usar usuario_id del body o fallback
      usuario_id = body.usuario_id ?? usuario_id;
    }

    if (tipo === 'Entrada (Aumentar Stock)') {
      try {
        const result = await entrada({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          motivo: body.motivo,
          referencia: body.referencia,
          descripcion: body.descripcion
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    if (tipo === 'Salida (Reducir Stock)') {
      try {
        const result = await salida({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          motivo: body.motivo,
          referencia: body.referencia,
          descripcion: body.descripcion
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Marcar como Reservado: delegar a servicio central
    if (tipo === 'Marcar como Reservado' || storedTipo === 'reservado') {
      try {
        const result = await reservar({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          cliente: body.cliente,
          telefono: body.telefono,
          fecha_entrega: body.fecha_entrega,
          notas: body.notas || body.descripcion || body.motivo || ''
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // Otros tipos de movimiento (puedes agregar lógica similar para Salida, etc.)
    if (tipo === 'Marcar como Dañado') {
      try {
        const result = await marcarDanado({
          usuario_id,
          producto: body.producto,
          producto_id: body.producto_id,
          sucursal: body.sucursal,
          sucursal_id: body.sucursal_id,
          cantidad: body.cantidad,
          descripcion: body.descripcion,
          motivo: body.motivo,
          tipo_dano: body.tipo_dano ?? body.tipoDano ?? body.tipoDanoLabel,
          estado_dano: body.estado ?? body.estado_dano ?? body.estadoDano,
          referencia: body.referencia
        });
        return Response.json({ ok: true, ...result });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    return Response.json({ ok: false, message: 'Tipo de movimiento no implementado' });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
