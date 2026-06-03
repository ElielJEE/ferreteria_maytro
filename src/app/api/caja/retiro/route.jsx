import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

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

async function ensureCajaTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS caja_sesion (
    ID_SESION INT AUTO_INCREMENT PRIMARY KEY,
    ID_SUCURSAL VARCHAR(10) NOT NULL,
    USUARIO_APERTURA INT NULL,
    FECHA_APERTURA DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MONTO_INICIAL DECIMAL(12,2) NOT NULL DEFAULT 0,
    ESTADO ENUM('abierta','cerrada', 'cancelada') NOT NULL DEFAULT 'abierta',
    FECHA_CIERRE DATETIME NULL,
    USUARIO_CIERRE INT NULL,
    MONTO_FINAL DECIMAL(12,2) NULL,
    TOTAL_VENTAS_EQ_C DECIMAL(12,2) NULL,
    DIFERENCIA DECIMAL(12,2) NULL,
    MONTO_RETIRADO_INICIAL DECIMAL(12,2) NULL DEFAULT 0,
    OBSERVACIONES VARCHAR(255) NULL,
    INDEX idx_caja_suc_estado (ID_SUCURSAL, ESTADO),
    INDEX idx_caja_fecha (FECHA_APERTURA)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

// POST /api/caja/retiro  body: { sesion_id?, sucursal_id?, monto_retirado }
export async function POST(request) {
  const conn = await pool.getConnection();
  try {
    await ensureCajaTables();
    const body = await request.json().catch(() => ({}));
    let sesionId = Number(body?.sesion_id || 0);
    const sucursalId = (body?.sucursal_id || '').toString().trim();
    const montoRetiradoRaw = body?.monto_retirado;
    const montoRetirado = Number(montoRetiradoRaw || 0);

    if (!sesionId) {
      if (!sucursalId) return Response.json({ error: 'sesion_id o sucursal_id requerido' }, { status: 400 });
      const [row] = await conn.query('SELECT ID_SESION FROM caja_sesion WHERE ID_SUCURSAL = ? AND ESTADO = "abierta" ORDER BY FECHA_APERTURA DESC LIMIT 1', [sucursalId]);
      if (!row?.length) {
        conn.release();
        return Response.json({ error: 'No hay caja abierta para esta sucursal' }, { status: 404 });
      }
      sesionId = row[0].ID_SESION;
    }

    await conn.beginTransaction();
    const [[sesion]] = await conn.query('SELECT * FROM caja_sesion WHERE ID_SESION = ? FOR UPDATE', [sesionId]);
    if (!sesion || sesion.ESTADO !== 'abierta') {
      await conn.rollback();
      conn.release();
      return Response.json({ error: 'Sesión inválida o no abierta' }, { status: 400 });
    }

    // use provided montoRetirado or default to MONTO_INICIAL
    const finalMontoRetirado = Number(isNaN(montoRetirado) || montoRetirado <= 0 ? sesion.MONTO_INICIAL || 0 : montoRetirado);

    await conn.query('UPDATE caja_sesion SET MONTO_RETIRADO_INICIAL = ? WHERE ID_SESION = ?', [finalMontoRetirado, sesionId]);

    await conn.commit();
    conn.release();

    return Response.json({ success: true, sesion_id: sesionId, monto_retirado: finalMontoRetirado });
  } catch (e) {
    try { await conn.rollback(); } catch { }
    try { conn.release(); } catch { }
    return Response.json({ error: e.message }, { status: 500 });
  }
}
