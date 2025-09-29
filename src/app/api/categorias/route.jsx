export async function PUT(request) {
  const body = await request.json();
  const { id, name, type } = body; // type: 'categoria' o 'subcategoria'
  if (!id || !name || !type) {
    return Response.json({ error: 'Datos requeridos' }, { status: 400 });
  }
  try {
    if (type === 'categoria') {
      await pool.query('UPDATE CATEGORIAS SET NOMBRE_CATEGORIAS = ? WHERE ID_CATEGORIAS = ?', [name, id]);
      return Response.json({ message: 'Categoría actualizada' }, { status: 200 });
    } else if (type === 'subcategoria') {
      await pool.query('UPDATE SUBCATEGORIAS SET NOMBRE_SUBCATEGORIA = ? WHERE ID_SUBCATEGORIAS = ?', [name, id]);
      return Response.json({ message: 'Subcategoría actualizada' }, { status: 200 });
    } else {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: 'Error al actualizar', details: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const body = await request.json();
  const { id, type } = body; // type: 'categoria' o 'subcategoria'
  if (!id || !type) {
    return Response.json({ error: 'Datos requeridos' }, { status: 400 });
  }
  try {
    if (type === 'categoria') {
      // Borra la categoría y sus subcategorías
      await pool.query('DELETE FROM SUBCATEGORIAS WHERE ID_CATEGORIAS = ?', [id]);
      await pool.query('DELETE FROM CATEGORIAS WHERE ID_CATEGORIAS = ?', [id]);
      return Response.json({ message: 'Categoría y subcategorías borradas' }, { status: 200 });
    } else if (type === 'subcategoria') {
      await pool.query('DELETE FROM SUBCATEGORIAS WHERE ID_SUBCATEGORIAS = ?', [id]);
      return Response.json({ message: 'Subcategoría borrada' }, { status: 200 });
    } else {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 });
    }
  } catch (err) {
    return Response.json({ error: 'Error al borrar', details: err.message }, { status: 500 });
  }
}

import pool from '@/lib/db';

export async function GET(request) {
  // Obtener categorías y subcategorías de la base de datos
  try {
    const [catRows] = await pool.query('SELECT * FROM CATEGORIAS');
    const [subcatRows] = await pool.query('SELECT * FROM SUBCATEGORIAS');
    // Relacionar subcategorías con categorías
    const categories = catRows.map(cat => ({
      id: cat.ID_CATEGORIAS,
      name: cat.NOMBRE_CATEGORIAS,
      subcategories: subcatRows
        .filter(sub => sub.ID_CATEGORIAS === cat.ID_CATEGORIAS)
        .map(sub => ({
          id: sub.ID_SUBCATEGORIAS,
          name: sub.NOMBRE_SUBCATEGORIA
        }))
    }));
    return Response.json(categories);
  } catch (err) {
    return Response.json({ error: 'Error al obtener categorías', details: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { name, parent } = body;
  if (!name) {
    return Response.json({ error: 'Nombre requerido' }, { status: 400 });
  }
  try {
    if (parent && parent !== 'Ninguna') {
      // Crear subcategoría
      const subId = Math.random().toString(36).substr(2, 10).toUpperCase().slice(0, 10);
      await pool.query('INSERT INTO SUBCATEGORIAS (ID_SUBCATEGORIAS, NOMBRE_SUBCATEGORIA, ID_CATEGORIAS) VALUES (?, ?, ?)', [subId, name, parent]);
      return Response.json({ message: 'Subcategoría agregada correctamente' }, { status: 201 });
    } else {
      // Crear categoría principal
      const newId = Math.random().toString(36).substr(2, 10).toUpperCase().slice(0, 10);
      await pool.query('INSERT INTO CATEGORIAS (ID_CATEGORIAS, NOMBRE_CATEGORIAS) VALUES (?, ?)', [newId, name]);
      return Response.json({ message: 'Categoría agregada correctamente' }, { status: 201 });
    }
  } catch (err) {
    return Response.json({ error: 'Error al agregar categoría', details: err.message }, { status: 500 });
  }
}