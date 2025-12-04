import pool from '@/lib/db';

// Strategy: use a single-row table CONFIG_TASA_CAMBIO (create if missing) else fallback to latest FACTURA_PAGOS.TASA_CAMBIO.
// We keep the table idempotent: one row with ID=1.

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS config_tasa_cambio (
    ID INT NOT NULL PRIMARY KEY,
    TASA DECIMAL(12,4) NOT NULL,
    UPDATED_AT TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  const [rows] = await pool.query('SELECT ID FROM CONFIG_TASA_CAMBIO WHERE ID = 1');
  if (!rows || !rows.length) {
    await pool.query('INSERT INTO CONFIG_TASA_CAMBIO (ID, TASA) VALUES (1, 36.5500)');
  }
}

export async function GET() {
  try {
    await ensureTable();
    const [config] = await pool.query('SELECT TASA, UPDATED_AT FROM config_tasa_cambio WHERE ID = 1 LIMIT 1');
    let tasa = config?.[0]?.TASA;
    let updated = config?.[0]?.UPDATED_AT;
    if (tasa == null) {
      // fallback: ultima tasa registrada en FACTURA_PAGOS
      const [fp] = await pool.query('SELECT TASA_CAMBIO FROM factura_pagos ORDER BY ID_PAGO DESC LIMIT 1');
      tasa = fp?.[0]?.TASA_CAMBIO || 36.5500;
      updated = null;
    }
    return Response.json({ tasa: Number(tasa), updated_at: updated });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/tasa-cambio  body: { tasa }
// Only store; not retroactively modifying previous FACTURA_PAGOS.
export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const tasa = Number(body?.tasa);
    if (!tasa || isNaN(tasa) || tasa <= 0) {
      return Response.json({ error: 'tasa válida requerida' }, { status: 400 });
    }
    await ensureTable();
    await pool.query('UPDATE config_tasa_cambio SET TASA = ? WHERE ID = 1', [tasa]);
    return Response.json({ success: true, tasa });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}