import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

async function ensureCajaTables() {
  // Create session table if not exists
  await pool.query(`CREATE TABLE IF NOT EXISTS CAJA_SESION (
    ID_SESION INT AUTO_INCREMENT PRIMARY KEY,
    ID_SUCURSAL VARCHAR(10) NOT NULL,
    USUARIO_APERTURA INT NULL,
    FECHA_APERTURA DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MONTO_INICIAL DECIMAL(12,2) NOT NULL DEFAULT 0,
    ESTADO ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
    FECHA_CIERRE DATETIME NULL,
    USUARIO_CIERRE INT NULL,
    MONTO_FINAL DECIMAL(12,2) NULL,
    TOTAL_VENTAS_EQ_C DECIMAL(12,2) NULL,
    DIFERENCIA DECIMAL(12,2) NULL,
    OBSERVACIONES VARCHAR(255) NULL,
    INDEX idx_caja_suc_estado (ID_SUCURSAL, ESTADO),
    INDEX idx_caja_fecha (FECHA_APERTURA)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

function getUserFromToken(req) {
  try {
    const token = req.cookies?.get?.('token')?.value ?? null;
    if (!token) return { usuarioId: null };
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      usuarioId: decoded?.id || decoded?.sub || decoded?.userId || decoded?.user_id || null,
      sucursalId: decoded?.ID_SUCURSAL || decoded?.sucursal_id || null,
    };
  } catch { return { usuarioId: null, sucursalId: null }; }
}

// GET /api/caja?sucursal=S1&historial=1&limit=10
export async function GET(request) {
  try {
    await ensureCajaTables();
    const { searchParams } = new URL(request.url);
    const sucursal = searchParams.get('sucursal');
    const historial = searchParams.get('historial');
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 10), 100));

    if (historial) {
      const params = [];
    let sucursal = searchParams.get('sucursal');
      if (sucursal) { sql += 'WHERE ID_SUCURSAL = ? '; params.push(sucursal); }
      sql += 'ORDER BY FECHA_APERTURA DESC LIMIT ?';

    // Forzar sucursal si el usuario no es admin (tiene sucursal asignada). Si el usuario tiene sucursalId => no-admin.
    try {
      const { sucursalId } = getUserFromToken(request);
      if (sucursalId) sucursal = sucursalId; // ignorar query param para no-admin
    } catch {}
      params.push(limit);
      const [rows] = await pool.query(sql, params);
      return Response.json({ historial: rows });
    }

    if (!sucursal) {
      // devolver sesiones abiertas por sucursal
      const [rows] = await pool.query('SELECT * FROM CAJA_SESION WHERE ESTADO = "abierta" ORDER BY FECHA_APERTURA DESC');
      return Response.json({ abiertas: rows });
    }
    const { sucursalId } = getUserFromToken(request);
    if (sucursalId) {
      const [rows] = await pool.query('SELECT * FROM CAJA_SESION WHERE ID_SUCURSAL = ? AND ESTADO = "abierta" ORDER BY FECHA_APERTURA DESC LIMIT 1', [sucursalId]);
      return Response.json({ abierta: rows?.[0] || null });
    }
    const [rows] = await pool.query('SELECT * FROM CAJA_SESION WHERE ID_SUCURSAL = ? AND ESTADO = "abierta" ORDER BY FECHA_APERTURA DESC LIMIT 1', [sucursal]);
    return Response.json({ abierta: rows?.[0] || null });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/caja  body: { sucursal_id, monto_inicial, observaciones? }
export async function POST(request) {
  const conn = await pool.getConnection();
  try {
    await ensureCajaTables();
    const body = await request.json().catch(() => ({}));
    const sucursalId = (body?.sucursal_id || body?.sucursal || '').toString().trim();
    const montoInicial = Number(body?.monto_inicial || body?.monto || 0);
    const observaciones = body?.observaciones || null;
    if (!sucursalId) return Response.json({ error: 'sucursal_id requerido' }, { status: 400 });
    if (isNaN(montoInicial) || montoInicial < 0) return Response.json({ error: 'monto_inicial inválido' }, { status: 400 });

    const { usuarioId } = getUserFromToken(request);
    await conn.beginTransaction();
    // asegurar que no haya una caja abierta en la sucursal
    const [openRows] = await conn.query('SELECT ID_SESION FROM CAJA_SESION WHERE ID_SUCURSAL = ? AND ESTADO = "abierta" LIMIT 1', [sucursalId]);
    if (openRows?.length) {
      await conn.rollback();
      conn.release();
      return Response.json({ error: 'Ya existe una caja abierta en esta sucursal' }, { status: 409 });
    }
    const [ins] = await conn.query(
      'INSERT INTO CAJA_SESION (ID_SUCURSAL, USUARIO_APERTURA, MONTO_INICIAL, ESTADO, OBSERVACIONES) VALUES (?, ?, ?, "abierta", ?)',
      [sucursalId, usuarioId, montoInicial, observaciones]
    );
    await conn.commit();
    conn.release();
    return Response.json({ success: true, sesion_id: ins.insertId });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/caja  body: { sesion_id?, sucursal_id?, monto_final, observaciones? }
export async function PUT(request) {
  const conn = await pool.getConnection();
  try {
    await ensureCajaTables();
    const body = await request.json().catch(() => ({}));
    let sesionId = Number(body?.sesion_id || 0);
    const sucursalId = (body?.sucursal_id || '').toString().trim();
    const montoFinal = Number(body?.monto_final || 0);
    const observaciones = body?.observaciones || null;
    if ((isNaN(montoFinal) || montoFinal < 0)) return Response.json({ error: 'monto_final inválido' }, { status: 400 });

    await conn.beginTransaction();
    // localizar sesión abierta
    if (!sesionId) {
      if (!sucursalId) return Response.json({ error: 'sucursal_id requerido si no se envía sesion_id' }, { status: 400 });
      const [row] = await conn.query('SELECT ID_SESION FROM CAJA_SESION WHERE ID_SUCURSAL = ? AND ESTADO = "abierta" ORDER BY FECHA_APERTURA DESC LIMIT 1', [sucursalId]);
      if (!row?.length) {
        await conn.rollback();
        conn.release();
        return Response.json({ error: 'No hay caja abierta para esta sucursal' }, { status: 404 });
      }
      sesionId = row[0].ID_SESION;
    }

    const [[sesion]] = await conn.query('SELECT * FROM CAJA_SESION WHERE ID_SESION = ? FOR UPDATE', [sesionId]);
    if (!sesion || sesion.ESTADO !== 'abierta') {
      await conn.rollback();
      conn.release();
      return Response.json({ error: 'Sesión inválida o ya cerrada' }, { status: 400 });
    }

    const now = new Date();
    // calcular ventas desde apertura hasta ahora para la sucursal
    let totalVentasEqC = 0;
    try {
      const [sumRows] = await conn.query(
        `SELECT COALESCE(SUM(f.TOTAL), 0) AS total
   FROM FACTURA f
   WHERE f.ID_SUCURSAL = ? AND DATE(f.FECHA) >= DATE(?) AND DATE(f.FECHA) <= DATE(?)`,
        [sesion.ID_SUCURSAL, sesion.FECHA_APERTURA, now]
      );
      totalVentasEqC = Number(sumRows?.[0]?.total || 0);
    } catch { totalVentasEqC = 0; }

    const esperado = Number((Number(sesion.MONTO_INICIAL || 0) + totalVentasEqC).toFixed(2));
    console.log("lo esperado: ", esperado, "total de ventas:", totalVentasEqC);
    const diferencia = Number((montoFinal - esperado).toFixed(2));

    const { usuarioId } = getUserFromToken(request);
    await conn.query(
      'UPDATE CAJA_SESION SET ESTADO = "cerrada", FECHA_CIERRE = ?, USUARIO_CIERRE = ?, MONTO_FINAL = ?, TOTAL_VENTAS_EQ_C = ?, DIFERENCIA = ?, OBSERVACIONES = ? WHERE ID_SESION = ?',
      [now, usuarioId, montoFinal, totalVentasEqC, diferencia, observaciones, sesionId]
    );

    await conn.commit();
    conn.release();
    return Response.json({ success: true, esperado, diferencia, totalVentas: totalVentasEqC });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    return Response.json({ error: e.message }, { status: 500 });
  }
}
