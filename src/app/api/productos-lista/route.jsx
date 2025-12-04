import pool from '@/lib/db';

export async function GET(req) {
  // Endpoint: /api/productos-lista?sucursal=...
  try {
    // Si quieres filtrar por sucursal, puedes usar el parámetro
    // const sucursal = req.nextUrl.searchParams.get('sucursal');
    const [rows] = await pool.query('SELECT ID_PRODUCT, PRODUCT_NAME FROM productos');
    return Response.json({ productos: rows.map(r => ({ label: r.PRODUCT_NAME, value: r.ID_PRODUCT })) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
