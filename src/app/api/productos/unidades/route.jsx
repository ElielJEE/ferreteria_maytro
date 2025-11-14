import pool from '@/lib/db';

export async function GET(req) {
  try {
    const id = req.nextUrl.searchParams.get('producto_id');
    if (!id) return Response.json({ error: 'producto_id requerido' }, { status: 400 });
    const [rows] = await pool.query(
      `SELECT pu.UNIDAD_ID AS id, um.NOMBRE AS nombre, pu.PRECIO AS precio, pu.CANTIDAD_POR_UNIDAD AS factor, pu.ES_POR_DEFECTO AS es_default
       FROM producto_unidades pu
       LEFT JOIN unidades_medidas um ON um.ID_UNIDAD = pu.UNIDAD_ID
       WHERE pu.PRODUCT_ID = ?
       ORDER BY pu.ES_POR_DEFECTO DESC, um.NOMBRE ASC`,
      [id]
    );
    const unidades = (rows || []).map(r => ({ id: r.id, nombre: r.nombre, precio: Number(r.precio || 0), factor: Number(r.factor || 1), es_default: !!r.es_default }));
    return Response.json({ unidades });
  } catch (e) {
    return Response.json({ error: e.message || 'Error al obtener unidades del producto' }, { status: 500 });
  }
}
