import pool from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { id_compra, detalles } = body;
    if (!id_compra || !Array.isArray(detalles) || detalles.length === 0) {
      return Response.json({ error: 'id_compra y detalles requeridos' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Ensure column ENTREGADO exists
      try {
        const [cols] = await conn.query("SELECT COUNT(1) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'detalles_compra' AND COLUMN_NAME = 'ENTREGADO'");
        if (cols && cols.length > 0 && Number(cols[0].cnt || 0) === 0) {
          await conn.query("ALTER TABLE detalles_compra ADD COLUMN ENTREGADO TINYINT(1) NOT NULL DEFAULT 0");
        }
      } catch (e) {
        console.warn('Could not ensure ENTREGADO column', e?.message || e);
      }

      const updated = [];
      for (const detId of detalles) {
        const [rows] = await conn.query('SELECT ID_PRODUCT, CANTIDAD, ENTREGADO FROM detalles_compra WHERE ID_DETALLES_COMPRA = ? FOR UPDATE', [detId]);
        if (!rows || rows.length === 0) continue;
        const det = rows[0];
        if (Number(det.ENTREGADO || 0) === 1) {
          // already delivered
          continue;
        }
        const productId = det.ID_PRODUCT;
        const qty = Number(det.CANTIDAD) || 0;
        if (productId) {
          const [prodRows] = await conn.query('SELECT CANTIDAD FROM productos WHERE ID_PRODUCT = ? FOR UPDATE', [productId]);
          if (prodRows && prodRows.length > 0) {
            const prev = Number(prodRows[0].CANTIDAD) || 0;
            const nuevo = Number((prev + qty).toFixed(2));
            await conn.query('UPDATE productos SET CANTIDAD = ? WHERE ID_PRODUCT = ?', [nuevo, productId]);
          }
        }

        await conn.query('UPDATE detalles_compra SET ENTREGADO = 1 WHERE ID_DETALLES_COMPRA = ?', [detId]);
        updated.push(detId);
      }

      // If all detalles for the compra are delivered, mark compra as recibida
      const [countRows] = await conn.query('SELECT COUNT(1) as pending FROM detalles_compra WHERE ID_COMPRA = ? AND (ENTREGADO = 0 OR ENTREGADO IS NULL)', [id_compra]);
      const pending = (countRows && countRows.length > 0) ? Number(countRows[0].pending || 0) : 0;
      if (pending === 0) {
        await conn.query('UPDATE compras SET ESTADO = ? WHERE ID_COMPRA = ?', ['Recibida', id_compra]);
      }

      await conn.commit();
      conn.release();
      return Response.json({ success: true, updated, allDelivered: pending === 0 });
    } catch (e) {
      try { await conn.rollback(); } catch (_) {}
      try { conn.release(); } catch (_) {}
      console.error('Error receiving compra detalles', e);
      return Response.json({ error: e?.message || String(e) }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
