import pool from '@/lib/db';

export async function GET(request) {
  try {
    const [rows] = await pool.query('SELECT * FROM UNIDADES_MEDIDAS ORDER BY NOMBRE');
    const data = rows.map((r) => ({ id: r.ID_UNIDAD, unidad: r.NOMBRE }));
    return Response.json(data, { status: 200 });
  } catch (err) {
    return Response.json({ error: 'Error al obtener unidades', details: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = body.nombre || body.name || body.unidad;
    if (!nombre) return Response.json({ error: 'Nombre requerido' }, { status: 400 });

    const [result] = await pool.query('INSERT INTO UNIDADES_MEDIDAS (NOMBRE) VALUES (?)', [nombre]);
    return Response.json({ message: 'Unidad creada', id: result.insertId }, { status: 201 });
  } catch (err) {
    // Manejar duplicados
    if (err && err.code === 'ER_DUP_ENTRY') {
      return Response.json({ error: 'Ya existe una unidad con ese nombre' }, { status: 409 });
    }
    return Response.json({ error: 'Error al crear unidad', details: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const id = body.id || body.ID_UNIDAD || body.id_unidad;
    const nombre = body.nombre || body.name || body.unidad;

    if (!id || !nombre) return Response.json({ error: 'Id y nombre requeridos' }, { status: 400 });

    await pool.query('UPDATE UNIDADES_MEDIDAS SET NOMBRE = ? WHERE ID_UNIDAD = ?', [nombre, id]);
    return Response.json({ message: 'Unidad actualizada' }, { status: 200 });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return Response.json({ error: 'Ya existe una unidad con ese nombre' }, { status: 409 });
    }
    return Response.json({ error: 'Error al actualizar unidad', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const id = body.id || body.ID_UNIDAD || body.id_unidad;
    if (!id) return Response.json({ error: 'Id requerido' }, { status: 400 });

    // Antes de borrar, podríamos verificar dependencias (productos). Por simplicidad, intentamos borrar y capturamos error por FK.
    await pool.query('DELETE FROM UNIDADES_MEDIDAS WHERE ID_UNIDAD = ?', [id]);
    return Response.json({ message: 'Unidad eliminada' }, { status: 200 });
  } catch (err) {
    // Si hay restricción referencial
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_' || err.errno === 1451)) {
      return Response.json({ error: 'No se puede eliminar la unidad porque está asociada a productos' }, { status: 409 });
    }
    return Response.json({ error: 'Error al eliminar unidad', details: err.message }, { status: 500 });
  }
}
