import pool from '@/lib/db';

// GET /api/sucursales
// Optional: ?format=raw to return full fields
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const [rows] = await pool.query('SELECT ID_SUCURSAL, NOMBRE_SUCURSAL, DIRECCION, TELEFONO FROM SUCURSAL');
    if (format === 'raw') return Response.json(rows);
    // Default: label/value pair for selectors
    return Response.json({ sucursales: rows.map(r => ({ label: r.NOMBRE_SUCURSAL, value: r.ID_SUCURSAL })) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/sucursales
// Body: { codigo (ID_SUCURSAL), nombre (NOMBRE_SUCURSAL), direccion?, telefono? }
export async function POST(request) {
  try {
    const body = await request.json();
    const codigo = (body?.codigo ?? body?.id ?? '').toString().trim();
    const nombre = (body?.nombre ?? body?.NOMBRE_SUCURSAL ?? '').toString().trim();
    const direccion = body?.direccion ?? null;
    const telefono = body?.telefono ?? null;

    if (!codigo || !nombre) {
      return Response.json({ error: 'codigo e nombre son requeridos' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO SUCURSAL (ID_SUCURSAL, NOMBRE_SUCURSAL, DIRECCION, TELEFONO) VALUES (?, ?, ?, ?)',
      [codigo, nombre, direccion, telefono]
    );

    // Crear caja asociada (opcional) para compatibilidad con vistas que esperen una "caja" por sucursal
    try {
      await pool.query('CREATE TABLE IF NOT EXISTS CAJA (ID_CAJA VARCHAR(10) NOT NULL, DESCRIPCION VARCHAR(255), PRIMARY KEY (ID_CAJA)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
      await pool.query('INSERT IGNORE INTO CAJA (ID_CAJA, DESCRIPCION) VALUES (?, ?)', [codigo, `Caja ${nombre}`]);
    } catch { /* ignorar si falla, no es crítico */ }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/sucursales
// Body: { id (ID_SUCURSAL), nombre?, direccion?, telefono? }
export async function PUT(request) {
  try {
    const body = await request.json();
    const id = (body?.id ?? body?.codigo ?? '').toString().trim();
    if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });

    const fields = [];
    const values = [];
    if (body?.nombre !== undefined) { fields.push('NOMBRE_SUCURSAL = ?'); values.push(body.nombre); }
    if (body?.direccion !== undefined) { fields.push('DIRECCION = ?'); values.push(body.direccion); }
    if (body?.telefono !== undefined) { fields.push('TELEFONO = ?'); values.push(body.telefono); }
    if (!fields.length) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

    values.push(id);
    await pool.query(`UPDATE SUCURSAL SET ${fields.join(', ')} WHERE ID_SUCURSAL = ?`, values);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/sucursales?id=ABC123
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });
    await pool.query('DELETE FROM SUCURSAL WHERE ID_SUCURSAL = ?', [id]);
    // Eliminar caja asociada si existe
    try { await pool.query('DELETE FROM CAJA WHERE ID_CAJA = ?', [id]); } catch { }
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
