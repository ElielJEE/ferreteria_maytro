import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// --- Inlined StockService logic (migrated from src/server/services/StockService.js)

// Utilities
const isSucursalId = (val) => /^[A-Za-z0-9_-]{2,15}$/.test(String(val || ''));

const buildSucursalWhere = (sucursal, alias = 's') => {
  if (!sucursal || sucursal === 'Todas') return { where: '', params: [] };
  if (isSucursalId(sucursal)) return { where: `WHERE ${alias}.ID_SUCURSAL = ?`, params: [sucursal] };
  return { where: `WHERE ${alias}.NOMBRE_SUCURSAL = ?`, params: [sucursal] };
};

async function getUserSucursalFromReq(req) {
  try {
    const token = req.cookies?.get?.('token')?.value ?? null;
    if (!token) return { isAdmin: false, sucursalId: null };
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [[row]] = await pool.query(`SELECT ID_SUCURSAL FROM USUARIOS WHERE ID = ? LIMIT 1`, [decoded.id || decoded.ID]);
    const sucursalId = row?.ID_SUCURSAL ?? null;
    return { isAdmin: sucursalId == null, sucursalId };
  } catch {
    return { isAdmin: false, sucursalId: null };
  }
}
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
      ESTADO ENUM('pendiente','entregada','cancelada') NOT NULL DEFAULT 'pendiente',
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
  const { where, params } = buildSucursalWhere(sucursal, 's');
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
  const { where, params } = buildSucursalWhere(sucursal, 's');
    const [rows] = await pool.query(`
    SELECT 
      p.ID_PRODUCT,
      p.CODIGO_PRODUCTO,
      p.PRODUCT_NAME,
      COALESCE(pu.PRECIO, 0) AS PRECIO_UNIT,
      p.ID_SUBCATEGORIAS,
      sc.NOMBRE_SUBCATEGORIA AS SUBCATEGORY,
      s.ID_SUCURSAL,
      s.NOMBRE_SUCURSAL,
      IFNULL(st.CANTIDAD, 0) AS STOCK_SUCURSAL,
  p.CANTIDAD AS STOCK_BODEGA,
      ${statusSelect},
      IFNULL(nv.CANTIDAD, '') AS MINIMO,
      IFNULL(nv.CANTIDAD_MAX, '') AS MAXIMO,
      (IFNULL(st.CANTIDAD, 0) * COALESCE(pu.PRECIO, 0)) AS VALOR_TOTAL,
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
  LEFT JOIN producto_unidades pu ON pu.PRODUCT_ID = p.ID_PRODUCT AND pu.ES_POR_DEFECTO = 1
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
  const { where: whereSucursal, params } = buildSucursalWhere(sucursal, 's');
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
       sd.DESCRIPCION AS descripcion,
      COALESCE(sd.UNIDAD_NOMBRE, um.NOMBRE) AS unidad
     FROM STOCK_DANADOS sd
     LEFT JOIN PRODUCTOS p ON p.ID_PRODUCT = sd.ID_PRODUCT
     LEFT JOIN SUCURSAL s ON s.ID_SUCURSAL = sd.ID_SUCURSAL
     LEFT JOIN USUARIOS u ON u.ID = sd.USUARIO_ID
     LEFT JOIN producto_unidades pu ON pu.PRODUCT_ID = sd.ID_PRODUCT AND pu.ES_POR_DEFECTO = 1
     LEFT JOIN unidades_medidas um ON um.ID_UNIDAD = pu.UNIDAD_ID
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

  const { where, params } = buildSucursalWhere(sucursal, 's');
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
  const { where: whereSucursal, params } = buildSucursalWhere(sucursal, 's');
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

async function marcarDanado({ usuario_id, producto, producto_id, sucursal, sucursal_id, cantidad, descripcion, motivo, tipo_dano, estado_dano, referencia, unidad_id, unidad_nombre }) {
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
    // Unidad seleccionada (opcional): ajustar por factor y guardar en dañados
    const selectedUnidadId = unidad_id ?? (referencia?.unidad_id ?? null);
    let unidadNombre = unidad_nombre ?? null;
    let factor = 1; // cuántos "base" descuenta una unidad
    let precioUnitElegido = null; // precio por esa unidad si existe
    if (selectedUnidadId) {
      try {
        const [uu] = await conn.query(
          'SELECT pu.CANTIDAD_POR_UNIDAD AS factor, pu.PRECIO AS precio, um.NOMBRE AS nombre FROM producto_unidades pu LEFT JOIN unidades_medidas um ON um.ID_UNIDAD = pu.UNIDAD_ID WHERE pu.PRODUCT_ID = ? AND pu.UNIDAD_ID = ? LIMIT 1',
          [idProduct, selectedUnidadId]
        );
        if (uu?.length) {
          factor = Number(uu[0].factor || 1);
          precioUnitElegido = Number(uu[0].precio || 0);
          unidadNombre = uu[0].nombre || null;
        }
      } catch { }
    }

    // Stock sucursal
    const [stockRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
    const cantidadEnSucursal = stockRows.length ? Number(stockRows[0].CANTIDAD || 0) : 0;
    const cantidadBase = Number(cantidad) * Number(factor || 1);
    if (cantidadBase > cantidadEnSucursal) throw new Error('Stock en sucursal insuficiente');
    const nuevaSucursal = cantidadEnSucursal - cantidadBase;
    await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [nuevaSucursal, idProduct, idSucursal]);
    const stockAnteriorDanado = Number(nuevaSucursal) + Number(cantidadBase);
    const stockNuevoDanado = nuevaSucursal;
    // Movimiento inventario danado
    try {
      const allowed = await getAllowedTipoMovimiento(conn);
      const tipoMov = allowed.includes('danado') ? 'danado' : (allowed.includes('ajuste') ? 'ajuste' : (allowed[0] || 'ajuste'));
      await conn.query(
        `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, stock_anterior, stock_nuevo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idProduct, idSucursal, usuario_id, tipoMov, cantidadBase, descripcion || motivo || '', stockAnteriorDanado, stockNuevoDanado]
      );
    } catch { }

    // Insert en STOCK_DANADOS con columnas dinámicas
    try {
      let precioUnitario = 0;
      try {
        if (precioUnitElegido != null) precioUnitario = Number(precioUnitElegido || 0);
        else {
          // Try to get default unit price from producto_unidades
          const [pp] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [idProduct]);
          if (pp?.length) { precioUnitario = Number(pp[0].PRECIO || 0); }
          else {
            const [pp2] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? LIMIT 1', [idProduct]);
            if (pp2?.length) precioUnitario = Number(pp2[0].PRECIO || 0);
          }
        }
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
      // Ensure unit columns if not present
      if (!available.has('UNIDAD_ID') || !available.has('UNIDAD_NOMBRE')) {
        try { await conn.query(`ALTER TABLE STOCK_DANADOS ADD COLUMN UNIDAD_ID INT NULL`); } catch { }
        try { await conn.query(`ALTER TABLE STOCK_DANADOS ADD COLUMN UNIDAD_NOMBRE VARCHAR(100) NULL`); } catch { }
        const [colsRes2] = await conn.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS'`
        );
        const available2 = new Set((colsRes2 || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
        available.clear();
        for (const c of available2) available.add(c);
      }
      if (available.has('ID_PRODUCT')) pushCol('ID_PRODUCT', idProduct);
      if (available.has('ID_SUCURSAL')) pushCol('ID_SUCURSAL', idSucursal);
      // Guardar cantidad en la unidad seleccionada (lo mostrado al usuario)
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
      if (available.has('UNIDAD_ID')) pushCol('UNIDAD_ID', selectedUnidadId ?? null);
      if (available.has('UNIDAD_NOMBRE')) pushCol('UNIDAD_NOMBRE', unidadNombre ?? null);
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
    const requested = req.nextUrl.searchParams.get('sucursal');
    const { isAdmin, sucursalId } = await getUserSucursalFromReq(req);
    // Non-admins are restricted to their own sucursal ID; admins can request specific or 'Todas'
    const sucursal = isAdmin ? (requested || 'Todas') : (sucursalId);

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
        descripcion: r.descripcion || '',
        unidad: r.unidad || ''
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
          referencia: body.referencia,
          unidad_id: body.unidad_id ?? null,
          unidad_nombre: body.unidad_nombre ?? null
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

export async function PUT(req) {
  // Actualiza o gestiona reservas (editar, confirmar entrega, cancelar)
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const action = (body?.action || '').toString();
    await conn.beginTransaction();
    await ensureReservasTable(conn);

    // Helper para obtener usuario del token/payload
    let usuario_id = body?.usuario_id ?? null;
    try {
      const token = req.cookies?.get?.('token')?.value ?? null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        usuario_id = decoded?.id ?? decoded?.sub ?? decoded?.userId ?? decoded?.user_id ?? usuario_id;
      }
    } catch { /* ignore */ }

    // Helper: upsert cliente por nombre/telefono
    const getOrCreateCliente = async (nombre, telefono) => {
      const name = (nombre || '').toString().trim();
      const tel = (telefono || '').toString().trim();
      if (!name && !tel) return null;
      const clauses = []; const values = [];
      if (name) { clauses.push('NOMBRE_CLIENTE = ?'); values.push(name); }
      if (tel) { clauses.push('TELEFONO_CLIENTE = ?'); values.push(tel); }
      const [rows] = await conn.query(`SELECT ID_CLIENTES FROM CLIENTES WHERE ${clauses.join(' OR ')} LIMIT 1`, values);
      if (rows?.length) return rows[0].ID_CLIENTES;
      if (!name) return null;
      const [ins] = await conn.query(`INSERT INTO CLIENTES (NOMBRE_CLIENTE, DIRECCION_CLIENTE, TELEFONO_CLIENTE) VALUES (?, '', ?)`, [name, tel || null]);
      return ins.insertId || null;
    };

    if (action === 'updateReserva') {
      const id = body?.id ?? body?.id_reserva ?? body?.reserva_id;
      if (!id) {
        await conn.rollback();
        return Response.json({ error: 'ID de reserva requerido' }, { status: 400 });
      }

      const [rows] = await conn.query(`SELECT * FROM RESERVAS WHERE ID_RESERVA = ? FOR UPDATE`, [id]);
      if (!rows?.length) {
        await conn.rollback();
        return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
      }
      const resv = rows[0];
      const idProduct = resv.ID_PRODUCT;
      const idSucursal = resv.ID_SUCURSAL;

      // Campos editables
      const nuevoNombre = body?.cliente?.nombre ?? body?.cliente_nombre ?? null;
      const nuevoTelefono = body?.telefono ?? body?.cliente?.telefono ?? null;
      const nuevaFechaEntrega = body?.fecha_entrega ?? null;
      const nuevasNotas = body?.notas ?? body?.descripcion ?? null;
      const nuevoEstado = body?.estado ?? null;
      const nuevaCantidadRaw = body?.cantidad;
      const nuevaCantidad = (nuevaCantidadRaw == null || nuevaCantidadRaw === '') ? null : Number(nuevaCantidadRaw);

      // Si cambia la cantidad, ajustar stock sucursal y registrar movimiento
      if (nuevaCantidad != null && Number.isFinite(nuevaCantidad) && nuevaCantidad !== Number(resv.CANTIDAD)) {
        const delta = nuevaCantidad - Number(resv.CANTIDAD);
        // delta > 0: aumenta reservado -> restar de stock sucursal
        // delta < 0: reduce reservado -> devolver a stock sucursal
        const [stRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
        const stockActual = stRows?.length ? Number(stRows[0].CANTIDAD || 0) : 0;
        if (delta > 0 && stockActual < delta) {
          await conn.rollback();
          return Response.json({ error: 'Stock en sucursal insuficiente para aumentar la reserva' }, { status: 400 });
        }
        const stockAnterior = stockActual;
        const stockNuevo = stockActual - delta; // si delta negativo, suma
        // Actualizar stock
        if (stRows?.length) {
          await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProduct, idSucursal]);
        } else {
          await conn.query('INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [idProduct, idSucursal, Math.max(0, stockNuevo)]);
        }
        // Registrar movimiento
        try {
          const allowed = await getAllowedTipoMovimiento(conn);
          if (delta > 0) {
            const tipoMov = chooseTipo(allowed, 'reservado', 'salida');
            await conn.query(
              `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [idProduct, idSucursal, usuario_id ?? null, tipoMov, delta, 'Ajuste de reserva (aumento)', id, stockAnterior, stockNuevo]
            );
          } else if (delta < 0) {
            const tipoMov = chooseTipo(allowed, 'entrada', 'entrada');
            const cant = Math.abs(delta);
            await conn.query(
              `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [idProduct, idSucursal, usuario_id ?? null, tipoMov, cant, 'Ajuste de reserva (reducción)', id, stockAnterior, stockNuevo]
            );
          }
        } catch { }
      }

      // Actualizar campos en RESERVAS
      const updates = [];
      const values = [];
      if (nuevaCantidad != null && Number.isFinite(nuevaCantidad)) { updates.push('CANTIDAD = ?'); values.push(nuevaCantidad); }
      if (nuevaFechaEntrega != null) { updates.push('FECHA_ENTREGA = ?'); values.push(nuevaFechaEntrega ? new Date(nuevaFechaEntrega) : null); }
      if (nuevasNotas != null) { updates.push('NOTAS = ?'); values.push(nuevasNotas || null); }
      if (nuevoTelefono != null) { updates.push('TELEFONO_CONTACTO = ?'); values.push((nuevoTelefono || '').toString()); }
      if (nuevoEstado != null) { updates.push('ESTADO = ?'); values.push((nuevoEstado || '').toString().toLowerCase()); }
      if (nuevoNombre != null || nuevoTelefono != null) {
        const cliId = await getOrCreateCliente(nuevoNombre, nuevoTelefono);
        updates.push('ID_CLIENTES = ?'); values.push(cliId || null);
      }
      if (updates.length) {
        const sql = `UPDATE RESERVAS SET ${updates.join(', ')} WHERE ID_RESERVA = ?`;
        values.push(id);
        await conn.query(sql, values);
      }

      await conn.commit();
      return Response.json({ ok: true, id });
    }

    if (action === 'confirmarEntrega') {
      const id = body?.id ?? body?.id_reserva ?? body?.reserva_id;
      if (!id) {
        await conn.rollback();
        return Response.json({ error: 'ID de reserva requerido' }, { status: 400 });
      }
      const fechaEntrega = body?.fecha_entrega ? new Date(body.fecha_entrega) : new Date();
      const notas = body?.notas ?? null;
      await conn.query(`UPDATE RESERVAS SET ESTADO = 'entregada', FECHA_ENTREGA = ?, NOTAS = COALESCE(?, NOTAS) WHERE ID_RESERVA = ?`, [fechaEntrega, notas, id]);
      await conn.commit();
      return Response.json({ ok: true, id });
    }

    if (action === 'cancelarReserva') {
      const id = body?.id ?? body?.id_reserva ?? body?.reserva_id;
      if (!id) {
        await conn.rollback();
        return Response.json({ error: 'ID de reserva requerido' }, { status: 400 });
      }
      const [rows] = await conn.query(`SELECT * FROM RESERVAS WHERE ID_RESERVA = ? FOR UPDATE`, [id]);
      if (!rows?.length) {
        await conn.rollback();
        return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
      }
      const resv = rows[0];
      const idProduct = resv.ID_PRODUCT;
      const idSucursal = resv.ID_SUCURSAL;
      const cant = Number(resv.CANTIDAD || 0);
      // Devolver stock
      const [stRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
      const stockActual = stRows?.length ? Number(stRows[0].CANTIDAD || 0) : 0;
      const stockAnterior = stockActual;
      const stockNuevo = stockActual + cant;
      if (stRows?.length) {
        await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProduct, idSucursal]);
      } else {
        await conn.query('INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [idProduct, idSucursal, stockNuevo]);
      }
      // Movimiento entrada por cancelación
      try {
        await conn.query(
          `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
           VALUES (?, ?, ?, 'entrada', ?, 'Cancelación de reserva', ?, ?, ?)`,
          [idProduct, idSucursal, usuario_id ?? null, cant, id, stockAnterior, stockNuevo]
        );
      } catch { }

      await conn.query(`UPDATE RESERVAS SET ESTADO = 'cancelada' WHERE ID_RESERVA = ?`, [id]);
      await conn.commit();
      return Response.json({ ok: true, id });
    }

    // Recuperar productos dañados: devolver cantidad al stock de la sucursal original
    if (action === 'recuperarDanado') {
      try {
        const id = body?.id ?? body?.danado_id ?? body?.id_danado;
        const cantidadRec = Number(body?.cantidad || 0);
        if (!id) {
          await conn.rollback();
          return Response.json({ error: 'ID de registro dañado requerido' }, { status: 400 });
        }
        if (!(cantidadRec > 0)) {
          await conn.rollback();
          return Response.json({ error: 'Cantidad a recuperar inválida' }, { status: 400 });
        }

        // Cargar registro de dañados
        const [rows] = await conn.query('SELECT * FROM STOCK_DANADOS WHERE ID_DANADO = ? FOR UPDATE', [id]);
        if (!rows?.length) {
          await conn.rollback();
          return Response.json({ error: 'Registro de dañado no encontrado' }, { status: 404 });
        }
        const d = rows[0];
        const idProduct = Number(d.ID_PRODUCT);
        const idSucursal = d.ID_SUCURSAL;
        const cantActual = Number(d.CANTIDAD || 0);
        if (!idProduct || !idSucursal) {
          await conn.rollback();
          return Response.json({ error: 'Registro dañado incompleto (producto/sucursal)' }, { status: 400 });
        }
        if (cantidadRec > cantActual) {
          await conn.rollback();
          return Response.json({ error: 'Cantidad a recuperar excede la cantidad dañada' }, { status: 400 });
        }

        // Sumar al stock de la sucursal
        const [stRows] = await conn.query('SELECT CANTIDAD FROM STOCK_SUCURSAL WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? FOR UPDATE', [idProduct, idSucursal]);
        const stockAnterior = stRows?.length ? Number(stRows[0].CANTIDAD || 0) : 0;
        const stockNuevo = stockAnterior + cantidadRec;
        if (stRows?.length) {
          await conn.query('UPDATE STOCK_SUCURSAL SET CANTIDAD = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?', [stockNuevo, idProduct, idSucursal]);
        } else {
          await conn.query('INSERT INTO STOCK_SUCURSAL (ID_PRODUCT, ID_SUCURSAL, CANTIDAD) VALUES (?, ?, ?)', [idProduct, idSucursal, stockNuevo]);
        }

        // Registrar movimiento como 'entrada' por recuperación
        try {
          const allowed = await getAllowedTipoMovimiento(conn);
          const tipoMov = chooseTipo(allowed, 'entrada', 'entrada');
          await conn.query(
            `INSERT INTO MOVIMIENTOS_INVENTARIO (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, motivo, referencia_id, stock_anterior, stock_nuevo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [idProduct, idSucursal, body?.usuario_id ?? null, tipoMov, cantidadRec, 'Recuperado de daño', id, stockAnterior, stockNuevo]
          );
        } catch { /* ignore movement errors */ }

        // Ajustar el registro de dañados: restar cantidad y actualizar estado/perdida si aplica
        let precioUnit = 0;
        try {
          const [pp] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [idProduct]);
          if (pp?.length) { precioUnit = Number(pp[0].PRECIO || 0); }
          else {
            const [pp2] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? LIMIT 1', [idProduct]);
            if (pp2?.length) precioUnit = Number(pp2[0].PRECIO || 0);
          }
        } catch { precioUnit = 0; }

        const [colsRes] = await conn.query(
          `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STOCK_DANADOS'`
        );
        const available = new Set((colsRes || []).map(r => String(r.COLUMN_NAME).toUpperCase()));
        const nuevaCant = Math.max(0, cantActual - cantidadRec);

        const sets = ['CANTIDAD = ?'];
        const vals = [nuevaCant, id];

        // Si existe PERDIDA, disminuirla proporcionalmente
        if (available.has('PERDIDA') && precioUnit > 0) {
          const restar = Number((cantidadRec * precioUnit).toFixed(2));
          // Usar expresión: PERDIDA = GREATEST(PERDIDA - restar, 0)
          try {
            await conn.query('UPDATE STOCK_DANADOS SET PERDIDA = GREATEST(PERDIDA - ?, 0) WHERE ID_DANADO = ?', [restar, id]);
          } catch { /* ignore */ }
        }

        // Actualizar estado a 'recuperado' si quedó en cero
        if (nuevaCant === 0) {
          if (available.has('ESTADO')) {
            try { await conn.query('UPDATE STOCK_DANADOS SET ESTADO = ? WHERE ID_DANADO = ?', ['recuperado', id]); } catch { }
          } else if (available.has('ESTADO_DANO')) {
            try { await conn.query('UPDATE STOCK_DANADOS SET ESTADO_DANO = ? WHERE ID_DANADO = ?', ['recuperado', id]); } catch { }
          }
        }

        // Aplicar actualización de cantidad
        await conn.query('UPDATE STOCK_DANADOS SET ' + sets.join(', ') + ' WHERE ID_DANADO = ?', vals);

        await conn.commit();
        return Response.json({ ok: true, id, recuperado: cantidadRec, stock_nuevo: stockNuevo, cantidad_restante: nuevaCant });
      } catch (e) {
        try { await conn.rollback(); } catch { }
        return Response.json({ error: e.message || 'Error al recuperar dañado' }, { status: 400 });
      }
    }

    // Evaluar como pérdida total (total o parcial)
    if (action === 'evaluarPerdidaTotal') {
      try {
        const id = body?.id ?? body?.danado_id ?? body?.id_danado;
        const cantidadEval = Number(body?.cantidad || 0);
        if (!id) {
          await conn.rollback();
          return Response.json({ error: 'ID de registro dañado requerido' }, { status: 400 });
        }
        if (!(cantidadEval > 0)) {
          await conn.rollback();
          return Response.json({ error: 'Cantidad a evaluar inválida' }, { status: 400 });
        }

        // Cargar registro de dañados
        const [rows] = await conn.query('SELECT * FROM STOCK_DANADOS WHERE ID_DANADO = ? FOR UPDATE', [id]);
        if (!rows?.length) {
          await conn.rollback();
          return Response.json({ error: 'Registro de dañado no encontrado' }, { status: 404 });
        }
        const d = rows[0];
        const idProduct = Number(d.ID_PRODUCT);
        const idSucursal = d.ID_SUCURSAL;
        const cantActual = Number(d.CANTIDAD || 0);
        if (!idProduct || !idSucursal) {
          await conn.rollback();
          return Response.json({ error: 'Registro dañado incompleto (producto/sucursal)' }, { status: 400 });
        }
        if (cantidadEval > cantActual) {
          await conn.rollback();
          return Response.json({ error: 'Cantidad a evaluar excede la cantidad dañada' }, { status: 400 });
        }

        // Precio unitario para valor de pérdida
        let precioUnit = 0;
        try {
          const [pp] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? AND ES_POR_DEFECTO = 1 LIMIT 1', [idProduct]);
          if (pp?.length) { precioUnit = Number(pp[0].PRECIO || 0); }
          else {
            const [pp2] = await conn.query('SELECT PRECIO FROM producto_unidades WHERE PRODUCT_ID = ? LIMIT 1', [idProduct]);
            if (pp2?.length) precioUnit = Number(pp2[0].PRECIO || 0);
          }
        } catch { precioUnit = 0; }

        const valorEval = Number((cantidadEval * precioUnit).toFixed(2));

        if (cantidadEval === cantActual) {
          // Caso simple: todo el registro pasa a Pérdida Total
          await conn.query('UPDATE STOCK_DANADOS SET ESTADO = ? WHERE ID_DANADO = ?', ['Perdida Total', id]);
          await conn.commit();
          return Response.json({ ok: true, id, evaluado: cantidadEval, estado: 'Perdida Total' });
        }

        // Parcial: crear nuevo registro con estado Perdida Total y restar del original
        // Insert nuevo registro
        await conn.query(
          `INSERT INTO STOCK_DANADOS (ID_PRODUCT, ID_SUCURSAL, CANTIDAD, TIPO_DANO, ESTADO, DESCRIPCION, USUARIO_ID, REFERENCIA, PERDIDA, CREATED_AT)
           VALUES (?, ?, ?, ?, 'Perdida Total', ?, ?, ?, ?, NOW())`,
          [idProduct, idSucursal, cantidadEval, d.TIPO_DANO || null, d.DESCRIPCION || '', usuario_id ?? null, `eval-perdida:${id}`, valorEval]
        );

        // Restar del registro original
        const nuevaCant = Math.max(0, cantActual - cantidadEval);
        await conn.query('UPDATE STOCK_DANADOS SET CANTIDAD = ? WHERE ID_DANADO = ?', [nuevaCant, id]);
        if (precioUnit > 0) {
          try { await conn.query('UPDATE STOCK_DANADOS SET PERDIDA = GREATEST(PERDIDA - ?, 0) WHERE ID_DANADO = ?', [valorEval, id]); } catch { }
        }

        await conn.commit();
        return Response.json({ ok: true, id, evaluado: cantidadEval, cantidad_restante: nuevaCant });
      } catch (e) {
        try { await conn.rollback(); } catch { }
        return Response.json({ error: e.message || 'Error al evaluar pérdida total' }, { status: 400 });
      }
    }

    await conn.rollback();
    return Response.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    return Response.json({ error: e.message || 'Error al actualizar reserva' }, { status: 400 });
  } finally {
    try { conn.release(); } catch { }
  }
}
