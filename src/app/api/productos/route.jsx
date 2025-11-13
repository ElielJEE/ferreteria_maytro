import pool from '@/lib/db';
import { extractId } from '@/app/api/_utils/normalize';

export async function PUT(request) {
	try {
		const body = await request.json();
	const { id, codigo, nombre, subcategoria, cantidad, precio_compra } = body;
		const conn = await pool.getConnection();
		try {
			await conn.beginTransaction();
				// Construir UPDATE dinámico solo con campos provistos para evitar sobrescribir con NULL
				const updateFields = [];
				const updateValues = [];

				if (typeof codigo !== 'undefined') {
					updateFields.push('CODIGO_PRODUCTO = ?');
					updateValues.push(codigo);
				}
				if (typeof nombre !== 'undefined') {
					updateFields.push('PRODUCT_NAME = ?');
					updateValues.push(nombre);
				}
				if (typeof cantidad !== 'undefined') {
					updateFields.push('CANTIDAD = ?');
					updateValues.push(Number(cantidad) || 0);
				}
				if (typeof subcategoria !== 'undefined') {
					updateFields.push('ID_SUBCATEGORIAS = ?');
					updateValues.push(subcategoria);
				}
				if (typeof precio_compra !== 'undefined') {
					updateFields.push('PRECIO_COMPRA = ?');
					updateValues.push(Number(precio_compra) || 0);
				}

				if (updateFields.length === 0) {
					// Nothing to update
					conn.release();
					return Response.json({ success: true });
				}

				updateValues.push(id);
				await conn.query(`UPDATE PRODUCTOS SET ${updateFields.join(', ')} WHERE ID_PRODUCT = ?`, updateValues);
			// actualizar unidades del producto (si vienen)
			if (Array.isArray(body.unidades)) {
				// eliminar las unidades existentes y volver a insertar las recibidas
				await conn.query('DELETE FROM producto_unidades WHERE PRODUCT_ID = ?', [id]);
				if (body.unidades.length > 0) {
					const values = body.unidades.map((u, idx) => [
						id,
						extractId(u.unidad),
						Number(u.precio_venta) || 0,
						Number(u.cantidad_unidad) || 1,
						u.es_por_defecto ? 1 : 0
					]);
					await conn.query('INSERT INTO producto_unidades (PRODUCT_ID, UNIDAD_ID, PRECIO, CANTIDAD_POR_UNIDAD, ES_POR_DEFECTO) VALUES ?', [values]);
				}
			}
			await conn.commit();
			conn.release();
		} catch (err) {
			try { await conn.rollback(); } catch (e) {}
			conn.release();
			throw err;
		}
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(request) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });
		const conn = await pool.getConnection();
		try {
			await conn.beginTransaction();

			// Helper: elimina en la tabla si alguna de las columnas candidatas existe
			const deleteFromIfColumn = async (table, candidates) => {
				const [cols] = await conn.query(
					`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
					[table]
				);
				if (!cols || !cols.length) return; // tabla no existe o no accesible
				const available = new Set(cols.map(r => String(r.COLUMN_NAME).toUpperCase()));
				for (const c of candidates) {
					if (available.has(c.toUpperCase())) {
						await conn.query(`DELETE FROM ${table} WHERE ${c} = ?`, [id]);
						break;
					}
				}
			};

			// Tablas relacionadas a borrar (orden: hijos -> padre)
			await deleteFromIfColumn('MOVIMIENTOS_INVENTARIO', ['producto_id', 'ID_PRODUCT']);
			await deleteFromIfColumn('STOCK_DANADOS', ['ID_PRODUCT', 'producto_id']);
			// Requerimiento: no tocar tabla NIVELACION
			await deleteFromIfColumn('STOCK_SUCURSAL', ['ID_PRODUCT', 'producto_id']);

			// Finalmente borrar el producto
			await conn.query('DELETE FROM PRODUCTOS WHERE ID_PRODUCT = ?', [id]);

			await conn.commit();
			conn.release();
			return Response.json({ success: true });
		} catch (err) {
			try { await conn.rollback(); } catch (e) {}
			try { conn.release(); } catch (e) {}
			return Response.json({ error: err.message }, { status: 500 });
		}
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const type = searchParams.get('type');

	if (type === 'subcategorias') {
		// Obtener subcategorías
		try {
			const [rows] = await pool.query('SELECT ID_SUBCATEGORIAS, NOMBRE_SUBCATEGORIA FROM SUBCATEGORIAS');
			return Response.json(rows);
		} catch (error) {
			return Response.json({ error: error.message }, { status: 500 });
		}
	}

	if (type === 'unidades') {
		const id = searchParams.get('id');
		if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });
		try {
			const [rows] = await pool.query(
				`SELECT pu.UNIDAD_ID, pu.PRECIO, pu.CANTIDAD_POR_UNIDAD, pu.ES_POR_DEFECTO, u.NOMBRE FROM producto_unidades pu LEFT JOIN unidades_medidas u ON pu.UNIDAD_ID = u.ID_UNIDAD WHERE pu.PRODUCT_ID = ?`,
				[id]
			);
			return Response.json(rows);
		} catch (error) {
			return Response.json({ error: error.message }, { status: 500 });
		}
	}

	// Obtener productos (PRECIO a nivel producto ya no se consulta)
	try {
		// Traer precio por defecto desde producto_unidades (si existe una fila con ES_POR_DEFECTO=1)
			const [rows] = await pool.query(`
			SELECT P.ID_PRODUCT, P.CODIGO_PRODUCTO, P.PRODUCT_NAME, P.CANTIDAD AS CANTIDAD,
			       S.ID_SUBCATEGORIAS, S.NOMBRE_SUBCATEGORIA,
			       pu.PRECIO AS PRECIO,
			       P.PRECIO_COMPRA
			FROM PRODUCTOS P
			LEFT JOIN SUBCATEGORIAS S ON P.ID_SUBCATEGORIAS = S.ID_SUBCATEGORIAS
			LEFT JOIN producto_unidades pu ON pu.PRODUCT_ID = P.ID_PRODUCT AND pu.ES_POR_DEFECTO = 1
		`);
		return Response.json(rows);
	} catch (error) {
		// If the productos table doesn't exist (fresh DB), return an empty array instead of 500
		const message = String(error?.message || error);
		if (message.includes("doesn't exist") || message.includes('ER_NO_SUCH_TABLE')) {
			console.warn('productos table not found, returning empty list instead of error:', message);
			return Response.json([]);
		}
		return Response.json({ error: error.message }, { status: 500 });
	}
}

export async function POST(request) {
	try {
	const body = await request.json();
				const { codigo, nombre, subcategoria, cantidad } = body;
			// Insertar producto (incluye CANTIDAD por compatibilidad con el esquema)
			// Normalizar subcategoria: puede llegar como objeto {value,label} desde el frontend
			const subcategoriaId = extractId(subcategoria);

				const vals = [
					codigo ?? null,
					nombre ?? null,
					Number(cantidad) || 0,
					subcategoriaId,
				];
				// seguridad: asegurar que el número de valores coincide con las columnas listadas
				if (vals.length !== 4) {
					console.error('Invalid params length for PRODUCTOS insert', vals);
					return Response.json({ error: 'Invalid params for insert' }, { status: 500 });
				}
			const conn = await pool.getConnection();
			try {
				await conn.beginTransaction();
				const [res] = await conn.query(
					'INSERT INTO PRODUCTOS (CODIGO_PRODUCTO, PRODUCT_NAME, CANTIDAD, ID_SUBCATEGORIAS) VALUES (?, ?, ?, ?)',
					vals
				);
				const insertId = res.insertId;
				// insertar unidades si vienen
				if (Array.isArray(body.unidades) && body.unidades.length > 0) {
					const values = body.unidades.map((u, idx) => [
						insertId,
						extractId(u.unidad),
						Number(u.precio_venta) || 0,
						Number(u.cantidad_unidad) || 1,
						u.es_por_defecto ? 1 : 0
					]);
					await conn.query('INSERT INTO producto_unidades (PRODUCT_ID, UNIDAD_ID, PRECIO, CANTIDAD_POR_UNIDAD, ES_POR_DEFECTO) VALUES ?', [values]);
				}
				await conn.commit();
				conn.release();
			} catch (errInsert) {
				try { await conn.rollback(); } catch(e) {}
				conn.release();
				console.error('Error inserting PRODUCTOS', { err: errInsert && errInsert.message, params: vals });
				throw errInsert;
			}
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: error.message }, { status: 500 });
	}
}
