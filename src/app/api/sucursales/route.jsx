import pool from '@/lib/db';

export async function GET(req) {
  // Endpoint: /api/sucursales
  try {
    const [rows] = await pool.query('SELECT ID_SUCURSAL, NOMBRE_SUCURSAL FROM SUCURSAL');
    // Return objects with label/value so frontend can use ids
    return Response.json({ sucursales: rows.map(r => ({ label: r.NOMBRE_SUCURSAL, value: r.ID_SUCURSAL })) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
