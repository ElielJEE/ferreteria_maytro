import pool from '@/lib/db';

// GET /api/nivelacion?sucursal=S1&productoId=123
export async function GET(req) {
  try {
    const sucursal = req.nextUrl.searchParams.get('sucursal');
    const productoId = req.nextUrl.searchParams.get('productoId');
    const where = [];
    const params = [];
    if (productoId) { where.push('ID_PRODUCT = ?'); params.push(productoId); }
    if (sucursal) { where.push('ID_SUCURSAL = ?'); params.push(sucursal); }
  const sql = `SELECT ID_NIVELACION, ID_PRODUCT, ID_SUCURSAL, CANTIDAD AS MINIMO, CANTIDAD_MAX AS MAXIMO
                 FROM NIVELACION ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const [rows] = await pool.query(sql, params);
    return Response.json({ nivelacion: rows });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/nivelacion -> upsert por (ID_PRODUCT, ID_SUCURSAL)
  // Body: { producto_id, sucursal_id, minimo, maximo }
export async function POST(req) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    const producto_id = Number(body.producto_id);
    const sucursal_id = body.sucursal_id || null;
    const minimo = body.minimo != null ? String(body.minimo) : null;
    const maximo = body.maximo != null ? String(body.maximo) : null;
    if (!producto_id || !sucursal_id) {
      return Response.json({ error: 'producto_id y sucursal_id son requeridos' }, { status: 400 });
    }
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT ID_NIVELACION FROM NIVELACION WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ? LIMIT 1`,
      [producto_id, sucursal_id]
    );
    if (rows && rows.length) {
      await conn.query(
        `UPDATE NIVELACION SET CANTIDAD = ?, CANTIDAD_MAX = ? WHERE ID_PRODUCT = ? AND ID_SUCURSAL = ?`,
        [minimo, maximo, producto_id, sucursal_id]
      );
    } else {
      await conn.query(
        `INSERT INTO NIVELACION (ID_PRODUCT, ID_SUCURSAL, CANTIDAD, CANTIDAD_MAX) VALUES (?, ?, ?, ?)`,
        [producto_id, sucursal_id, minimo, maximo]
      );
    }
    await conn.commit();
    conn.release();
    return Response.json({ ok: true });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    try { conn.release(); } catch {}
    return Response.json({ error: e.message }, { status: 500 });
  }
}
